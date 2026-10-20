const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');
const User = require('../models/User');
const Group = require('../models/Group');
const Document = require('../models/Document');
const SystemSettings = require('../models/SystemSettings');
const Subscription = require('../models/Subscription');
const { getUserStorageStats, getDocumentSizeBytes } = require('../utils/storage');

// Apply auth and superadmin middleware to all routes in this router
router.use(auth, superadmin);

// 1. Dashboard summary stats
router.get('/stats', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const [totalUsers, totalGroups, totalDocs, subscriptions] = await Promise.all([
      User.find({}),
      Group.find({}).populate('createdBy', 'email'),
      Document.find({}),
      Subscription.find({ status: 'active' })
    ]);

    // Calculate total application storage used
    let totalApplicationBytes = 0;
    for (const doc of totalDocs) {
      totalApplicationBytes += getDocumentSizeBytes(doc);
    }
    const totalApplicationMB = parseFloat((totalApplicationBytes / (1024 * 1024)).toFixed(3));

    // Calculate revenue
    const allSubscriptions = await Subscription.find({});
    const totalRevenue = allSubscriptions.reduce((sum, s) => sum + (s.price || 0), 0);

    // Active subscribers set
    const subscribedUserIds = new Set(subscriptions.map(s => s.user.toString()));
    const subscribedCount = totalUsers.filter(u => u.isSubscribed || subscribedUserIds.has(u._id.toString())).length;
    const freeUsersCount = totalUsers.length - subscribedCount;

    res.json({
      totalUsers: totalUsers.length,
      freeUsersCount,
      subscribedCount,
      totalGroups: totalGroups.length,
      totalDocuments: totalDocs.length,
      totalApplicationBytes,
      totalApplicationMB,
      totalSubscriptions: allSubscriptions.length,
      activeSubscriptions: subscriptions.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      settings: {
        freeStorageMB: settings.freeStorageMB,
        warningThresholdPercent: settings.warningThresholdPercent,
        currencySymbol: settings.currencySymbol,
        pricePer50MB: settings.pricePer50MB
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving super admin stats', error: error.message });
  }
});

// 2. All users with individual storage consumption and subscription status
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    const userStatsList = await Promise.all(
      users.map(async (u) => {
        try {
          const stats = await getUserStorageStats(u._id);
          return stats;
        } catch (err) {
          return {
            userId: u._id,
            userEmail: u.email,
            role: u.role,
            isSubscribed: false,
            currentPlan: 'Free',
            totalQuotaMB: 50,
            totalUsedMB: 0,
            percentUsed: 0,
            isExceeded: false,
            groupsCount: 0,
            documentsCount: 0
          };
        }
      })
    );

    res.json(userStatsList);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users list', error: error.message });
  }
});

// 3. Update user role (promote to superadmin or demote to user)
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user or superadmin.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { returnDocument: 'after' }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `User role updated to ${role}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
});

// 4. Update user custom storage quota override
router.put('/users/:userId/quota', async (req, res) => {
  try {
    const { customStorageLimitMB } = req.body;
    const limit = customStorageLimitMB === null || customStorageLimitMB === '' ? null : Number(customStorageLimitMB);

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { customStorageLimitMB: limit },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedStats = await getUserStorageStats(user._id);
    res.json({ message: 'Storage quota override updated successfully', stats: updatedStats });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user quota', error: error.message });
  }
});

// 5. All workspace groups overview
router.get('/groups', async (req, res) => {
  try {
    const groups = await Group.find({})
      .populate('createdBy', 'email firstName lastName')
      .populate('members', 'email')
      .sort({ createdAt: -1 });

    const groupsWithStorage = await Promise.all(
      groups.map(async (group) => {
        const docs = await Document.find({ groupId: group.groupId });
        let bytes = 0;
        for (const doc of docs) {
          bytes += getDocumentSizeBytes(doc);
        }
        return {
          _id: group._id,
          groupId: group.groupId,
          name: group.name,
          createdBy: group.createdBy,
          memberCount: (group.members || []).length,
          docCount: docs.length,
          storageUsedMB: parseFloat((bytes / (1024 * 1024)).toFixed(3)),
          createdAt: group.createdAt
        };
      })
    );

    res.json(groupsWithStorage);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
});

// 6. Get current system tariff & settings
router.get('/tariff', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tariff settings', error: error.message });
  }
});

// 7. Update system tariff / pricing ("Traffic/Tariff-Based" settings)
router.put('/tariff', async (req, res) => {
  try {
    const {
      freeStorageMB,
      warningThresholdPercent,
      currency,
      currencySymbol,
      pricePer50MB,
      activeTheme,
      tiers
    } = req.body;

    let settings = await SystemSettings.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await SystemSettings.getSettings();
    }

    if (freeStorageMB !== undefined) settings.freeStorageMB = Number(freeStorageMB);
    if (warningThresholdPercent !== undefined) settings.warningThresholdPercent = Number(warningThresholdPercent);
    if (currency !== undefined) settings.currency = currency;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
    if (pricePer50MB !== undefined) settings.pricePer50MB = Number(pricePer50MB);
    if (activeTheme !== undefined) settings.activeTheme = activeTheme;
    if (Array.isArray(tiers)) settings.tiers = tiers;

    settings.updatedBy = req.user.userId;
    settings.updatedAt = new Date();

    await settings.save();

    res.json({
      message: 'Tariff and storage settings updated successfully! New rates are now active for all application users.',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating tariff settings', error: error.message });
  }
});

// 8. View all subscription transactions
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .populate('user', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions', error: error.message });
  }
});

module.exports = router;
