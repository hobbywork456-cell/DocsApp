/**
 * Read-side helpers so every screen (profile, subscription window, landing page,
 * super admin) describes a subscription the same way.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

// Built-in sample plans that shipped with the app (used only to warn the admin)
const SAMPLE_TIER_SIGNATURE = 'tier-50mb:5|tier-100mb:9|tier-250mb:20|tier-500mb:35';

const isSampleTierSet = (tiers = []) =>
  tiers.map((t) => `${t.id}:${t.price}`).join('|') === SAMPLE_TIER_SIGNATURE;

/**
 * Adds computed fields to a subscription document:
 *   effectiveStatus: 'active' | 'expired' | 'cancelled'
 *   isActive, daysLeft (null for no-expiry plans)
 */
function decorateSubscription(sub, now = Date.now()) {
  if (!sub) return sub;
  const plain = typeof sub.toObject === 'function' ? sub.toObject() : { ...sub };
  const expiresAt = plain.expiresAt ? new Date(plain.expiresAt).getTime() : null;
  let effectiveStatus = plain.status || 'active';
  if (effectiveStatus === 'active' && expiresAt && expiresAt <= now) effectiveStatus = 'expired';
  const isActive = effectiveStatus === 'active';
  const daysLeft = isActive && expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / DAY_MS)) : null;
  return { ...plain, effectiveStatus, isActive, daysLeft };
}

// Public, display-ready tariff (same object for landing page, subscription window and admin preview)
function publicTariff(settings) {
  return {
    freeStorageMB: settings.freeStorageMB || 25,
    warningThresholdPercent: settings.warningThresholdPercent || 80,
    currency: settings.currency || 'INR',
    currencySymbol: settings.currencySymbol || '₹',
    pricePer50MB: settings.pricePer50MB,
    tiers: (settings.tiers || []).map((t) => ({
      id: t.id,
      name: t.name,
      storageMB: t.storageMB,
      price: t.price,
      period: t.period || 'monthly',
      description: t.description || '',
      badge: t.badge || '',
      features: t.features || [],
      isPopular: Boolean(t.isPopular)
    })),
    updatedAt: settings.updatedAt
  };
}

module.exports = { decorateSubscription, publicTariff, isSampleTierSet };
