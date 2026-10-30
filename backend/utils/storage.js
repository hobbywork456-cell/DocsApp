const Group = require('../models/Group');
const Document = require('../models/Document');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const Subscription = require('../models/Subscription');
const { decorateSubscription } = require('./subscriptionView');

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
 * Size of a document computed inside MongoDB, so document content never has to be
 * loaded into server memory (base64 images can make documents several MB each).
 * Uses the stored sizeBytes; falls back to the text length for old documents.
 */
const strBytes = (field) => ({
  $cond: [{ $eq: [{ $type: field }, 'string'] }, { $strLenBytes: field }, 0]
});
const DOC_BYTES_EXPR = {
  $cond: [
    { $gt: [{ $ifNull: ['$sizeBytes', 0] }, 0] },
    '$sizeBytes',
    {
      $add: [
        strBytes('$title'),
        strBytes('$content'),
        { $sum: { $map: { input: { $ifNull: ['$attachments', []] }, as: 'a', in: { $ifNull: ['$$a.size', 0] } } } }
      ]
    }
  ]
};

/**
 * Sums document sizes per group without reading document content into Node.
 * @param {Object} match MongoDB filter for documents
 * @returns {Promise<Object>} { [groupId]: { bytes, count } }
 */
async function sumDocumentBytesByGroup(match = {}) {
  const rows = await Document.aggregate([
    { $match: match },
    { $group: { _id: '$groupId', bytes: { $sum: DOC_BYTES_EXPR }, count: { $sum: 1 } } }
  ]);
  const out = {};
  for (const r of rows) out[r._id] = { bytes: r.bytes || 0, count: r.count || 0 };
  return out;
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
    // Expired monthly packs no longer add storage
    Subscription.find({ user: userId, status: 'active', razorpayPaymentId: { $exists: true, $ne: null }, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).lean()
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  const groupIds = groups.map(g => g.groupId);

  // Sizes are summed inside MongoDB — document content is never loaded here
  const perGroup = groupIds.length > 0
    ? await sumDocumentBytesByGroup({ groupId: { $in: groupIds } })
    : {};

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
  let documentsCount = 0;
  for (const [gid, agg] of Object.entries(perGroup)) {
    totalUsedBytes += agg.bytes;
    documentsCount += agg.count;
    if (groupMap[gid]) {
      groupMap[gid].docCount = agg.count;
      groupMap[gid].usedBytes = agg.bytes;
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

  const freeStorageMB = settings.freeStorageMB || 25;
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

  const decoratedActive = activeSubscriptions.map((sub) => decorateSubscription(sub, now));
  // When the paid storage runs out: the latest expiry among active plans (null = no paid plan / never expires)
  const expiringPlans = decoratedActive.filter((s) => s.expiresAt);
  const planExpiresAt = expiringPlans.length
    ? new Date(Math.max(...expiringPlans.map((s) => new Date(s.expiresAt).getTime())))
    : null;

  const stats = {
    userId: user._id,
    userEmail: user.email,
    userName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    joinedAt: user.createdAt,
    role: user.role,
    // Only a paid, still-valid subscription counts — an expired pack falls back to the free plan
    isSubscribed: activeSubscriptions.length > 0,
    currentPlan: activeSubscriptions.length > 0
      ? activeSubscriptions.map((s) => s.planName).join(' + ')
      : 'Free',
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
    documentsCount,
    groupsBreakdown,
    activeSubscriptions: decoratedActive,
    planExpiresAt,
    hasCustomQuota: typeof user.customStorageLimitMB === 'number' && user.customStorageLimitMB > 0
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
  sumDocumentBytesByGroup,
  getUserStorageStats,
  getGroupStorageStats,
  invalidateStorageCache
};
