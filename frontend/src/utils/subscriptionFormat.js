// Shared wording/formatting for subscription details, so the landing page, profile,
// subscription window and super admin all describe plans identically.

export const PERIOD_LABELS = {
  monthly: { short: '/month', long: 'Monthly', validity: '30 days' },
  yearly: { short: '/year', long: 'Yearly', validity: '365 days' },
  'one-time': { short: 'one-time', long: 'One-time', validity: 'No expiry' }
};

export const periodInfo = (period) => PERIOD_LABELS[period] || PERIOD_LABELS.monthly;

export const formatPrice = (symbol, price) => {
  const n = Number(price) || 0;
  const text = Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol || '₹'}${text}`;
};

export const formatMB = (mb) => {
  const n = Number(mb) || 0;
  if (n >= 1024) return `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)} GB`;
  return `${Number.isInteger(n) ? n : n.toFixed(2)} MB`;
};

export const formatDate = (d) => (d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

// Falls back to client-side calculation for records the server didn't decorate
export const subscriptionStatus = (sub) => {
  if (!sub) return { key: 'none', label: '—', daysLeft: null };
  let key = sub.effectiveStatus || sub.status || 'active';
  const exp = sub.expiresAt ? new Date(sub.expiresAt).getTime() : null;
  if (!sub.effectiveStatus && key === 'active' && exp && exp <= Date.now()) key = 'expired';
  const daysLeft = key === 'active' && exp ? Math.max(0, Math.ceil((exp - Date.now()) / 86400000)) : null;
  const label = key === 'active' ? 'Active' : key === 'expired' ? 'Expired' : key === 'cancelled' ? 'Cancelled' : key;
  return { key, label, daysLeft };
};

export const validityText = (sub) => {
  const st = subscriptionStatus(sub);
  if (st.key !== 'active') return st.key === 'expired' ? `Expired ${formatDate(sub.expiresAt)}` : st.label;
  if (!sub.expiresAt) return 'No expiry';
  return `Valid till ${formatDate(sub.expiresAt)} · ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left`;
};
