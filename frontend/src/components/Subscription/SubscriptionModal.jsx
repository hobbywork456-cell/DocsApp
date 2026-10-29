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
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import VerifiedIcon from '@mui/icons-material/Verified';
import SyncIcon from '@mui/icons-material/Sync';
import SecurityIcon from '@mui/icons-material/Security';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  setSubscriptionModalOpen,
  fetchTariff,
  fetchRazorpayConfig,
  fetchStorageUsage,
  fetchGroupStorageUsage,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchSubscriptionHistory,
  downloadInvoice,
  clearSubscriptionError
} from '../../slices/subscriptionSlice';
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
    razorpayConfig
  } = useSelector((state) => state.subscription);
  const user = useSelector((state) => state.auth.user);
  const activeGroupId = useSelector((state) => state.groups.activeGroupId);

  const [activeTab, setActiveTab] = useState(0); // 0: Plans, 1: Groups Breakdown, 2: Billing History
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { planName, storageMB }
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      dispatch(fetchTariff());
      dispatch(fetchRazorpayConfig());
      dispatch(fetchStorageUsage());
      dispatch(fetchSubscriptionHistory());
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
    await dispatch(fetchStorageUsage(true));
    if (activeGroupId) await dispatch(fetchGroupStorageUsage(activeGroupId));
    await dispatch(fetchSubscriptionHistory());
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
          name: 'DocuSphere',
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
              dispatch(fetchStorageUsage(true));
              if (activeGroupId) dispatch(fetchGroupStorageUsage(activeGroupId));
              dispatch(fetchCurrentProfile());
              dispatch(fetchSubscriptionHistory());
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
          theme: { color: '#1f8a5b' },
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

  // Use real data from tariff API
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
  const groupsCount = stats.groupsCount || (stats.groupsBreakdown || []).length || 0;
  const activePlanName = stats.currentPlan || 'Free';

  // Real plans from backend tariff tiers
  const pricingPlans = (tariff?.tiers || []).map((tier) => ({
    id: tier.id,
    name: tier.name,
    storageMB: tier.storageMB,
    price: tier.price,
    period: tier.period || 'monthly',
    badge: tier.badge,
    description: tier.description || `+${tier.storageMB} MB additional workspace storage.`,
    features: tier.features || [
      `+${tier.storageMB} MB dedicated storage`,
      'Shared across all groups you create',
      'Instant quota activation',
      'Usage visible in billing history'
    ]
  }));

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f8a5b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6a8 3 0 0 1 16 0" />
              <path d="M4 6v12a8 3 0 0 0 16 0V6" />
              <line x1="12" y1="11" x2="12" y2="15" />
            </svg>
            <span className="subscription-header-icon-dot" />
          </div>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Storage &amp; Subscription Center
              </Typography>
              <span className="bg-[#f0fdf4] text-[#1f8a5b] text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                {activePlanName}
              </span>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              DocuSphere Workspace • Cloud storage &amp; quota expansion
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={handleClose} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a', bgcolor: 'rgba(0,0,0,0.04)' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ── Modal Content ─────────────────────────────────────────────── */}
      <DialogContent sx={{ px: '24px !important', pt: '4px !important', pb: '18px !important' }}>

        {/* 1. Storage Overview Card */}
        <div className="overview-stats-card">
          <div className="overview-stat-col">
            <span className="overview-stat-label">BASE FREE QUOTA</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val">{freeStorage}</span>
              <span className="overview-stat-unit">MB</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">BONUS STORAGE</span>
            <div className="overview-stat-val-row">
              <span className={`overview-stat-val ${bonusStorage > 0 ? 'overview-stat-green' : ''}`}>+{bonusStorage}</span>
              <span className="overview-stat-unit">MB</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">TOTAL QUOTA</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val">{totalQuota}</span>
              <span className="overview-stat-unit">MB</span>
            </div>
          </div>
          <div className="overview-stat-col">
            <span className="overview-stat-label">GROUPS MANAGED</span>
            <div className="overview-stat-val-row">
              <span className="overview-stat-val">{groupsCount}</span>
              <span className="overview-stat-unit">Workspaces</span>
            </div>
          </div>
        </div>

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
        {isRazorpayLive && razorpayConfig?.mode === 'test' && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
            <SecurityIcon sx={{ fontSize: 16, color: '#0284c7' }} />
            <span>Razorpay test mode — no real money is charged. Use card 4111 1111 1111 1111 (any future expiry, any CVV) or UPI <b>success@razorpay</b>.</span>
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
                <CloudQueueIcon sx={{ fontSize: 32, color: '#94a3b8', mb: 1 }} />
                <p className="font-semibold">No subscription tiers configured yet.</p>
                <p className="text-xs mt-1 text-slate-500">The super admin needs to add pricing tiers in the Admin Dashboard → Traffic &amp; Tariff section.</p>
              </div>
            ) : (
              <div className="sub-cards-grid">
                {pricingPlans.map((plan) => (
                  <div key={plan.id} className="sub-pricing-card">
                    {/* Badge */}
                    {plan.badge && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="plan-top-badge badge-gray">{plan.badge}</span>
                      </div>
                    )}

                    <h3 className="plan-card-title">{plan.name}</h3>

                    <span className="plan-card-subpill subpill-green">
                      +{plan.storageMB} MB Storage
                    </span>

                    <p className="plan-card-desc">{plan.description}</p>

                    {/* Price */}
                    <div className="plan-card-price-row">
                      <span className="plan-card-price">{currencySymbol}{plan.price}</span>
                      <span className="plan-card-period">/{plan.period || 'monthly'}</span>
                    </div>

                    {/* Storage Capsule */}
                    <div className="plan-storage-capsule">
                      <CloudQueueIcon sx={{ fontSize: 16 }} />
                      <span>+{plan.storageMB} MB Workspace Storage</span>
                    </div>

                    {/* Features */}
                    <div className="plan-features-wrapper">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="plan-feature-row">
                          <div className="plan-check-icon">
                            <CheckIcon sx={{ fontSize: 12 }} />
                          </div>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      className="plan-navy-btn"
                      disabled={isBusy || !isRazorpayLive}
                      onClick={() => handleRazorpayCheckout(plan)}
                      title={!isRazorpayLive ? 'Payment gateway not configured' : ''}
                    >
                      {isBusy && selectedItemId === plan.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <>
                          <PaymentIcon sx={{ fontSize: 15 }} />
                          <span>Pay with Razorpay (+{plan.storageMB} MB)</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab 1: Groups Breakdown ───────────────────────────────────── */}
        {activeTab === 1 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#64748b', fontSize: '0.84rem' }}>
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
                        <TableCell sx={{ fontFamily: 'monospace', color: '#1f8a5b', fontWeight: 600 }}>{grp.groupId}</TableCell>
                        <TableCell align="center">{grp.memberCount}</TableCell>
                        <TableCell align="center">{grp.docCount}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#1f8a5b', fontFamily: 'monospace' }}>
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
                No subscription or storage purchases yet. Base free quota ({freeStorage} MB) is currently active.
              </div>
            ) : (
              <Paper className="groups-table-paper">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Plan / Pack</TableCell>
                      <TableCell>Bonus Storage</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Invoice</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#1f8a5b' }}>
                          {(sub.transactionId || sub._id || '').slice(-14)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{sub.planName}</TableCell>
                        <TableCell sx={{ color: '#1f8a5b', fontWeight: 800, fontFamily: 'monospace' }}>
                          +{sub.bonusStorageMB} MB
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {sub.currency || '₹'}{sub.price}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sub.status || 'active'}
                            size="small"
                            icon={<VerifiedIcon sx={{ fontSize: '0.85rem !important', color: '#1f8a5b !important' }} />}
                            sx={{ height: 22, fontSize: '0.7rem', bgcolor: '#f0fdf4', color: '#1f8a5b', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                          {new Date(sub.startDate || sub.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadInvoice(sub._id)}
                            disabled={invoiceLoading}
                            title="Download Invoice"
                            sx={{ color: '#1f8a5b', '&:hover': { bgcolor: '#f0fdf4' } }}
                          >
                            {invoiceLoading ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      {/* ── Modal Footer ─────────────────────────────────────────────── */}
      <div className="subscription-modal-footer">
        <div className="footer-secured-badge">
          <SecurityIcon sx={{ fontSize: 16, color: '#1f8a5b' }} />
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
