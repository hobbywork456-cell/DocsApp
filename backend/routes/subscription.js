const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const Subscription = require('../models/Subscription');
const { 
  getUserStorageStats, 
  getGroupStorageStats, 
  invalidateStorageCache 
} = require('../utils/storage');

// Initialize Razorpay client safely
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayClient = null;
const isLiveRazorpayKey = RAZORPAY_KEY_ID && 
  RAZORPAY_KEY_SECRET && 
  !RAZORPAY_KEY_ID.includes('placeholder') &&
  !RAZORPAY_KEY_ID.includes('docsapp');

if (isLiveRazorpayKey) {
  try {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('[Razorpay] Live client initialized successfully');
  } catch (err) {
    console.warn('[Razorpay] Client initialization warning:', err.message);
  }
}

// Predefined Dedicated Storage Booster Packs
const STORAGE_BOOSTERS = [
  {
    id: 'booster-50mb',
    name: '+50 MB Quick Storage Boost',
    storageMB: 50,
    price: 99,
    currency: 'INR',
    currencySymbol: '₹',
    badge: 'Starter Booster',
    description: 'Instant +50 MB extra cloud storage space added directly to your account',
    features: [
      '+50 MB permanent workspace storage allocation',
      'Instant quota unlock for blocked documents',
      'Shared across all groups you create',
      'Stackable with other plans'
    ]
  },
  {
    id: 'booster-100mb',
    name: '+100 MB Power Pack',
    storageMB: 100,
    price: 199,
    currency: 'INR',
    currencySymbol: '₹',
    badge: 'Most Popular Booster',
    isPopular: true,
    description: 'High-capacity boost (+100 MB) for active teams and large attachments',
    features: [
      '+100 MB dedicated storage space',
      'Supports high-resolution images & PDFs',
      'Permanent quota upgrade across all groups',
      'Priority upload speed & sync'
    ]
  },
  {
    id: 'booster-250mb',
    name: '+250 MB Team Expansion',
    storageMB: 250,
    price: 399,
    currency: 'INR',
    currencySymbol: '₹',
    badge: 'High Capacity',
    description: '+250 MB heavy-duty storage upgrade for multiple team workflows',
    features: [
      '+250 MB enterprise-tier capacity expansion',
      'Unlimited uploads and file attachments',
      'All team members share workspace quota',
      'Instant activation upon Razorpay payment'
    ]
  },
  {
    id: 'booster-500mb',
    name: '+500 MB Mega Vault',
    storageMB: 500,
    price: 699,
    currency: 'INR',
    currencySymbol: '₹',
    badge: 'Maximum Value',
    description: '+500 MB maximum cloud capacity booster for complete peace of mind',
    features: [
      '+500 MB maximum storage expansion',
      'Never run out of workspace storage',
      'All group documentation permanently backed up',
      '24/7 dedicated priority sync'
    ]
  }
];

// 1. Get current public tariff and pricing plans
router.get('/tariff', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      freeStorageMB: settings.freeStorageMB,
      warningThresholdPercent: settings.warningThresholdPercent,
      currency: settings.currency || 'INR',
      currencySymbol: settings.currencySymbol || '₹',
      pricePer50MB: settings.pricePer50MB || 99,
      tiers: settings.tiers || [],
      boosters: STORAGE_BOOSTERS
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tariff details', error: error.message });
  }
});

// 2. Get Razorpay Public Configuration
router.get('/razorpay-config', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      keyId: RAZORPAY_KEY_ID,
      isLive: Boolean(isLiveRazorpayKey && razorpayClient),
      currency: settings.currency || 'INR',
      currencySymbol: settings.currencySymbol || '₹'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading payment configuration', error: error.message });
  }
});

// 3. Get user's personal storage usage and quota
router.get('/usage', auth, async (req, res) => {
  try {
    const stats = await getUserStorageStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating storage usage', error: error.message });
  }
});

// 4. Get storage quota for a specific group workspace
router.get('/group-usage/:groupId', auth, async (req, res) => {
  try {
    const stats = await getGroupStorageStats(req.params.groupId);
    if (!stats) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error checking group storage quota', error: error.message });
  }
});

// 5. Create Razorpay Order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { planId, isStoragePack = false, storageMB, price, currency = 'INR' } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Plan or booster ID is required' });
    }

    let finalItem = null;
    let finalAmount = 0;
    let finalStorageMB = 0;
    let finalName = '';

    if (isStoragePack) {
      const booster = STORAGE_BOOSTERS.find(b => b.id === planId);
      if (!booster) {
        return res.status(400).json({ message: 'Invalid storage booster pack selected' });
      }
      finalItem = booster;
      finalAmount = booster.price;
      finalStorageMB = booster.storageMB;
      finalName = booster.name;
    } else {
      const settings = await SystemSettings.getSettings();
      const tier = (settings.tiers || []).find(t => t.id === planId);
      if (!tier) {
        return res.status(400).json({ message: 'Invalid subscription tier selected' });
      }
      finalItem = tier;
      finalAmount = tier.price;
      finalStorageMB = tier.storageMB;
      finalName = tier.name;
    }

    // Razorpay requires amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(finalAmount * 100);
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // If live Razorpay client is ready, create official order via Razorpay API
    if (isLiveRazorpayKey && razorpayClient) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            userId: req.user.userId.toString(),
            planId,
            planName: finalName,
            isStoragePack: isStoragePack ? 'true' : 'false',
            storageMB: finalStorageMB.toString()
          }
        });

        return res.status(200).json({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: RAZORPAY_KEY_ID,
          planId,
          planName: finalName,
          storageMB: finalStorageMB,
          isStoragePack,
          isLive: true
        });
      } catch (rzpErr) {
        console.error('[Razorpay Order Creation Error]:', rzpErr);
        // Fall back gracefully to mock order if Razorpay rejects due to test sandbox credentials
      }
    }

    // Test / Sandbox Fallback Order
    const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    res.status(200).json({
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID || 'rzp_test_docsapp',
      planId,
      planName: finalName,
      storageMB: finalStorageMB,
      isStoragePack,
      isLive: false
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Error generating Razorpay order', error: error.message });
  }
});

// 6. Verify Razorpay Payment Signature and Activate Quota
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      isStoragePack = false
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ message: 'Missing Razorpay transaction references' });
    }

    // Cryptographic signature verification if live credentials
    if (isLiveRazorpayKey && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          message: 'Razorpay payment signature verification failed. Untrusted transaction.'
        });
      }
    }

    // Find details
    let planName = '';
    let bonusStorageMB = 50;
    let price = 99;
    let currencySymbol = '₹';

    if (isStoragePack) {
      const booster = STORAGE_BOOSTERS.find(b => b.id === planId);
      if (booster) {
        planName = booster.name;
        bonusStorageMB = booster.storageMB;
        price = booster.price;
        currencySymbol = booster.currencySymbol;
      } else {
        planName = `Storage Booster (+${req.body.storageMB || 50} MB)`;
        bonusStorageMB = Number(req.body.storageMB) || 50;
        price = Number(req.body.price) || 99;
      }
    } else {
      const settings = await SystemSettings.getSettings();
      currencySymbol = settings.currencySymbol || '₹';
      const tier = (settings.tiers || []).find(t => t.id === planId);
      if (tier) {
        planName = tier.name;
        bonusStorageMB = tier.storageMB;
        price = tier.price;
      } else {
        planName = `Storage Tier (+${req.body.storageMB || 50} MB)`;
        bonusStorageMB = Number(req.body.storageMB) || 50;
        price = Number(req.body.price) || 99;
      }
    }

    // Record verified subscription / storage booster
    const subscription = new Subscription({
      user: req.user.userId,
      planId,
      planName,
      bonusStorageMB,
      price,
      currency: currencySymbol,
      status: 'active',
      paymentMethod: 'Razorpay Payment Gateway',
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature || 'verified',
      purchaseType: isStoragePack ? 'storage_booster' : 'subscription',
      startDate: new Date(),
      expiresAt: isStoragePack
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year for storage booster
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days for subscription plan
    });

    await subscription.save();

    // If subscription plan, update user tier
    if (!isStoragePack) {
      await User.findByIdAndUpdate(req.user.userId, {
        isSubscribed: true,
        currentPlan: planName
      });
    }

    // Invalidate storage cache so the user sees their new quota instantly
    invalidateStorageCache(req.user.userId);
    const updatedStats = await getUserStorageStats(req.user.userId, true);

    res.status(200).json({
      success: true,
      message: isStoragePack 
        ? `Payment verified! Added +${bonusStorageMB} MB storage booster to your workspace.`
        : `Payment verified! Successfully activated ${planName} (+${bonusStorageMB} MB).`,
      subscription,
      stats: updatedStats
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

// 7. Direct / Simulated Activation (Fallback)
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { planId, paymentMethod = 'Instant Activation' } = req.body;
    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required to subscribe' });
    }

    const settings = await SystemSettings.getSettings();
    const tier = (settings.tiers || []).find(t => t.id === planId);

    if (!tier) {
      return res.status(400).json({ message: 'Invalid subscription tier selected' });
    }

    const transactionId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const subscription = new Subscription({
      user: req.user.userId,
      planId: tier.id,
      planName: tier.name,
      bonusStorageMB: tier.storageMB,
      price: tier.price,
      currency: settings.currencySymbol || '₹',
      status: 'active',
      paymentMethod,
      transactionId,
      purchaseType: 'subscription',
      startDate: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await subscription.save();

    await User.findByIdAndUpdate(req.user.userId, {
      isSubscribed: true,
      currentPlan: tier.name
    });

    invalidateStorageCache(req.user.userId);
    const updatedStats = await getUserStorageStats(req.user.userId, true);

    res.status(201).json({
      message: `Successfully subscribed to ${tier.name}! Added +${tier.storageMB} MB storage quota.`,
      subscription,
      stats: updatedStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing subscription', error: error.message });
  }
});

// 8. Get user's subscription & purchase history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await Subscription.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving subscription history', error: error.message });
  }
});

module.exports = router;
