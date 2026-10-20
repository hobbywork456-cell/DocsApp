const Group = require('../models/Group');
const Document = require('../models/Document');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const Subscription = require('../models/Subscription');

// High-speed In-Memory Cache with TTL to reduce DB round-trips & eliminate delay
const userStatsCache = new Map();
const groupOwnerCache = new Map();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds TTL

/**
 * Invalidates the storage cache for a user or group when documents/subscriptions change.
 */
function invalidateStorageCache(userId = null, groupId = null) {
  if (userId) {
    userStatsCache.delete(userId.toString());
  } else {
    userStatsCache.clear();
  }

  if (groupId) {
    groupOwnerCache.delete(groupId.trim().toLowerCase());
  }
}

/**
 * Calculates storage size of a single document in bytes.
 */
function getDocumentSizeBytes(doc) {
  if (typeof doc.sizeBytes === 'number' && doc.sizeBytes > 0) {
    return doc.sizeBytes;
  }
  let bytes = 0;
  if (doc.title) {
    bytes += Buffer.byteLength(doc.title, 'utf8');
  }
  if (doc.content) {
    bytes += Buffer.byteLength(doc.content, 'utf8');
  }
  if (Array.isArray(doc.tags)) {
    bytes += Buffer.byteLength(JSON.stringify(doc.tags), 'utf8');
  }
  if (Array.isArray(doc.attachments)) {
    for (const att of doc.attachments) {
      if (att && typeof att.size === 'number') {
        bytes += att.size;
      }
    }
  }
  return bytes;
}

/**
 * Calculates storage consumption for a workspace owner (user).
 * All groups created by this user consume their storage quota.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {boolean} forceRefresh
 * @returns {Promise<Object>}
 */
async function getUserStorageStats(userId, forceRefresh = false) {
  if (!userId) throw new Error('User ID is required');
  const uidStr = userId.toString();

  const now = Date.now();
  if (!forceRefresh && userStatsCache.has(uidStr)) {
    const cached = userStatsCache.get(uidStr);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Run independent database queries in parallel for maximum speed
  const [settings, user, groups, activeSubscriptions] = await Promise.all([
    SystemSettings.getSettings(),
    User.findById(userId).lean(),
    Group.find({ createdBy: userId }).select('_id groupId name members').lean(),
    Subscription.find({ user: userId, status: 'active' }).lean()
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  const groupIds = groups.map(g => g.groupId);

  // Optimized documents query: only select size-relevant fields with .lean()
  let documents = [];
  if (groupIds.length > 0) {
    documents = await Document.find({ groupId: { $in: groupIds } })
      .select('groupId title tags attachments sizeBytes content')
      .lean();
  }

  // Compute group breakdown and total bytes
  const groupMap = {};
  for (const group of groups) {
    groupMap[group.groupId] = {
      _id: group._id,
      groupId: group.groupId,
      name: group.name,
      memberCount: (group.members || []).length,
      docCount: 0,
      usedBytes: 0,
      usedMB: 0
    };
  }

  let totalUsedBytes = 0;
  for (const doc of documents) {
    const docSize = getDocumentSizeBytes(doc);
    totalUsedBytes += docSize;

    if (groupMap[doc.groupId]) {
      groupMap[doc.groupId].docCount += 1;
      groupMap[doc.groupId].usedBytes += docSize;
    }
  }

  const groupsBreakdown = Object.values(groupMap).map(g => ({
    ...g,
    usedMB: parseFloat((g.usedBytes / (1024 * 1024)).toFixed(3))
  }));

  // Calculate Quota
  let bonusStorageMB = 0;
  for (const sub of activeSubscriptions) {
    bonusStorageMB += sub.bonusStorageMB || 0;
  }

  const freeStorageMB = settings.freeStorageMB || 50;
  let totalQuotaMB = freeStorageMB + bonusStorageMB;

  // Custom override by super admin if present
  if (typeof user.customStorageLimitMB === 'number' && user.customStorageLimitMB > 0) {
    totalQuotaMB = user.customStorageLimitMB;
  }

  const totalUsedMB = parseFloat((totalUsedBytes / (1024 * 1024)).toFixed(3));
  const remainingMB = Math.max(0, parseFloat((totalQuotaMB - totalUsedMB).toFixed(3)));
  const percentUsed = totalQuotaMB > 0 ? parseFloat(Math.min(100, (totalUsedMB / totalQuotaMB) * 100).toFixed(1)) : 100;

  const warningThreshold = settings.warningThresholdPercent || 80;
  const isWarning = percentUsed >= warningThreshold;
  const isExceeded = totalUsedMB >= totalQuotaMB;

  const stats = {
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    isSubscribed: user.isSubscribed || activeSubscriptions.length > 0,
    currentPlan: user.currentPlan || (activeSubscriptions.length > 0 ? activeSubscriptions[0].planName : 'Free'),
    freeStorageMB,
    bonusStorageMB,
    totalQuotaMB,
    totalUsedBytes,
    totalUsedMB,
    remainingMB,
    percentUsed,
    warningThreshold,
    isWarning,
    isExceeded,
    groupsCount: groups.length,
    documentsCount: documents.length,
    groupsBreakdown,
    activeSubscriptions
  };

  // Cache stats for immediate subsequent lookups
  userStatsCache.set(uidStr, { timestamp: now, data: stats });

  return stats;
}

/**
 * Checks storage status for a specific group by checking its creator.
 *
 * @param {string} groupId
 * @param {boolean} forceRefresh
 * @returns {Promise<Object>}
 */
async function getGroupStorageStats(groupId, forceRefresh = false) {
  if (!groupId) return null;
  const normalizedGroupId = groupId.trim().toLowerCase();

  let groupOwnerId = groupOwnerCache.get(normalizedGroupId)?.ownerId;
  let groupName = groupOwnerCache.get(normalizedGroupId)?.name;

  if (!groupOwnerId || forceRefresh) {
    const group = await Group.findOne({ groupId: normalizedGroupId }).select('createdBy name').lean();
    if (!group) return null;
    groupOwnerId = group.createdBy;
    groupName = group.name;
    groupOwnerCache.set(normalizedGroupId, { ownerId: groupOwnerId, name: groupName });
  }

  const stats = await getUserStorageStats(groupOwnerId, forceRefresh);
  return {
    ...stats,
    currentGroupId: normalizedGroupId,
    currentGroupName: groupName,
    groupOwnerId: groupOwnerId
  };
}

module.exports = {
  getDocumentSizeBytes,
  getUserStorageStats,
  getGroupStorageStats,
  invalidateStorageCache
};
