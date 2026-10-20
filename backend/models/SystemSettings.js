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
  freeStorageMB: { type: Number, default: 50, required: true },
  warningThresholdPercent: { type: Number, default: 80, required: true },
  currency: { type: String, default: 'USD' },
  currencySymbol: { type: String, default: '$' },
  pricePer50MB: { type: Number, default: 5 },
  activeTheme: { type: String, default: 'royal' },
  tiers: [TierSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Static helper to get or initialize default system settings
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await this.create({
      key: 'global_config',
      freeStorageMB: 50,
      warningThresholdPercent: 80,
      currency: 'USD',
      currencySymbol: '$',
      pricePer50MB: 5,
      tiers: [
        {
          id: 'tier-50mb',
          name: 'Starter Booster (+50 MB)',
          storageMB: 50,
          price: 5,
          period: 'monthly',
          description: '+50 MB additional cloud storage for your workspace',
          badge: 'Most Affordable',
          features: [
            '+50 MB Cloud Storage',
            'Full Editing & Document Creation',
            'Unlimited Group Members',
            'File & Attachment Uploads',
            'Standard Support'
          ],
          isPopular: false
        },
        {
          id: 'tier-100mb',
          name: 'Pro Expansion (+100 MB)',
          storageMB: 100,
          price: 9,
          period: 'monthly',
          description: '+100 MB for active collaborative teams and projects',
          badge: 'Popular Choice',
          features: [
            '+100 MB Cloud Storage',
            'Multiple Organization Groups',
            'Large PDF & Image Attachments',
            'Version History Tracking',
            'Priority Email Support'
          ],
          isPopular: true
        },
        {
          id: 'tier-250mb',
          name: 'Business Team (+250 MB)',
          storageMB: 250,
          price: 20,
          period: 'monthly',
          description: '+250 MB high capacity storage for heavy documentation',
          badge: 'Best Value',
          features: [
            '+250 MB High Speed Storage',
            'Unlimited Groups & Subgroups',
            'Rich Media & High-Res Docs',
            'Fast Export to PDF / Word',
            '24/7 Priority Support'
          ],
          isPopular: false
        },
        {
          id: 'tier-500mb',
          name: 'Enterprise Ultra (+500 MB)',
          storageMB: 500,
          price: 35,
          period: 'monthly',
          description: '+500 MB enterprise grade document storage',
          badge: 'Maximum Power',
          features: [
            '+500 MB Enterprise Capacity',
            'Dedicated Storage Quota',
            'Highest Sync Priority',
            'Custom Group Branding',
            'Dedicated Account Manager'
          ],
          isPopular: false
        }
      ]
    });
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
