import React from 'react';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { formatPrice, formatMB, periodInfo } from '../../utils/subscriptionFormat';
import './PlanCard.css';

/**
 * One plan card used everywhere plans are shown (landing page, subscription window,
 * super admin preview). Pass `free` for the built-in free plan.
 */
const PlanCard = ({
  plan,
  free = false,
  freeStorageMB = 25,
  currencySymbol = '₹',
  active = false,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionBusy = false,
  actionVariant = 'primary',
  footnote,
  compact = false
}) => {
  const p = free
    ? {
        name: 'Free',
        price: 0,
        period: 'one-time',
        storageMB: freeStorageMB,
        description: 'Included with every account — new and existing.',
        features: ['Documents, sheets & slides', 'Team groups & invites', 'Export to Office & PDF'],
        badge: ''
      }
    : plan;
  const period = periodInfo(p.period);
  const features = (p.features || []).filter(Boolean);

  return (
    <article className={`pcard ${p.isPopular ? 'is-popular' : ''} ${free ? 'is-free' : ''} ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}>
      <div className="pcard-tags">
        {p.badge && <span className="pcard-badge">{p.badge}</span>}
        {active && <span className="pcard-badge is-active">Your plan</span>}
      </div>
      <h3 className="pcard-name">{p.name}</h3>
      <div className="pcard-price">
        <span className="pcard-amount">{free ? formatPrice(currencySymbol, 0) : formatPrice(currencySymbol, p.price)}</span>
        {!free && <span className="pcard-period">{period.short}</span>}
      </div>
      <div className="pcard-storage">
        <CloudQueueIcon sx={{ fontSize: 16 }} />
        <span>{free ? `${formatMB(p.storageMB)} storage` : `+${formatMB(p.storageMB)} storage`}</span>
        {!free && <span className="pcard-validity">· {period.validity}</span>}
      </div>
      {p.description && !compact && <p className="pcard-desc">{p.description}</p>}
      {features.length > 0 && !compact && (
        <ul className="pcard-features">
          {features.slice(0, 5).map((f) => (
            <li key={f}><CheckRoundedIcon sx={{ fontSize: 15 }} /><span>{f}</span></li>
          ))}
        </ul>
      )}
      {actionLabel && (
        <button
          type="button"
          className={`pcard-btn is-${actionVariant}`}
          onClick={onAction}
          disabled={actionDisabled || actionBusy}
        >
          {actionBusy ? 'Please wait…' : actionLabel}
        </button>
      )}
      {footnote && <p className="pcard-foot">{footnote}</p>}
    </article>
  );
};

export default PlanCard;
