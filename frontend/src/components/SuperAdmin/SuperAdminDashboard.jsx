import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchSuperAdminStats,
  fetchSuperAdminUsers,
  fetchSuperAdminGroups,
  fetchSuperAdminTariff,
  updateSuperAdminTariff,
  updateUserRole,
  updateUserQuota,
  fetchSuperAdminSubscriptions
} from '../../slices/superadminSlice';
import { downloadInvoice } from '../../slices/subscriptionSlice';
import { logout } from '../../slices/authSlice';
import PlanCard from '../Subscription/PlanCard';
import { formatPrice, formatMB, formatDate, subscriptionStatus, periodInfo } from '../../utils/subscriptionFormat';
import './SuperAdminDashboard.css';

// Razorpay settles in the currency code; the symbol is only for display
const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian rupee (₹ INR)' },
  { code: 'USD', symbol: '$', label: 'US dollar ($ USD)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€ EUR)' },
  { code: 'GBP', symbol: '£', label: 'British pound (£ GBP)' },
  { code: 'AED', symbol: 'AED ', label: 'UAE dirham (AED)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore dollar (S$ SGD)' }
];

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'space_dashboard', title: 'Overview', blurb: 'How the workspace is doing today: people, storage and revenue.' },
  { id: 'users', label: 'Users', icon: 'group', title: 'Users', blurb: 'Everyone with an account, their plan and how much storage they use.' },
  { id: 'groups', label: 'Workspaces', icon: 'workspaces', title: 'Workspaces', blurb: 'Every group created in the app. Storage counts against the creator.' },
  { id: 'tariff', label: 'Plans & pricing', icon: 'sell', title: 'Plans & pricing', blurb: 'Free storage, payment currency and the paid plans people can buy.' },
  { id: 'subscriptions', label: 'Payments', icon: 'receipt_long', title: 'Payments', blurb: 'Every confirmed Razorpay payment and the storage it added.' }
];

const Icon = ({ name, size = 20, className = '' }) => (
  <span className={`material-symbols-outlined sa-icon ${className}`} style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

const initials = (nameOrEmail = '') => {
  const parts = String(nameOrEmail || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
};

const Meter = ({ percent = 0, tone }) => {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const t = tone || (p >= 100 ? 'danger' : p >= 80 ? 'warn' : 'ok');
  return (
    <div className={`sa-meter is-${t}`} role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${p > 0 ? Math.max(p, 2) : 0}%` }} />
    </div>
  );
};

const Pill = ({ tone = 'neutral', children, icon }) => (
  <span className={`sa-pill is-${tone}`}>
    {icon && <Icon name={icon} size={14} />}
    {children}
  </span>
);

const Empty = ({ icon, title, children, action }) => (
  <div className="sa-empty">
    <Icon name={icon} size={30} />
    <strong>{title}</strong>
    {children && <p>{children}</p>}
    {action}
  </div>
);

const Panel = ({ title, subtitle, actions, children, className = '', flush = false }) => (
  <section className={`sa-panel ${className}`}>
    {(title || actions) && (
      <header className="sa-panel-head">
        <div>
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="sa-panel-actions">{actions}</div>}
      </header>
    )}
    <div className={flush ? 'sa-panel-body is-flush' : 'sa-panel-body'}>{children}</div>
  </section>
);

const Segmented = ({ value, onChange, options }) => (
  <div className="sa-seg" role="tablist">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        className={value === o.value ? 'is-on' : ''}
        onClick={() => onChange(o.value)}
      >
        {o.label}
        {typeof o.count === 'number' && <span className="sa-seg-count">{o.count}</span>}
      </button>
    ))}
  </div>
);

const SearchBox = ({ value, onChange, placeholder }) => (
  <label className="sa-search">
    <Icon name="search" size={18} />
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </label>
);

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);
  const { stats, users, groups, tariff, subscriptions, loading, tariffUpdating } = useSelector((state) => state.superadmin);

  const [activeTab, setActiveTab] = useState('overview');
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [groupSearch, setGroupSearch] = useState('');
  const [paySearch, setPaySearch] = useState('');
  const [payFilter, setPayFilter] = useState('all');

  // Plans & pricing form (loaded from DB)
  const [freeStorageMB, setFreeStorageMB] = useState(25);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [tiers, setTiers] = useState([]);
  const [tariffDirty, setTariffDirty] = useState(false);
  const [openTierId, setOpenTierId] = useState(null);

  // Dialogs
  const [quotaUser, setQuotaUser] = useState(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [roleUser, setRoleUser] = useState(null);

  const [toast, setToast] = useState(null);
  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAllData = useCallback(async () => {
    setSyncing(true);
    await Promise.all([
      dispatch(fetchSuperAdminStats()),
      dispatch(fetchSuperAdminUsers()),
      dispatch(fetchSuperAdminGroups()),
      dispatch(fetchSuperAdminTariff()),
      dispatch(fetchSuperAdminSubscriptions())
    ]);
    setLastSync(new Date());
    setSyncing(false);
  }, [dispatch]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const applyTariffToForm = useCallback((t) => {
    if (!t) return;
    setFreeStorageMB(t.freeStorageMB ?? 25);
    setWarningThreshold(t.warningThresholdPercent ?? 80);
    setCurrencySymbol(t.currencySymbol ?? '₹');
    setCurrencyCode(t.currency ?? 'INR');
    setTiers((t.tiers || []).map((x) => ({ ...x, features: x.features || [] })));
    setTariffDirty(false);
  }, []);

  // Load the saved tariff into the editor
  useEffect(() => { applyTariffToForm(tariff); }, [tariff, applyTariffToForm]);

  // Warn before leaving with unsaved plan edits
  useEffect(() => {
    if (!tariffDirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [tariffDirty]);

  // ── Plans & pricing actions ──
  const handleSaveTariff = async () => {
    const result = await dispatch(updateSuperAdminTariff({
      freeStorageMB: Number(freeStorageMB),
      warningThresholdPercent: Number(warningThreshold),
      currency: currencyCode,
      currencySymbol,
      tiers: tiers.map((t) => ({
        ...t,
        storageMB: Number(t.storageMB),
        price: Number(t.price),
        features: (Array.isArray(t.features) ? t.features : String(t.features || '').split('\n')).filter((f) => f && f.trim())
      }))
    }));
    if (!result.error) {
      dispatch(fetchSuperAdminStats());
      setTariffDirty(false);
      notify('Plans published. The landing page, profiles and subscription window now show them.');
    } else {
      notify(result.payload || 'Could not publish the plans.', 'error');
    }
  };

  const handleCurrencyChange = (code) => {
    const c = CURRENCIES.find((x) => x.code === code) || CURRENCIES[0];
    setCurrencyCode(c.code);
    setCurrencySymbol(c.symbol);
    setTariffDirty(true);
  };

  const updateTier = (index, field, value) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    setTariffDirty(true);
  };

  const addTier = () => {
    const id = `tier-${Date.now()}`;
    setTiers((prev) => [...prev, { id, name: '', storageMB: 100, price: '', period: 'monthly', badge: '', description: '', features: [], isPopular: false }]);
    setOpenTierId(id);
    setTariffDirty(true);
  };

  const moveTier = (index, dir) => {
    setTiers((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setTariffDirty(true);
  };

  const removeTier = (index) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
    setTariffDirty(true);
  };

  // ── Users actions ──
  const openQuota = (u) => {
    setQuotaUser(u);
    setQuotaInput(u.hasCustomQuota ? String(u.totalQuotaMB) : '');
  };

  const saveQuota = async (reset = false) => {
    if (!quotaUser) return;
    const value = reset || quotaInput === '' ? null : Number(quotaInput);
    if (value !== null && !(value > 0)) {
      notify('Enter a storage limit above 0 MB, or reset to the plan.', 'error');
      return;
    }
    const res = await dispatch(updateUserQuota({ userId: quotaUser.userId, customStorageLimitMB: value }));
    if (res.error) {
      notify(res.payload || 'Could not update the storage limit.', 'error');
      return;
    }
    dispatch(fetchSuperAdminUsers());
    dispatch(fetchSuperAdminStats());
    notify(value === null
      ? `${quotaUser.userEmail} is back on their plan's storage.`
      : `${quotaUser.userEmail} now has a ${formatMB(value)} limit.`);
    setQuotaUser(null);
  };

  const confirmRoleChange = async () => {
    const u = roleUser;
    if (!u) return;
    const newRole = u.role === 'superadmin' ? 'user' : 'superadmin';
    const res = await dispatch(updateUserRole({ userId: u.userId, role: newRole }));
    setRoleUser(null);
    if (res.error) {
      notify(res.payload || 'Could not change the role.', 'error');
      return;
    }
    dispatch(fetchSuperAdminUsers());
    dispatch(fetchSuperAdminStats());
    notify(newRole === 'superadmin' ? `${u.userEmail} is now a super admin.` : `${u.userEmail} is now a regular user.`);
  };

  // Close dialogs with Escape
  useEffect(() => {
    if (!quotaUser && !roleUser) return undefined;
    const h = (e) => { if (e.key === 'Escape') { setQuotaUser(null); setRoleUser(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [quotaUser, roleUser]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // ── Derived data ──
  const freeMB = tariff?.freeStorageMB || 25;
  const symbol = tariff?.currencySymbol || currencySymbol;
  const isSelf = (u) => Boolean(currentUser?.email && u.userEmail === currentUser.email);

  const userCounts = useMemo(() => ({
    all: users.length,
    paid: users.filter((u) => u.isSubscribed).length,
    free: users.filter((u) => !u.isSubscribed).length,
    full: users.filter((u) => u.isExceeded).length
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !`${u.userEmail || ''} ${u.userName || ''}`.toLowerCase().includes(q)) return false;
      if (userFilter === 'paid') return u.isSubscribed;
      if (userFilter === 'free') return !u.isSubscribed;
      if (userFilter === 'full') return u.isExceeded;
      return true;
    });
  }, [users, userSearch, userFilter]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return groups.filter((g) => !q || `${g.name} ${g.groupId} ${g.createdBy?.email || ''}`.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const decoratedPayments = useMemo(() => subscriptions.map((s) => ({ ...s, _st: subscriptionStatus(s) })), [subscriptions]);
  const payCounts = useMemo(() => ({
    all: decoratedPayments.length,
    active: decoratedPayments.filter((s) => s._st.key === 'active').length,
    expired: decoratedPayments.filter((s) => s._st.key !== 'active').length
  }), [decoratedPayments]);
  const filteredPayments = useMemo(() => {
    const q = paySearch.trim().toLowerCase();
    return decoratedPayments.filter((s) => {
      if (payFilter === 'active' && s._st.key !== 'active') return false;
      if (payFilter === 'expired' && s._st.key === 'active') return false;
      if (q && !`${s.user?.email || ''} ${s.planName || ''} ${s.transactionId || ''} ${s.razorpayOrderId || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [decoratedPayments, paySearch, payFilter]);

  const totalRevenue = stats?.totalRevenue || 0;
  const allocatedMB = users.reduce((sum, u) => sum + (Number(u.totalQuotaMB) || 0), 0);
  const usedMB = stats?.totalApplicationMB || 0;
  const platformPercent = allocatedMB > 0 ? (usedMB / allocatedMB) * 100 : 0;
  const warnAt = tariff?.warningThresholdPercent || 80;
  const nearLimit = [...users]
    .filter((u) => (u.percentUsed || 0) >= warnAt)
    .sort((a, b) => (b.percentUsed || 0) - (a.percentUsed || 0))
    .slice(0, 5);
  const recentPayments = decoratedPayments.slice(0, 5);
  const revenue30 = decoratedPayments
    .filter((s) => Date.now() - new Date(s.createdAt).getTime() <= 30 * 86400000)
    .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const paymentCount = stats?.totalSubscriptions ?? subscriptions.length;

  // Revenue for the last 6 calendar months (for the overview chart)
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), total: 0, count: 0 });
    }
    decoratedPayments.forEach((p) => {
      const d = new Date(p.createdAt);
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) { b.total += Number(p.price) || 0; b.count += 1; }
    });
    return buckets;
  }, [decoratedPayments]);
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.total));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const section = SECTIONS.find((s) => s.id === activeTab) || SECTIONS[0];
  const adminName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.email?.split('@')[0] || 'Admin';

  return (
    <div className="sa-shell">
      {/* ── Side rail ── */}
      <aside className="sa-rail" aria-label="Admin navigation">
        <div className="sa-brand">
          <span className="sa-brand-mark"><Icon name="menu_book" size={20} /></span>
          <div>
            <strong>DocsApp</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav className="sa-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={activeTab === s.id ? 'is-active' : ''}
              aria-current={activeTab === s.id ? 'page' : undefined}
              onClick={() => setActiveTab(s.id)}
            >
              <Icon name={s.icon} size={20} />
              <span>{s.label}</span>
              {s.id === 'users' && userCounts.full > 0 && <span className="sa-nav-badge" title="People with full storage">{userCounts.full}</span>}
              {s.id === 'tariff' && tariffDirty && <span className="sa-nav-dot" title="Unpublished changes" />}
            </button>
          ))}
        </nav>

        <div className="sa-rail-foot">
          <div className="sa-me">
            <span className="sa-avatar is-rail">{initials(adminName)}</span>
            <div>
              <strong>{adminName}</strong>
              <span>{currentUser?.email}</span>
            </div>
          </div>
          <button type="button" className="sa-signout" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="sa-main">
        <header className="sa-topbar">
          <div className="sa-topbar-title">
            {activeTab === 'overview' ? (
              <>
                <span className="sa-topbar-kicker">{todayLabel}</span>
                <h1>{greeting}, {currentUser?.firstName || adminName}</h1>
              </>
            ) : (
              <>
                <h1>{section.title}</h1>
                <p>{section.blurb}</p>
              </>
            )}
          </div>
          <div className="sa-topbar-actions">
            <span className="sa-sync">
              {syncing || loading ? 'Updating…' : lastSync ? `Updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
            <button type="button" className="sa-btn is-ghost" onClick={loadAllData} disabled={syncing}>
              <Icon name="refresh" size={18} className={syncing ? 'is-spinning' : ''} />
              Refresh
            </button>
          </div>
        </header>

        <main className="sa-content">
          {/* ═════════ OVERVIEW ═════════ */}
          {activeTab === 'overview' && (
            <>
              <section className="sa-hero">
                <div className="sa-hero-revenue">
                  <span className="sa-hero-label">Total revenue</span>
                  <div className="sa-hero-figure">{formatPrice(symbol, totalRevenue)}</div>
                  <p>{formatPrice(symbol, revenue30)} in the last 30 days, from {paymentCount} payment{paymentCount === 1 ? '' : 's'} in total.</p>
                  <button type="button" className="sa-link is-light" onClick={() => setActiveTab('subscriptions')}>View payments</button>
                </div>

                <div className="sa-hero-chart" aria-label="Revenue in the last six months">
                  <span className="sa-hero-label">Last six months</span>
                  <div className="sa-bars">
                    {monthly.map((m, i) => (
                      <div key={m.key} className={`sa-bar ${i === monthly.length - 1 ? 'is-current' : ''}`} title={`${m.label}: ${formatPrice(symbol, m.total)} from ${m.count} payment${m.count === 1 ? '' : 's'}`}>
                        <span className="sa-bar-value">{m.total ? formatPrice(symbol, m.total) : ''}</span>
                        <span className="sa-bar-fill" style={{ height: `${m.total ? Math.max(6, (m.total / monthlyMax) * 100) : 2}%` }} />
                        <span className="sa-bar-label">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sa-hero-storage">
                  <span className="sa-hero-label">Platform storage</span>
                  <div className="sa-ring-wrap">
                    <svg className="sa-ring" viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="52" className="sa-ring-track" />
                      <circle
                        cx="60" cy="60" r="52" className="sa-ring-fill"
                        strokeDasharray={`${(Math.min(100, platformPercent) / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                      />
                    </svg>
                    <div className="sa-ring-center">
                      <strong>{Math.round(platformPercent)}%</strong>
                      <span>in use</span>
                    </div>
                  </div>
                  <p><strong>{formatMB(usedMB)}</strong> of {formatMB(allocatedMB)} given to people. Every account starts with {freeMB} MB free.</p>
                </div>
              </section>

              <section className="sa-strip" aria-label="Key numbers">
                <button type="button" onClick={() => { setUserFilter('all'); setActiveTab('users'); }}>
                  <span>People</span>
                  <strong>{stats?.totalUsers ?? users.length}</strong>
                  <em>{stats?.subscribedCount ?? userCounts.paid} paying, {stats?.freeUsersCount ?? userCounts.free} free</em>
                </button>
                <button type="button" onClick={() => { setPayFilter('active'); setActiveTab('subscriptions'); }}>
                  <span>Active plans</span>
                  <strong>{payCounts.active}</strong>
                  <em>{payCounts.expired} expired</em>
                </button>
                <button type="button" onClick={() => setActiveTab('groups')}>
                  <span>Workspaces</span>
                  <strong>{stats?.totalGroups ?? groups.length}</strong>
                  <em>{stats?.totalDocuments ?? 0} documents</em>
                </button>
                <button type="button" onClick={() => { setUserFilter('full'); setActiveTab('users'); }}>
                  <span>Storage full</span>
                  <strong className={userCounts.full ? 'is-danger' : ''}>{userCounts.full}</strong>
                  <em>{userCounts.full ? 'editing is locked for them' : 'nobody is locked out'}</em>
                </button>
              </section>

              <div className="sa-grid-3">
                <Panel
                  title="Close to their limit"
                  subtitle={`People using ${warnAt}% or more of their storage`}
                  actions={<button type="button" className="sa-link" onClick={() => setActiveTab('users')}>All users</button>}
                  flush
                >
                  {nearLimit.length === 0 ? (
                    <Empty icon="sentiment_satisfied" title="Everyone has room to work">No one is near their storage limit.</Empty>
                  ) : (
                    <ul className="sa-list">
                      {nearLimit.map((u) => (
                        <li key={u.userId}>
                          <span className="sa-avatar">{initials(u.userName || u.userEmail)}</span>
                          <div className="sa-list-main">
                            <strong>{u.userName || u.userEmail}</strong>
                            <Meter percent={u.percentUsed} />
                          </div>
                          <div className="sa-list-side">
                            <strong className={u.isExceeded ? 'is-danger' : 'is-warn'}>{Math.round(u.percentUsed || 0)}%</strong>
                            <span>{u.totalUsedMB} of {u.totalQuotaMB} MB</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel
                  title="Recent payments"
                  subtitle="Latest confirmed Razorpay payments"
                  actions={<button type="button" className="sa-link" onClick={() => { setPayFilter('all'); setActiveTab('subscriptions'); }}>All payments</button>}
                  flush
                >
                  {recentPayments.length === 0 ? (
                    <Empty icon="payments" title="No payments yet">Payments appear here as soon as Razorpay confirms them.</Empty>
                  ) : (
                    <ul className="sa-list">
                      {recentPayments.map((p) => (
                        <li key={p._id}>
                          <span className="sa-avatar">{initials(p.user?.firstName ? `${p.user.firstName} ${p.user.lastName || ''}` : p.user?.email)}</span>
                          <div className="sa-list-main">
                            <strong>{p.user?.email || 'Deleted user'}</strong>
                            <span>{p.planName}, +{formatMB(p.bonusStorageMB)}, {formatDate(p.createdAt)}</span>
                          </div>
                          <div className="sa-list-side">
                            <strong>{formatPrice(p.currency || symbol, p.price)}</strong>
                            <Pill tone={p._st.key === 'active' ? 'ok' : 'neutral'}>{p._st.label}</Pill>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel
                  title="Plans on sale"
                  subtitle="What people see on the landing page, in their profile and in the subscription window"
                  actions={<button type="button" className="sa-btn is-quiet" onClick={() => setActiveTab('tariff')}><Icon name="edit" size={16} />Edit plans</button>}
                  flush
                >
                  {(tariff?.tiers || []).length === 0 ? (
                    <Empty
                      icon="sell"
                      title="No paid plans yet"
                      action={<button type="button" className="sa-btn is-primary" onClick={() => setActiveTab('tariff')}>Create a plan</button>}
                    >
                      Everyone stays on the free {freeMB} MB until you publish a plan.
                    </Empty>
                  ) : (
                    <div className="sa-plan-rows">
                      {(tariff.tiers || []).map((t) => {
                        const buyers = decoratedPayments.filter((p) => p.planId === t.id && p._st.key === 'active').length;
                        return (
                          <div key={t.id} className="sa-plan-row">
                            <div className="sa-stack">
                              <strong>{t.name}{t.isPopular && <Pill tone="ok">Recommended</Pill>}</strong>
                              <span>+{formatMB(t.storageMB)}, {periodInfo(t.period).long.toLowerCase()}</span>
                            </div>
                            <span className="sa-plan-price">{formatPrice(symbol, t.price)}<em>{periodInfo(t.period).short}</em></span>
                            <span className="sa-plan-buyers">{buyers} active</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>

              <Panel title="How storage works">
                <dl className="sa-rules">
                  <div>
                    <dt><Icon name="redeem" size={18} />Free storage</dt>
                    <dd>Every new and existing account gets {freeMB} MB at no cost.</dd>
                  </div>
                  <div>
                    <dt><Icon name="workspaces" size={18} />Who pays for a workspace</dt>
                    <dd>Files in a workspace count against the person who created it, not the members they invite.</dd>
                  </div>
                  <div>
                    <dt><Icon name="lock" size={18} />When storage is full</dt>
                    <dd>Their workspaces become read-only until they free up space or buy a plan.</dd>
                  </div>
                </dl>
              </Panel>
            </>
          )}

          {/* ═════════ USERS ═════════ */}
          {activeTab === 'users' && (
            <Panel
              flush
              title={`${filteredUsers.length} of ${users.length} people`}
              actions={(
                <>
                  <Segmented
                    value={userFilter}
                    onChange={setUserFilter}
                    options={[
                      { value: 'all', label: 'All', count: userCounts.all },
                      { value: 'paid', label: 'Paying', count: userCounts.paid },
                      { value: 'free', label: 'Free', count: userCounts.free },
                      { value: 'full', label: 'Storage full', count: userCounts.full }
                    ]}
                  />
                  <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Search name or email" />
                </>
              )}
            >
              {filteredUsers.length === 0 ? (
                <Empty icon="person_search" title="No one matches">Try another name, or switch the filter to All.</Empty>
              ) : (
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Plan</th>
                        <th>Storage</th>
                        <th className="is-num">Workspaces</th>
                        <th>Role</th>
                        <th className="is-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSuper = u.role === 'superadmin';
                        const pct = Math.round(u.percentUsed || 0);
                        return (
                          <tr key={u.userId}>
                            <td>
                              <div className="sa-person">
                                <span className={`sa-avatar ${isSuper ? 'is-dark' : ''}`}>{initials(u.userName || u.userEmail)}</span>
                                <div>
                                  <strong>{u.userName || u.userEmail?.split('@')[0]}{isSelf(u) && <em className="sa-you">You</em>}</strong>
                                  <span>{u.userEmail}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {u.isSubscribed
                                ? <Pill tone="ok" icon="workspace_premium">{u.currentPlan}</Pill>
                                : <Pill tone="neutral">Free</Pill>}
                              {u.planExpiresAt && <div className="sa-sub">until {formatDate(u.planExpiresAt)}</div>}
                            </td>
                            <td className="sa-col-storage">
                              <div className="sa-storage-line">
                                <span>{u.totalUsedMB || 0} of {u.totalQuotaMB || freeMB} MB</span>
                                <strong className={u.isExceeded ? 'is-danger' : pct >= warnAt ? 'is-warn' : ''}>{pct}%</strong>
                              </div>
                              <Meter percent={u.percentUsed} />
                              {u.hasCustomQuota && <div className="sa-sub">Custom limit set by an admin</div>}
                            </td>
                            <td className="is-num">{u.groupsCount || 0}</td>
                            <td>
                              {isSuper ? <Pill tone="dark" icon="shield_person">Super admin</Pill> : <Pill tone="neutral">User</Pill>}
                            </td>
                            <td className="is-right">
                              <div className="sa-row-actions">
                                <button type="button" className="sa-btn is-quiet is-sm" onClick={() => openQuota(u)}>Storage limit</button>
                                <button
                                  type="button"
                                  className="sa-btn is-quiet is-sm"
                                  onClick={() => setRoleUser(u)}
                                  disabled={isSelf(u)}
                                  title={isSelf(u) ? 'You can’t change your own role' : undefined}
                                >
                                  {isSuper ? 'Make user' : 'Make admin'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* ═════════ WORKSPACES ═════════ */}
          {activeTab === 'groups' && (
            <Panel
              flush
              title={`${filteredGroups.length} of ${groups.length} workspaces`}
              actions={<SearchBox value={groupSearch} onChange={setGroupSearch} placeholder="Search name, ID or owner" />}
            >
              {filteredGroups.length === 0 ? (
                <Empty icon="workspaces" title={groups.length ? 'No workspace matches' : 'No workspaces yet'}>
                  {groups.length ? 'Try another name, ID or owner email.' : 'Workspaces appear here when people create them.'}
                </Empty>
              ) : (
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Workspace</th>
                        <th>Owner</th>
                        <th className="is-num">Members</th>
                        <th className="is-num">Documents</th>
                        <th className="is-num">Storage</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGroups.map((g) => (
                        <tr key={g._id}>
                          <td>
                            <div className="sa-person">
                              <span className="sa-avatar is-square">{initials(g.name)}</span>
                              <div>
                                <strong>{g.name}</strong>
                                <span className="sa-code">{g.groupId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="sa-stack">
                              <strong>{[g.createdBy?.firstName, g.createdBy?.lastName].filter(Boolean).join(' ') || g.createdBy?.email?.split('@')[0] || 'Unknown'}</strong>
                              <span>{g.createdBy?.email || '—'}</span>
                            </div>
                          </td>
                          <td className="is-num">{g.memberCount}</td>
                          <td className="is-num">{g.docCount}</td>
                          <td className="is-num">{g.storageUsedMB} MB</td>
                          <td className="sa-muted">{formatDate(g.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* ═════════ PLANS & PRICING ═════════ */}
          {activeTab === 'tariff' && (
            <>
              {tariff?.isSampleTiers && !tariffDirty && (
                <div className="sa-notice is-warn">
                  <Icon name="info" size={20} />
                  <span>These are the sample plans that came with the app. Set your real names, prices and currency, then publish. People see exactly what you publish here.</span>
                </div>
              )}

              <div className="sa-pricing">
                <div className="sa-pricing-editor">
                  <Panel title="Basics" subtitle="Applies to every account">
                    <div className="sa-fields-3">
                      <label className="sa-field">
                        <span>Free storage per account</span>
                        <div className="sa-input-unit">
                          <input type="number" min="1" value={freeStorageMB} onChange={(e) => { setFreeStorageMB(e.target.value); setTariffDirty(true); }} />
                          <em>MB</em>
                        </div>
                      </label>
                      <label className="sa-field">
                        <span>Warn people at</span>
                        <div className="sa-input-unit">
                          <input type="number" min="50" max="99" value={warningThreshold} onChange={(e) => { setWarningThreshold(e.target.value); setTariffDirty(true); }} />
                          <em>% used</em>
                        </div>
                      </label>
                      <label className="sa-field">
                        <span>Payment currency</span>
                        <select value={currencyCode} onChange={(e) => handleCurrencyChange(e.target.value)}>
                          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                          {!CURRENCIES.some((c) => c.code === currencyCode) && <option value={currencyCode}>{currencyCode}</option>}
                        </select>
                      </label>
                    </div>
                    <p className="sa-hint">Razorpay charges in the payment currency. Storage is added only after a payment is confirmed.</p>
                  </Panel>

                  <Panel
                    title="Paid plans"
                    subtitle={tiers.length ? `${tiers.length} plan${tiers.length === 1 ? '' : 's'}, shown to people in this order` : 'Nothing on sale yet'}
                    actions={<button type="button" className="sa-btn is-quiet" onClick={addTier}><Icon name="add" size={18} />Add plan</button>}
                    flush
                  >
                    {tiers.length === 0 ? (
                      <Empty icon="sell" title="No paid plans" action={<button type="button" className="sa-btn is-primary" onClick={addTier}>Add your first plan</button>}>
                        People only get the free {freeStorageMB} MB until you add and publish a plan.
                      </Empty>
                    ) : (
                      <ul className="sa-tiers">
                        {tiers.map((t, idx) => {
                          const open = openTierId === t.id;
                          return (
                            <li key={t.id} className={open ? 'is-open' : ''}>
                              <div className="sa-tier-head">
                                <button type="button" className="sa-tier-toggle" onClick={() => setOpenTierId(open ? null : t.id)} aria-expanded={open}>
                                  <Icon name={open ? 'expand_less' : 'expand_more'} size={20} />
                                  <div>
                                    <strong>{t.name || 'Untitled plan'}</strong>
                                    <span>
                                      +{formatMB(t.storageMB)}, {t.price === '' ? 'no price yet' : `${formatPrice(currencySymbol, t.price)} ${periodInfo(t.period).short}`}
                                      {t.isPopular ? ', recommended' : ''}
                                    </span>
                                  </div>
                                </button>
                                <div className="sa-tier-tools">
                                  <button type="button" className="sa-icon-btn" onClick={() => moveTier(idx, -1)} disabled={idx === 0} aria-label="Move plan up"><Icon name="arrow_upward" size={18} /></button>
                                  <button type="button" className="sa-icon-btn" onClick={() => moveTier(idx, 1)} disabled={idx === tiers.length - 1} aria-label="Move plan down"><Icon name="arrow_downward" size={18} /></button>
                                  <button type="button" className="sa-icon-btn is-danger" onClick={() => removeTier(idx)} aria-label="Remove plan"><Icon name="delete" size={18} /></button>
                                </div>
                              </div>
                              {open && (
                                <div className="sa-tier-body">
                                  <label className="sa-field is-wide">
                                    <span>Plan name</span>
                                    <input type="text" value={t.name} placeholder="e.g. Pro storage" onChange={(e) => updateTier(idx, 'name', e.target.value)} />
                                  </label>
                                  <label className="sa-field">
                                    <span>Extra storage</span>
                                    <div className="sa-input-unit">
                                      <input type="number" min="1" value={t.storageMB} onChange={(e) => updateTier(idx, 'storageMB', e.target.value)} />
                                      <em>MB</em>
                                    </div>
                                  </label>
                                  <label className="sa-field">
                                    <span>Price</span>
                                    <div className="sa-input-unit is-prefix">
                                      <em>{currencySymbol.trim()}</em>
                                      <input type="number" min="1" value={t.price} onChange={(e) => updateTier(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))} />
                                    </div>
                                  </label>
                                  <label className="sa-field">
                                    <span>Billing</span>
                                    <select value={t.period || 'monthly'} onChange={(e) => updateTier(idx, 'period', e.target.value)}>
                                      <option value="monthly">Monthly (30 days)</option>
                                      <option value="yearly">Yearly (365 days)</option>
                                      <option value="one-time">One-time (no expiry)</option>
                                    </select>
                                  </label>
                                  <label className="sa-field">
                                    <span>Badge</span>
                                    <input type="text" value={t.badge || ''} placeholder="e.g. Best value" onChange={(e) => updateTier(idx, 'badge', e.target.value)} />
                                  </label>
                                  <label className="sa-field is-wide">
                                    <span>Short description</span>
                                    <input type="text" value={t.description || ''} placeholder="Who this plan is for" onChange={(e) => updateTier(idx, 'description', e.target.value)} />
                                  </label>
                                  <label className="sa-field is-wide">
                                    <span>Features, one per line</span>
                                    <textarea
                                      rows={4}
                                      value={Array.isArray(t.features) ? t.features.join('\n') : (t.features || '')}
                                      placeholder={'Priority support\nLarger attachments'}
                                      onChange={(e) => updateTier(idx, 'features', e.target.value.split('\n'))}
                                    />
                                  </label>
                                  <label className="sa-check is-wide">
                                    <input type="checkbox" checked={Boolean(t.isPopular)} onChange={(e) => updateTier(idx, 'isPopular', e.target.checked)} />
                                    <span>Highlight this plan as the recommended choice</span>
                                  </label>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Panel>
                </div>

                <aside className="sa-pricing-preview" aria-label="Preview">
                  <div className="sa-preview-head">
                    <strong>Preview</strong>
                    <span className={tariffDirty ? 'is-draft' : 'is-live'}>{tariffDirty ? 'Unpublished changes' : 'Live'}</span>
                  </div>
                  <div className="sa-preview-cards">
                    <PlanCard free freeStorageMB={Number(freeStorageMB) || 25} currencySymbol={currencySymbol} compact />
                    {tiers.filter((t) => t.name).map((t) => (
                      <PlanCard
                        key={t.id}
                        plan={{ ...t, features: (Array.isArray(t.features) ? t.features : []).filter((f) => f && f.trim()) }}
                        currencySymbol={currencySymbol}
                        actionLabel={`Pay ${formatPrice(currencySymbol, t.price || 0)}`}
                        actionDisabled
                      />
                    ))}
                  </div>
                </aside>
              </div>

              {/* Publish bar — appears only with unsaved edits */}
              <div className={`sa-savebar ${tariffDirty ? 'is-visible' : ''}`} aria-hidden={!tariffDirty}>
                <span><Icon name="edit_note" size={20} />You have unpublished changes to plans and pricing.</span>
                <div>
                  <button type="button" className="sa-btn is-on-dark" onClick={() => applyTariffToForm(tariff)} tabIndex={tariffDirty ? 0 : -1}>Discard</button>
                  <button type="button" className="sa-btn is-light" onClick={handleSaveTariff} disabled={tariffUpdating} tabIndex={tariffDirty ? 0 : -1}>
                    {tariffUpdating ? 'Publishing…' : 'Publish changes'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═════════ PAYMENTS ═════════ */}
          {activeTab === 'subscriptions' && (
            <>
              <section className="sa-strip is-static" aria-label="Payment totals">
                <div><span>Total received</span><strong>{formatPrice(symbol, totalRevenue)}</strong><em>all time</em></div>
                <div><span>Last 30 days</span><strong>{formatPrice(symbol, revenue30)}</strong><em>new revenue</em></div>
                <div><span>Active plans</span><strong>{payCounts.active}</strong><em>storage in use</em></div>
                <div><span>Expired</span><strong>{payCounts.expired}</strong><em>storage removed</em></div>
              </section>

              <Panel
                flush
                title={`${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'}`}
                actions={(
                  <>
                    <Segmented
                      value={payFilter}
                      onChange={setPayFilter}
                      options={[
                        { value: 'all', label: 'All', count: payCounts.all },
                        { value: 'active', label: 'Active', count: payCounts.active },
                        { value: 'expired', label: 'Expired', count: payCounts.expired }
                      ]}
                    />
                    <SearchBox value={paySearch} onChange={setPaySearch} placeholder="Search email, plan or payment ID" />
                  </>
                )}
              >
                {filteredPayments.length === 0 ? (
                  <Empty icon="receipt_long" title={subscriptions.length ? 'No payment matches' : 'No payments yet'}>
                    {subscriptions.length ? 'Try another search or filter.' : 'Payments appear here as soon as Razorpay confirms them.'}
                  </Empty>
                ) : (
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Plan</th>
                          <th className="is-num">Amount</th>
                          <th>Status</th>
                          <th>Paid on</th>
                          <th>Valid till</th>
                          <th>Payment ID</th>
                          <th className="is-right"><span className="sr-only">Invoice</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((p) => (
                          <tr key={p._id}>
                            <td>
                              <div className="sa-stack">
                                <strong>{[p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || p.user?.email?.split('@')[0] || 'Deleted user'}</strong>
                                <span>{p.user?.email || '—'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="sa-stack">
                                <strong>{p.planName}</strong>
                                <span>+{formatMB(p.bonusStorageMB)}</span>
                              </div>
                            </td>
                            <td className="is-num sa-strong">{formatPrice(p.currency || symbol, p.price)}</td>
                            <td><Pill tone={p._st.key === 'active' ? 'ok' : 'neutral'}>{p._st.label}</Pill></td>
                            <td className="sa-muted">{formatDate(p.createdAt)}</td>
                            <td>
                              <div className="sa-stack">
                                <span className="sa-ink">{p.expiresAt ? formatDate(p.expiresAt) : 'No expiry'}</span>
                                {p._st.daysLeft !== null && <span>{p._st.daysLeft} days left</span>}
                              </div>
                            </td>
                            <td>
                              <div className="sa-stack">
                                <span className="sa-code">{p.razorpayPaymentId || p.transactionId}</span>
                                {p.razorpayOrderId && <span className="sa-code is-faint">{p.razorpayOrderId}</span>}
                              </div>
                            </td>
                            <td className="is-right">
                              <button type="button" className="sa-btn is-quiet is-sm" onClick={() => dispatch(downloadInvoice(p._id))}>
                                <Icon name="description" size={16} />Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </main>
      </div>

      {/* ── Storage limit dialog ── */}
      {quotaUser && (
        <div className="sa-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setQuotaUser(null); }}>
          <div className="sa-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-quota-title">
            <header>
              <h3 id="sa-quota-title">Storage limit</h3>
              <button type="button" className="sa-icon-btn" onClick={() => setQuotaUser(null)} aria-label="Close"><Icon name="close" size={20} /></button>
            </header>
            <div className="sa-person is-lg">
              <span className="sa-avatar">{initials(quotaUser.userName || quotaUser.userEmail)}</span>
              <div>
                <strong>{quotaUser.userName || quotaUser.userEmail}</strong>
                <span>{quotaUser.userEmail}</span>
              </div>
            </div>
            <dl className="sa-dialog-facts">
              <div><dt>Using</dt><dd>{quotaUser.totalUsedMB || 0} MB</dd></div>
              <div><dt>Plan gives</dt><dd>{(quotaUser.freeStorageMB || freeMB) + (quotaUser.bonusStorageMB || 0)} MB</dd></div>
              <div><dt>Current limit</dt><dd>{quotaUser.totalQuotaMB} MB</dd></div>
            </dl>
            <label className="sa-field">
              <span>Custom limit</span>
              <div className="sa-input-unit">
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  placeholder="Use the plan's storage"
                />
                <em>MB</em>
              </div>
            </label>
            <p className="sa-hint">A custom limit replaces this person's free and paid storage until you reset it.</p>
            <footer>
              {quotaUser.hasCustomQuota && (
                <button type="button" className="sa-btn is-quiet" onClick={() => saveQuota(true)}>Reset to plan</button>
              )}
              <span className="sa-flex" />
              <button type="button" className="sa-btn is-ghost" onClick={() => setQuotaUser(null)}>Cancel</button>
              <button type="button" className="sa-btn is-primary" onClick={() => saveQuota(false)}>Save limit</button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Role change confirmation ── */}
      {roleUser && (
        <div className="sa-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setRoleUser(null); }}>
          <div className="sa-dialog is-narrow" role="alertdialog" aria-modal="true" aria-labelledby="sa-role-title">
            <header>
              <h3 id="sa-role-title">{roleUser.role === 'superadmin' ? 'Remove admin access?' : 'Make this person a super admin?'}</h3>
            </header>
            <p className="sa-dialog-text">
              {roleUser.role === 'superadmin'
                ? `${roleUser.userEmail} will lose access to this console and go back to the normal workspace.`
                : `${roleUser.userEmail} will get full access to this console, including plans, prices and everyone's storage.`}
            </p>
            <footer>
              <span className="sa-flex" />
              <button type="button" className="sa-btn is-ghost" onClick={() => setRoleUser(null)}>Cancel</button>
              <button type="button" className={`sa-btn ${roleUser.role === 'superadmin' ? 'is-danger' : 'is-primary'}`} onClick={confirmRoleChange}>
                {roleUser.role === 'superadmin' ? 'Remove admin access' : 'Make super admin'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div key={toast.id} className={`sa-toast is-${toast.tone}`} role="status" aria-live="polite">
          <Icon name={toast.tone === 'error' ? 'error' : 'check_circle'} size={20} />
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><Icon name="close" size={18} /></button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
