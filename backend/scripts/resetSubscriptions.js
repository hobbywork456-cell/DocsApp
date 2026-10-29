/**
 * One-time subscription reset.
 *
 * - Deletes every previous subscription / storage-booster record (old and demo data)
 * - Puts every user (new and existing) back on the free plan with 25 MB storage
 * - Clears per-user storage overrides
 *
 * From then on storage only grows when a Razorpay payment is verified
 * (routes/subscription.js → activateSubscription).
 *
 * Runs automatically once on server start (guarded by SystemSettings.subscriptionResetVersion).
 * To run it again by hand:   node scripts/resetSubscriptions.js --force
 */
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SystemSettings = require('../models/SystemSettings');

const RESET_VERSION = 1;
const FREE_STORAGE_MB = 25;

async function resetAll() {
  const settings = await SystemSettings.getSettings();

  const { deletedCount } = await Subscription.deleteMany({});
  const users = await User.updateMany({}, {
    $set: { isSubscribed: false, currentPlan: 'Free', customStorageLimitMB: null }
  });

  settings.freeStorageMB = FREE_STORAGE_MB;
  settings.subscriptionResetVersion = RESET_VERSION;
  await settings.save();

  try { require('../utils/storage').invalidateStorageCache(); } catch { /* cache not loaded */ }

  console.log(`[Subscription reset] Removed ${deletedCount} subscription record(s); ${users.modifiedCount} user(s) reset to the ${FREE_STORAGE_MB} MB free plan.`);
}

async function runOnce() {
  const settings = await SystemSettings.getSettings();
  if ((settings.subscriptionResetVersion || 0) >= RESET_VERSION) return false;
  await resetAll();
  return true;
}

module.exports = { runOnce, resetAll };

// CLI: node scripts/resetSubscriptions.js [--force]
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/docs_app';
  mongoose.connect(uri)
    .then(() => (process.argv.includes('--force') ? resetAll() : runOnce()))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
