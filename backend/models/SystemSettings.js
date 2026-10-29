const mongoose = require('mongoose');

const TierSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  storageMB: { type: Number, required: true },
  price: { type: Number, required: true },
  period: { type: String, default: 'monthly' },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  features: [{ type: String }],
  isPopular: { type: Boolean, default: false }
});

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global_config', unique: true },
  freeStorageMB: { type: Number, default: 25, required: true },
  warningThresholdPercent: { type: Number, default: 80, required: true },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  pricePer50MB: { type: Number, default: 5 },
  activeTheme: { type: String, default: 'royal' },
  // Bumped by scripts/resetSubscriptions.js so the one-time subscription wipe runs only once
  subscriptionResetVersion: { type: Number, default: 0 },
  tiers: [TierSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Static helper to get or initialize default system settings
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await this.create({
      key: 'global_config',
      freeStorageMB: 25,
      warningThresholdPercent: 80,
      currency: 'INR',
      currencySymbol: '₹',
      pricePer50MB: 0,
      // No sample plans: the super admin adds the real plans in Admin → Tariff & Plans
      tiers: []
    });
  } else if (settings && (settings.freeStorageMB === 50 || !settings.freeStorageMB)) {
    settings.freeStorageMB = 25;
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
