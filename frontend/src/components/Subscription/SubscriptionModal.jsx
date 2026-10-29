import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  LinearProgress
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VerifiedIcon from '@mui/icons-material/Verified';
import SyncIcon from '@mui/icons-material/Sync';
import SecurityIcon from '@mui/icons-material/Security';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  setSubscriptionModalOpen,
  fetchRazorpayConfig,
  fetchStorageUsage,
  fetchGroupStorageUsage,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchSubscriptionSummary,
  setSubscriptionModalTab,
  downloadInvoice,
  clearSubscriptionError
} from '../../slices/subscriptionSlice';
import PlanCard from './PlanCard';
import { formatPrice, formatMB, formatDate, periodInfo, subscriptionStatus, validityText } from '../../utils/subscriptionFormat';
import { fetchCurrentProfile } from '../../slices/authSlice';
import './SubscriptionModal.css';

// Utility to load Razorpay checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const SubscriptionModal = () => {
  const dispatch = useDispatch();
  const { 
    isModalOpen, 
    tariff, 
    userStats, 
    history, 
    subscribing, 
    paymentProcessing,
    invoiceLoading,
    subscribeSuccess, 
    error,
    razorpayConfig,
    modalTab,
    summary
  } = useSelector((state) => state.subscription);
  const user = useSelector((state) => state.auth.user);
  const activeGroupId = useSelector((state) => state.groups.activeGroupId);

  // 0: Plans, 1: Groups Breakdown, 2: Billing History (kept in Redux so the profile can open a specific tab)
  const activeTab = modalTab || 0;
  const setActiveTab = (t) => dispatch(setSubscriptionModalTab(t));
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { planName, storageMB }
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      dispatch(fetchSubscriptionSummary({ refresh: true }));
      dispatch(fetchRazorpayConfig());
      dispatch(clearSubscriptionError());
      setPaymentSuccess(null);
      setPaymentError('');
      loadRazorpayScript();
    }
  }, [dispatch, isModalOpen]);

  const handleClose = () => {
    dispatch(setSubscriptionModalOpen(false));
  };

  const handleInstantSync = async () => {
    setSyncing(true);
    await dispatch(fetchSubscriptionSummary({ refresh: true }));
    if (activeGroupId) await dispatch(fetchGroupStorageUsage(activeGroupId));
    setTimeout(() => setSyncing(false), 600);
  };

  const handleRazorpayCheckout = async (plan) => {
    setSelectedItemId(plan.id);
    setPaymentError('');

    try {
      const scriptLoaded = await loadRazorpayScript();

      // Create order on backend
      const orderAction = await dispatch(createRazorpayOrder({ planId: plan.id }));
      if (createRazorpayOrder.rejected.match(orderAction)) {
        throw new Error(orderAction.payload || 'Failed to initialize payment');
      }

      const orderData = orderAction.payload;

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Could not load the Razorpay checkout. Check your internet connection or disable ad-blockers, then try again.');
      }

      // Razorpay checkout (test or live, depending on the keys in backend/.env)
      if (orderData.isLive) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'DocsApp',
          description: `${plan.name} — +${plan.storageMB} MB Storage`,
          image: '', // Can add logo URL here
          order_id: orderData.orderId,
          handler: async (response) => {
            // The server derives the plan from the signed order, so only the payment references are sent
            const verifyAction = await dispatch(verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }));
            setSelectedItemId(null);

            if (!verifyAction.error) {
              setPaymentSuccess({ planName: plan.name, storageMB: plan.storageMB });
              dispatch(fetchSubscriptionSummary({ refresh: true }));
              dispatch(fetchStorageUsage());
              if (activeGroupId) dispatch(fetchGroupStorageUsage(activeGroupId));
              dispatch(fetchCurrentProfile());
              setActiveTab(2); // Switch to billing history to show invoice
            } else {
              setPaymentError(`${verifyAction.payload || 'Payment verification failed.'} Payment ID: ${response.razorpay_payment_id}`);
            }
          },
          prefill: {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || ''
          },
          // Offer every payment method (each still has to be enabled on the Razorpay account)
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
            emi: true,
            paylater: true
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay using UPI',
                  // No explicit flows: Razorpay shows QR on desktop and UPI apps on mobile automatically
                  instruments: [{ method: 'upi' }]
                },
                cards: {
                  name: 'Credit / Debit Cards',
                  instruments: [{ method: 'card' }]
                },
                netbanking: {
                  name: 'Netbanking',
                  instruments: [{ method: 'netbanking' }]
                },
                others: {
                  name: 'Wallets, EMI & Pay Later',
                  instruments: [{ method: 'wallet' }, { method: 'emi' }, { method: 'cardless_emi' }, { method: 'paylater' }]
                }
              },
              sequence: ['block.upi', 'block.cards', 'block.netbanking', 'block.others'],
              preferences: { show_default_blocks: true }
            }
          },
          theme: { color: 'var(--c-accent)' },
          modal: {
            ondismiss: () => setSelectedItemId(null),
            confirm_close: true
          },
          retry: { enabled: true, max_count: 3 }
        };

        const rzpInstance = new window.Razorpay(options);
        rzpInstance.on('payment.failed', (resp) => {
          setPaymentError(`Payment failed: ${resp.error.description}`);
          setSelectedItemId(null);
        });
        rzpInstance.open();

      } else {
        setPaymentError('Online payments are not configured on the server yet. Please contact the administrator.');
        setSelectedItemId(null);
      }
    } catch (err) {
      console.error('[Razorpay Checkout Error]', err);
      setPaymentError(err.message || 'An error occurred during payment. Please try again.');
      setSelectedItemId(null);
    }
  };

  const handleDownloadInvoice = (subscriptionId) => {
    dispatch(downloadInvoice(subscriptionId));
  };

  // All figures come from the backend (/subscription/summary)
  const defaultFreeMB = tariff?.freeStorageMB || 25;
  const currencySymbol = tariff?.currencySymbol || '₹';
  const stats = userStats || {
    totalUsedMB: 0,
    totalQuotaMB: defaultFreeMB,
    freeStorageMB: defaultFreeMB,
    bonusStorageMB: 0,
    percentUsed: 0,
    groupsBreakdown: []
  };

  const freeStorage = stats.freeStorageMB || defaultFreeMB;
  const bonusStorage = stats.bonusStorageMB || 0;
  const totalQuota = stats.totalQuotaMB || freeStorage;
  const usedMB = stats.totalUsedMB || 0;
  const percentUsed = Math.min(100, stats.percentUsed || 0);
  const activePlans = summary?.activePlans || stats.activeSubscriptions || [];
  const activePlanIds = new Set(activePlans.map((p) => p.planId));
  const activePlanName = activePlans.length ? activePlans.map((p) => p.planName).join(' + ') : 'Free';
  const totalPaid = summary?.totalPaid ?? (history || []).reduce((sum, h) => sum + (Number(h.price) || 0), 0);

  const pricingPlans = tariff?.tiers || [];

  const isBusy = subscribing || paymentProcessing;
  const isRazorpayLive = razorpayConfig?.isLive;

  return (
    <Dialog
      open={isModalOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: 'subscription-modal-paper' }}
    >
      {/* ── Modal Header ─────────────────────────────────────────────── */}
      <DialogTitle className="subscription-modal-header">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <div className="subscription-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b7262" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6a8 3 0 0 1 16 0" />
              <path d="M4 6v12a8 3 0 0 0 16 0V6" />
              <line x1="12" y1="11" x2="12" y2="15" />
            </svg>
            <span className="subscription-header-icon-dot" />
          </div>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--c-ink)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Storage &amp; Subscription Center
              </Typography>
              <span className="bg-[var(--c-tint)] text-[var(--c-accent)] text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                {activePlanName}
              </span>
            </Box>
            <Typography variant="caption" sx={{ color: 'var(--c-muted)', fontWeight: 500 }}>
              DocsApp Workspace • Cloud storage &amp; quota expansion
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={handleClose} size="small" sx={{ color: '#a59a8c', '&:hover': { color: 'var(--c-ink)', bgcolor: 'rgba(0,0,0,0.04)' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ── Modal Content ─────────────────────────────────────────────── */}
      <DialogContent sx={{ px: '24px !important', pt: '4px !important', pb: '18px !important' }}>

        {/* 1. Current plan & usage (live from backend) */}
        <div className="overview-stats-card">
          <div className="overview-stat-col">
            <span className="overview-stat-label">CURRENT PLAN</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val" style={{ fontSize: '1.05rem' }}>{activePlanName}</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">STORAGE USED</span>
            <div className="overview-stat-val-row">
              <span className={`overview-stat-val ${stats.isExceeded ? '' : ''}`} style={stats.isExceeded ? { color: '#dc2626' } : undefined}>{usedMB}</span>
              <span className="overview-stat-unit">of {totalQuota} MB · {percentUsed}%</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">FREE + PAID</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val">{freeStorage}</span>
              <span className="overview-stat-unit">MB</span>
              <span className={`overview-stat-val ${bonusStorage > 0 ? 'overview-stat-green' : ''}`} style={{ marginLeft: 6 }}>+{bonusStorage}</span>
              <span className="overview-stat-unit">MB</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">PAID STORAGE VALID TILL</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val" style={{ fontSize: '1.05rem' }}>
                {activePlans.length ? (stats.planExpiresAt ? formatDate(stats.planExpiresAt) : 'No expiry') : '—'}
              </span>
            </div>
          </div>
        </div>
        <LinearProgress
          variant="determinate"
          value={percentUsed}
          sx={{ height: 6, borderRadius: 3, mb: 2, '& .MuiLinearProgress-bar': { background: stats.isExceeded ? '#dc2626' : percentUsed >= (stats.warningThreshold || 80) ? '#d97706' : 'var(--c-accent)' } }}
        />
        {stats.hasCustomQuota && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            <span>Your storage limit ({totalQuota} MB) has been set by the administrator.</span>
          </div>
        )}

        {/* Active paid plans */}
        {activePlans.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {activePlans.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[var(--c-line)]" style={{ background: 'var(--c-tint)' }}>
                <div className="min-w-0">
                  <div className="text-xs font-bold" style={{ color: 'var(--c-ink)' }}>{p.planName} <span style={{ color: 'var(--c-accent)' }}>· +{formatMB(p.bonusStorageMB)}</span></div>
                  <div className="text-[11px]" style={{ color: 'var(--c-muted)' }}>{validityText(p)}</div>
                </div>
                <Chip label="Active" size="small" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 800, bgcolor: 'var(--c-accent)', color: '#fff' }} />
              </div>
            ))}
          </div>
        )}

        {/* 2. Payment Success Banner */}
        {paymentSuccess && (
          <div className="verified-alert-banner">
            <div className="verified-alert-content">
              <div className="verified-alert-icon">
                <CheckIcon sx={{ fontSize: 15 }} />
              </div>
              <div className="verified-alert-text">
                <strong>Payment verified!</strong> Successfully activated <strong>{paymentSuccess.planName} (+{paymentSuccess.storageMB} MB)</strong>. Your storage quota has been increased immediately!
              </div>
            </div>
            <button type="button" className="verified-alert-btn flex items-center gap-1.5" onClick={handleInstantSync} disabled={syncing}>
              <SyncIcon sx={{ fontSize: 14, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{syncing ? 'Syncing...' : 'Instant Sync'}</span>
            </button>
          </div>
        )}

        {/* Razorpay not configured warning */}
        {!isRazorpayLive && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <WarningAmberIcon sx={{ fontSize: 16, color: '#d97706' }} />
            <span>Online payments are not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env and restart the server.</span>
          </div>
        )}
        {/* Error Notification */}
        {(error || paymentError) && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
            {error || paymentError}
          </div>
        )}

        {/* 3. Navigation Tabs */}
        <div className="sub-custom-tabs">
          <button type="button" className={`sub-tab-item ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
            <span className="sub-tab-dot" />
            <span>Storage Plans</span>
          </button>
          <button type="button" className={`sub-tab-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
            <GroupIcon sx={{ fontSize: 18 }} />
            <span>Groups Breakdown</span>
          </button>
          <button type="button" className={`sub-tab-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
            <ReceiptLongIcon sx={{ fontSize: 18 }} />
            <span>Billing &amp; Invoices</span>
          </button>
        </div>

        {/* ── Tab 0: Storage Plans ──────────────────────────────────────── */}
        {activeTab === 0 && (
          <>
            {pricingPlans.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm text-center">
                <CloudQueueIcon sx={{ fontSize: 32, color: '#a59a8c', mb: 1 }} />
                <p className="font-semibold">No paid storage plans are available yet.</p>
                <p className="text-xs mt-1 text-slate-500">Your free {freeStorage} MB is active. Paid plans will appear here once the administrator publishes them.</p>
              </div>
            ) : (
              <div className="pcard-grid">
                <PlanCard free freeStorageMB={freeStorage} currencySymbol={currencySymbol} active={activePlans.length === 0} compact />
                {pricingPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currencySymbol={currencySymbol}
                    active={activePlanIds.has(plan.id)}
                    actionLabel={!isRazorpayLive
                      ? 'Payments unavailable'
                      : activePlanIds.has(plan.id)
                        ? `Buy again (+${formatMB(plan.storageMB)})`
                        : `Pay ${formatPrice(currencySymbol, plan.price)} with Razorpay`}
                    actionBusy={isBusy && selectedItemId === plan.id}
                    actionDisabled={isBusy || !isRazorpayLive}
                    onAction={() => handleRazorpayCheckout(plan)}
                    footnote={`Storage is added only after payment is confirmed · ${periodInfo(plan.period).validity}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab 1: Groups Breakdown ───────────────────────────────────── */}
        {activeTab === 1 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'var(--c-muted)', fontSize: '0.84rem' }}>
              All groups you created share your primary workspace storage allocation ({totalQuota} MB total).
              Invited members work within this shared pool without consuming their personal storage quota.
            </Typography>

            {(!stats.groupsBreakdown || stats.groupsBreakdown.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
                You have not created any groups yet. Groups created by you will appear here with live storage telemetry.
              </div>
            ) : (
              <Paper className="groups-table-paper">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Group Name</TableCell>
                      <TableCell>Group ID</TableCell>
                      <TableCell align="center">Members</TableCell>
                      <TableCell align="center">Documents</TableCell>
                      <TableCell align="right">Storage Used</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.groupsBreakdown.map((grp) => (
                      <TableRow key={grp.groupId}>
                        <TableCell sx={{ fontWeight: 700 }}>{grp.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', color: 'var(--c-accent)', fontWeight: 600 }}>{grp.groupId}</TableCell>
                        <TableCell align="center">{grp.memberCount}</TableCell>
                        <TableCell align="center">{grp.docCount}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--c-accent)', fontFamily: 'monospace' }}>
                          {grp.usedMB} MB
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}

        {/* ── Tab 2: Billing & Invoices ─────────────────────────────────── */}
        {activeTab === 2 && (
          <Box sx={{ mt: 1 }}>
            {(!history || history.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
                No payments yet. Your free {freeStorage} MB plan is active — storage is added here only after a Razorpay payment is confirmed.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2 text-xs font-semibold" style={{ color: 'var(--c-muted)' }}>
                  <span>{history.length} payment{history.length === 1 ? '' : 's'}</span>
                  <span>Total paid: <strong style={{ color: 'var(--c-ink)' }}>{formatPrice(currencySymbol, totalPaid)}</strong></span>
                </div>
                <Paper className="groups-table-paper" sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Storage</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Valid till</TableCell>
                        <TableCell>Payment ID</TableCell>
                        <TableCell align="center">Invoice</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((sub) => {
                        const st = subscriptionStatus(sub);
                        return (
                          <TableRow key={sub._id}>
                            <TableCell sx={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{formatDate(sub.startDate || sub.createdAt)}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{sub.planName}</TableCell>
                            <TableCell sx={{ color: 'var(--c-accent)', fontWeight: 800, fontFamily: 'monospace' }}>+{formatMB(sub.bonusStorageMB)}</TableCell>
                            <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(sub.currency || currencySymbol, sub.price)}</TableCell>
                            <TableCell>
                              <Chip
                                label={st.label}
                                size="small"
                                icon={st.key === 'active' ? <VerifiedIcon sx={{ fontSize: '0.85rem !important', color: '#fff !important' }} /> : undefined}
                                sx={{
                                  height: 22, fontSize: '0.7rem', fontWeight: 700,
                                  bgcolor: st.key === 'active' ? 'var(--c-accent)' : 'var(--c-line)',
                                  color: st.key === 'active' ? '#fff' : 'var(--c-muted)'
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.74rem', whiteSpace: 'nowrap', color: 'var(--c-muted)' }}>
                              {sub.expiresAt ? formatDate(sub.expiresAt) : 'No expiry'}
                              {st.daysLeft !== null && <div style={{ color: 'var(--c-accent)', fontWeight: 700 }}>{st.daysLeft} days left</div>}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--c-muted)' }}>
                              {(sub.razorpayPaymentId || sub.transactionId || '').slice(-14)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadInvoice(sub._id)}
                                disabled={invoiceLoading}
                                title="Download Invoice"
                                sx={{ color: 'var(--c-accent)', '&:hover': { bgcolor: 'var(--c-tint)' } }}
                              >
                                {invoiceLoading ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 18 }} />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      {/* ── Modal Footer ─────────────────────────────────────────────── */}
      <div className="subscription-modal-footer">
        <div className="footer-secured-badge">
          <SecurityIcon sx={{ fontSize: 16, color: 'var(--c-accent)' }} />
          <span>Secured by Razorpay • UPI, Cards, NetBanking Supported</span>
        </div>
        <button type="button" className="footer-close-btn" onClick={handleClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
};

export default SubscriptionModal;
