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
const { decorateSubscription, publicTariff } = require('../utils/subscriptionView');

/// ── Razorpay client setup ─────────────────────────────────────────────────
// Keys come from backend/.env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
// (rzp_test_… keys open the real checkout in Razorpay test mode; rzp_live_… keys take real payments)
const RAZORPAY_KEY_ID         = (process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET     = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

const isLiveRazorpayKey = Boolean(
  /^rzp_(test|live)_/.test(RAZORPAY_KEY_ID) &&
  RAZORPAY_KEY_SECRET &&
  !/placeholder|YOUR_RAZORPAY/i.test(RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET)
);
const razorpayMode = RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'live' : 'test';

let razorpayClient = null;
if (isLiveRazorpayKey) {
  try {
    razorpayClient = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    console.log(`[Razorpay] ✓ Client initialized (${razorpayMode} mode).`);
  } catch (err) {
    console.warn('[Razorpay] ⚠ Client init warning:', err.message);
  }
} else {
  console.log('[Razorpay] ⚠ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing or invalid in .env — checkout disabled.');
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * Records a paid order as an active storage subscription. Idempotent on the payment id,
 * so the checkout callback and the webhook can both call it safely.
 */
const activateSubscription = async ({ userId, planId, orderId, paymentId, signature, amountPaise }) => {
  const existing = await Subscription.findOne({ transactionId: paymentId });
  if (existing) return { subscription: existing, alreadyRecorded: true };

  const settings = await SystemSettings.getSettings();
  const tier = (settings.tiers || []).find((t) => t.id === planId);
  if (!tier) throw new Error(`Unknown plan "${planId}" on paid order ${orderId}`);

  const subscription = new Subscription({
    user: userId,
    planId: tier.id,
    planName: tier.name,
    bonusStorageMB: tier.storageMB,
    price: amountPaise ? amountPaise / 100 : tier.price,
    currency: settings.currencySymbol || '₹',
    status: 'active',
    paymentMethod: 'Razorpay',
    transactionId: paymentId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature || 'webhook',
    purchaseType: 'subscription',
    startDate: new Date(),
    // monthly → 30 days, yearly → 365 days, one-time → never expires
    expiresAt: tier.period === 'lifetime' || tier.period === 'one-time'
      ? null
      : new Date(Date.now() + (tier.period === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
  });
  try {
    await subscription.save();
  } catch (err) {
    // Webhook and checkout callback raced: the other one already saved it
    if (err.code === 11000) return { subscription: await Subscription.findOne({ transactionId: paymentId }), alreadyRecorded: true };
    throw err;
  }

  await User.findByIdAndUpdate(userId, { isSubscribed: true, currentPlan: tier.name });
  invalidateStorageCache(userId);
  return { subscription, tier, alreadyRecorded: false };
};

// ── 1. Public tariff & pricing (landing page, subscription window, profile) ──
router.get('/tariff', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(publicTariff(settings));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tariff details', error: error.message });
  }
});

// ── 1b. Everything the signed-in user's subscription screens need, in one call ──
router.get('/summary', auth, async (req, res) => {
  try {
    const [settings, stats, history] = await Promise.all([
      SystemSettings.getSettings(),
      getUserStorageStats(req.user.userId, req.query.refresh === '1'),
      Subscription.find({ user: req.user.userId }).sort({ createdAt: -1 }).lean()
    ]);
    const decoratedHistory = history.map((h) => decorateSubscription(h));
    const totalPaid = decoratedHistory.reduce((sum, h) => sum + (Number(h.price) || 0), 0);
    res.json({
      tariff: publicTariff(settings),
      stats,
      activePlans: stats.activeSubscriptions || [],
      history: decoratedHistory,
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      paymentsEnabled: Boolean(razorpayClient)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading subscription details', error: error.message });
  }
});

// ── 2. Razorpay public config (only the public key id is ever sent to the browser) ──
router.get('/razorpay-config', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      keyId: razorpayClient ? RAZORPAY_KEY_ID : '',
      isLive: Boolean(razorpayClient),
      mode: razorpayClient ? razorpayMode : null,
      currency: settings.currency || 'INR',
      currencySymbol: settings.currencySymbol || '₹'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading payment configuration', error: error.message });
  }
});

// ── 3. User's personal storage usage ─────────────────────────────────────
router.get('/usage', auth, async (req, res) => {
  try {
    const stats = await getUserStorageStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating storage usage', error: error.message });
  }
});

// ── 4. Group storage usage ────────────────────────────────────────────────
router.get('/group-usage/:groupId', auth, async (req, res) => {
  try {
    const stats = await getGroupStorageStats(req.params.groupId);
    if (!stats) return res.status(404).json({ message: 'Group not found' });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error checking group storage quota', error: error.message });
  }
});

// ── 5. Create Razorpay Order ──────────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  try {
    if (!razorpayClient) {
      return res.status(503).json({ message: 'Online payments are not configured on the server. Please contact the administrator.' });
    }
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ message: 'Plan ID is required' });

    const settings = await SystemSettings.getSettings();
    const tier = (settings.tiers || []).find((t) => t.id === planId);
    if (!tier) return res.status(400).json({ message: 'Invalid subscription tier selected' });
    if (!(Number(tier.storageMB) > 0)) return res.status(400).json({ message: 'This plan has no storage configured. Please contact the administrator.' });

    const amountInPaise = Math.round(Number(tier.price) * 100);
    if (!(amountInPaise >= 100)) return res.status(400).json({ message: 'Plan price must be at least ₹1.' });

    // Price and plan are fixed here on the server and stored on the order — the client cannot change them
    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: settings.currency || 'INR',
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notes: {
        userId: req.user.userId.toString(),
        planId: tier.id,
        planName: tier.name,
        storageMB: String(tier.storageMB)
      }
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      planId: tier.id,
      planName: tier.name,
      storageMB: tier.storageMB,
      price: tier.price,
      mode: razorpayMode,
      isLive: true
    });
  } catch (error) {
    const reason = error?.error?.description || error.message;
    console.error('[Razorpay] Order creation error:', reason);
    const authFailed = error?.statusCode === 401;
    res.status(authFailed ? 502 : 500).json({
      message: authFailed
        ? 'Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.'
        : 'Could not start the payment. Please try again.',
      error: reason
    });
  }
});

// ── 6. Verify Payment & Activate Storage ─────────────────────────────────
router.post('/verify-payment', auth, async (req, res) => {
  try {
    if (!razorpayClient) {
      return res.status(503).json({ message: 'Online payments are not configured on the server.' });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment details.' });
    }

    // 1. Signature proves this payment id really belongs to this order (signed with our secret)
    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (!safeEqual(expected, razorpay_signature)) {
      return res.status(400).json({ message: 'Payment signature verification failed. Transaction rejected for security.' });
    }

    // 2. Plan and buyer come from the order we created, never from the request body
    const order = await razorpayClient.orders.fetch(razorpay_order_id);
    if (order?.notes?.userId !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'This payment belongs to a different account.' });
    }

    const { subscription, tier, alreadyRecorded } = await activateSubscription({
      userId: req.user.userId,
      planId: order.notes.planId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amountPaise: order.amount
    });

    const stats = await getUserStorageStats(req.user.userId, true);
    res.status(200).json({
      success: true,
      message: alreadyRecorded
        ? 'Payment already recorded — storage is active.'
        : `Payment verified! ✓ ${tier.name} activated — +${tier.storageMB} MB added to your workspace.`,
      subscription: decorateSubscription(subscription),
      stats
    });
  } catch (error) {
    console.error('[Verify Payment]', error?.error?.description || error.message);
    res.status(500).json({ message: 'Payment received but activation failed. Please use "Sync" or contact support.', error: error.message });
  }
});

// ── 6b. Razorpay webhook (backup activation if the browser closes after paying) ──
// Configure in Razorpay Dashboard → Webhooks: URL <your-api>/api/subscription/webhook, event "order.paid",
// secret = RAZORPAY_WEBHOOK_SECRET.
router.post('/webhook', async (req, res) => {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET || !req.rawBody) return res.status(400).json({ message: 'Webhook not configured' });
    const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(req.rawBody).digest('hex');
    if (!safeEqual(expected, req.header('x-razorpay-signature'))) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    if (req.body.event === 'order.paid') {
      const order = req.body.payload?.order?.entity;
      const payment = req.body.payload?.payment?.entity;
      if (order?.notes?.userId && order?.notes?.planId && payment?.id) {
        await activateSubscription({
          userId: order.notes.userId,
          planId: order.notes.planId,
          orderId: order.id,
          paymentId: payment.id,
          amountPaise: order.amount_paid || order.amount
        });
      }
    }
    // Always acknowledge so Razorpay does not keep retrying handled/irrelevant events
    res.json({ received: true });
  } catch (error) {
    console.error('[Razorpay Webhook]', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// ── 7. Download Invoice (HTML → printable PDF) ───────────────────────────
router.get('/invoice/:subscriptionId', auth, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.subscriptionId)
      .populate('user', 'email firstName lastName');

    if (!sub) return res.status(404).json({ message: 'Invoice not found' });

    // Security: only the owner or a superadmin can download the invoice
    if (
      sub.user._id.toString() !== req.user.userId.toString() &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const invoiceDate = new Date(sub.createdAt || sub.startDate).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const expiryDate = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';
    const userName = `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || sub.user.email;
    const currency = sub.currency || '₹';
    const invoiceNo = `INV-${sub.transactionId?.slice(-10).toUpperCase() || sub._id.toString().slice(-8).toUpperCase()}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNo} — DocsApp</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #0f172a; }
    .page { max-width: 750px; margin: 0 auto; padding: 48px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 44px; height: 44px; background: linear-gradient(135deg,#687f6e,#326127); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px; }
    .brand-name { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 26px; font-weight: 900; color: #687f6e; letter-spacing: -0.5px; }
    .invoice-no { font-size: 13px; color: #64748b; margin-top: 4px; font-family: monospace; }
    .invoice-date { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .divider { border: none; border-top: 2px solid #e2e8f0; margin: 24px 0; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .party-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .party-name { font-size: 15px; font-weight: 700; color: #0f172a; }
    .party-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #f8fafc; }
    th { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    td.bold { font-weight: 700; color: #0f172a; }
    td.mono { font-family: monospace; font-size: 12px; color: #687f6e; }
    .total-row { display: flex; justify-content: flex-end; margin-top: 8px; }
    .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 24px; text-align: right; min-width: 220px; }
    .total-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .total-amount { font-size: 26px; font-weight: 900; color: #687f6e; }
    .status-badge { display: inline-block; background: #ecfdf5; color: #15803d; border: 1px solid #86efac; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { font-size: 11px; color: #94a3b8; line-height: 1.6; }
    .payment-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; }
    .payment-info-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .payment-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
    .payment-row span:first-child { color: #64748b; }
    .payment-row span:last-child { font-weight: 600; color: #0f172a; font-family: monospace; }
    @media print {
      body { background: #fff; }
      .page { padding: 32px 28px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">DS</div>
        <div>
          <div class="brand-name">DocsApp</div>
          <div class="brand-sub">Cloud Documentation Platform</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-no">${invoiceNo}</div>
        <div class="invoice-date">Date: ${invoiceDate}</div>
      </div>
    </div>

    <hr class="divider" />

    <div class="parties">
      <div>
        <div class="party-label">Billed By</div>
        <div class="party-name">DocsApp Platform</div>
        <div class="party-sub">Cloud Storage &amp; Workspace Services</div>
        <div class="party-sub" style="margin-top:6px;color:#687f6e;font-weight:600;">support@docsapp.app</div>
      </div>
      <div>
        <div class="party-label">Billed To</div>
        <div class="party-name">${userName}</div>
        <div class="party-sub">${sub.user.email}</div>
        <div class="party-sub" style="margin-top:6px;">DocsApp User Account</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Storage</th>
          <th>Valid Until</th>
          <th>Status</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="bold">1</td>
          <td class="bold">${sub.planName}</td>
          <td>+${sub.bonusStorageMB} MB</td>
          <td>${expiryDate}</td>
          <td><span class="status-badge">${sub.status || 'active'}</span></td>
          <td style="text-align:right;font-weight:800;font-size:15px;color:#0f172a;">${currency}${sub.price.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-row">
      <div class="total-box">
        <div class="total-label">Total Amount Paid</div>
        <div class="total-amount">${currency}${sub.price.toFixed(2)}</div>
      </div>
    </div>

    <div class="payment-info" style="margin-top:20px;">
      <div class="payment-info-title">Payment Details</div>
      <div class="payment-row"><span>Payment Method</span><span>${sub.paymentMethod || 'Razorpay'}</span></div>
      <div class="payment-row"><span>Transaction ID</span><span>${sub.transactionId}</span></div>
      ${sub.razorpayOrderId ? `<div class="payment-row"><span>Razorpay Order ID</span><span>${sub.razorpayOrderId}</span></div>` : ''}
      <div class="payment-row"><span>Payment Date</span><span>${invoiceDate}</span></div>
      <div class="payment-row"><span>Plan Activation</span><span>${invoiceDate}</span></div>
      <div class="payment-row"><span>Storage Validity</span><span>${expiryDate}</span></div>
    </div>

    <div class="footer">
      <p>Thank you for choosing DocsApp! This is a computer-generated invoice and does not require a signature.</p>
      <p style="margin-top:6px;">For support, contact <strong>support@docsapp.app</strong> | Invoice ${invoiceNo}</p>
    </div>
  </div>

  <script>
    // Auto-print dialog when opened standalone
    if (window.location.search.includes('print=1')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoiceNo}.html"`);
    res.send(html);
  } catch (error) {
    console.error('[Invoice]', error);
    res.status(500).json({ message: 'Error generating invoice', error: error.message });
  }
});

// ── 8. Subscription history ───────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const history = await Subscription.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(history.map((h) => decorateSubscription(h)));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving subscription history', error: error.message });
  }
});

module.exports = router;
