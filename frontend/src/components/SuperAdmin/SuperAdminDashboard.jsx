import React, { useState, useEffect } from 'react';
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
  fetchSuperAdminSubscriptions,
  clearSuperAdminMessages
} from '../../slices/superadminSlice';
import { downloadInvoice } from '../../slices/subscriptionSlice';
import { logout } from '../../slices/authSlice';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);
  const {
    stats,
    users,
    groups,
    tariff,
    subscriptions,
    loading,
    tariffUpdating,
    tariffSuccessMsg,
    error
  } = useSelector((state) => state.superadmin);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [groupSearch, setGroupSearch] = useState('');

  // Tariff Form State (Loaded from DB)
  const [freeStorageMB, setFreeStorageMB] = useState(25);
  const [pricePer50MB, setPricePer50MB] = useState(5);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [tiers, setTiers] = useState([]);

  // Quota Override Modal
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [selectedUserForQuota, setSelectedUserForQuota] = useState(null);
  const [customQuotaInput, setCustomQuotaInput] = useState('');

  // Notifications
  const [toastMessage, setToastMessage] = useState('');

  // Initial Load from DB
  const loadAllData = () => {
    dispatch(fetchSuperAdminStats());
    dispatch(fetchSuperAdminUsers());
    dispatch(fetchSuperAdminGroups());
    dispatch(fetchSuperAdminTariff());
    dispatch(fetchSuperAdminSubscriptions());
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  // Synchronize Tariff state when backend tariff loads
  useEffect(() => {
    if (tariff) {
      setFreeStorageMB(tariff.freeStorageMB ?? 25);
      setPricePer50MB(tariff.pricePer50MB ?? 5);
      setWarningThreshold(tariff.warningThresholdPercent ?? 80);
      setCurrencySymbol(tariff.currencySymbol ?? '$');
      setTiers(tariff.tiers && tariff.tiers.length > 0 ? tariff.tiers : [
        {
          id: 'tier-50mb',
          name: 'Starter Booster (+50 MB)',
          storageMB: 50,
          price: 5,
          period: 'monthly',
          badge: 'Most Affordable',
          description: '+50 MB additional storage for your workspace'
        },
        {
          id: 'tier-100mb',
          name: 'Pro Expansion (+100 MB)',
          storageMB: 100,
          price: 9,
          period: 'monthly',
          badge: 'Popular Choice',
          description: '+100 MB for active collaboration teams'
        },
        {
          id: 'tier-250mb',
          name: 'Business Team (+250 MB)',
          storageMB: 250,
          price: 20,
          period: 'monthly',
          badge: 'Best Value',
          description: '+250 MB high capacity workspace storage'
        }
      ]);
    }
  }, [tariff]);

  // Save Tariff to MongoDB (Applies to all application users)
  const handleSaveTariff = async () => {
    const result = await dispatch(updateSuperAdminTariff({
      freeStorageMB: Number(freeStorageMB),
      pricePer50MB: Number(pricePer50MB),
      warningThresholdPercent: Number(warningThreshold),
      currencySymbol,
      tiers
    }));

    if (!result.error) {
      dispatch(fetchSuperAdminStats());
      setToastMessage('✓ Tariff & pricing successfully updated in DB! All users now see these updated rates.');
      setTimeout(() => setToastMessage(''), 4500);
    }
  };

  // Tier Editor helpers
  const handleTierChange = (index, field, value) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleAddTier = () => {
    const newTier = {
      id: `tier-${Date.now()}`,
      name: 'Custom Storage Pack',
      storageMB: 50,
      price: 5,
      period: 'monthly',
      badge: 'New',
      description: '+50 MB additional cloud storage'
    };
    setTiers([...tiers, newTier]);
  };

  const handleRemoveTier = (index) => {
    const updated = [...tiers];
    updated.splice(index, 1);
    setTiers(updated);
  };

  // Quota Override
  const handleOpenQuotaModal = (user) => {
    setSelectedUserForQuota(user);
    setCustomQuotaInput(user.totalQuotaMB || 25);
    setQuotaModalOpen(true);
  };

  const handleSaveQuotaOverride = async () => {
    if (!selectedUserForQuota) return;
    const quotaVal = customQuotaInput === '' ? null : Number(customQuotaInput);
    await dispatch(updateUserQuota({
      userId: selectedUserForQuota.userId,
      customStorageLimitMB: quotaVal
    }));
    dispatch(fetchSuperAdminUsers());
    dispatch(fetchSuperAdminStats());
    setQuotaModalOpen(false);
    setSelectedUserForQuota(null);
    setToastMessage(`✓ Quota updated for ${selectedUserForQuota.userEmail}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Role Toggle
  const handleToggleUserRole = async (user) => {
    const newRole = user.role === 'superadmin' ? 'user' : 'superadmin';
    await dispatch(updateUserRole({ userId: user.userId, role: newRole }));
    dispatch(fetchSuperAdminUsers());
    dispatch(fetchSuperAdminStats());
    setToastMessage(`✓ Role for ${user.userEmail} updated to ${newRole}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Sign out
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchEmail = (u.userEmail || '').toLowerCase().includes(userSearch.toLowerCase());
    if (!matchEmail) return false;
    if (userFilter === 'subscribed') return u.isSubscribed;
    if (userFilter === 'free') return !u.isSubscribed;
    if (userFilter === 'exceeded') return u.isExceeded;
    return true;
  });

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const query = groupSearch.toLowerCase();
    return (
      (g.name || '').toLowerCase().includes(query) ||
      (g.groupId || '').toLowerCase().includes(query) ||
      (g.createdBy?.email || '').toLowerCase().includes(query)
    );
  });

  // Stats
  const totalMBUsed = stats?.totalApplicationMB || 0;
  const freeMB = tariff?.freeStorageMB || 25;
  const totalRevenue = stats?.totalRevenue || 0;

  return (
    <div className="superadmin-console-wrapper font-sans antialiased overflow-x-hidden min-h-screen relative selection:bg-[#5cc28f]/20 selection:text-[#0f2e1f]">

      {/* Floating Status Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-white border border-[#1f8a5b]/40 shadow-xl shadow-[#5cc28f]/15 flex items-center gap-3 text-xs font-bold text-slate-900 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[#1f8a5b] text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col justify-between py-5 px-4 z-40 glass-card bg-white border-r border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-sig flex items-center justify-center shadow-sm text-[#0b1410] font-bold">
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                DocuSphere
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#5cc28f]/10 text-[#1f8a5b] border border-[#1f8a5b]/20">ADMIN</span>
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#a8e6c3] animate-pulse"></span>
                Super Admin Role
              </span>
            </div>
          </div>

          {/* SuperAdmin Authority Pill */}
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f8a5b] text-[18px]">verified_user</span>
              <span className="text-xs font-semibold text-slate-700">Full System Control</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
              Active
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'overview'
                  ? 'text-[#0b1410] font-semibold bg-gradient-sig shadow-sm shadow-[#5cc28f]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview &amp; Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('tariff')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'tariff'
                  ? 'text-[#0b1410] font-semibold bg-gradient-sig shadow-sm shadow-[#5cc28f]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
              <span>Traffic &amp; Tariff Pricing</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'users'
                  ? 'text-[#0b1410] font-semibold bg-gradient-sig shadow-sm shadow-[#5cc28f]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">groups</span>
              <span>Users &amp; Storage Quotas</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'groups'
                  ? 'text-[#0b1410] font-semibold bg-gradient-sig shadow-sm shadow-[#5cc28f]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              <span>Workspace Groups</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'subscriptions'
                  ? 'text-[#0b1410] font-semibold bg-gradient-sig shadow-sm shadow-[#5cc28f]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>Subscription Ledger</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Actions - Superadmin Only (Sign Out) */}
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-2 px-3 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-xs font-semibold text-left"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="pl-64 flex flex-col min-h-screen">

        {/* TOP BAR */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-8 h-16 glass-bar bg-white border-b border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Super Admin Command Center</h1>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a8e6c3] animate-pulse"></span>
              Live Connected to MongoDB
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 hover:border-[#1f8a5b] text-slate-700 hover:text-[#1f8a5b] text-xs font-semibold transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Data
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-sig flex items-center justify-center text-[#0b1410] font-bold text-xs shadow-xs">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">{currentUser?.email || 'super@gmail.com'}</span>
                <span className="text-xs text-slate-500">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="flex-1 p-8 space-y-7 relative z-10">

          {/* TAB 1: OVERVIEW & REAL METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 5 Bento KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Total Users */}
                <div className="glass-card rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:border-[#1f8a5b]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Users</span>
                    <div className="w-9 h-9 rounded-xl bg-[#5cc28f]/10 text-[#1f8a5b] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats?.totalUsers ?? users.length}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Free: <strong className="text-slate-800">{stats?.freeUsersCount ?? 0}</strong></span>
                    <span>Paid: <strong className="text-[#1f8a5b]">{stats?.subscribedCount ?? 0}</strong></span>
                  </div>
                </div>

                {/* Total Groups */}
                <div className="glass-card rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:border-[#1f8a5b]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Workspaces</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats?.totalGroups ?? groups.length}</div>
                  <div className="text-xs text-slate-500">Active Groups</div>
                </div>

                {/* Total Documents */}
                <div className="glass-card rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:border-[#1f8a5b]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Documents</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">{stats?.totalDocuments ?? 0}</div>
                  <div className="text-xs text-slate-500">Across all groups</div>
                </div>

                {/* Platform Storage Used */}
                <div className="glass-card rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:border-[#1f8a5b]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Storage Used</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1f8a5b] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">database</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">{totalMBUsed} <span className="text-sm font-normal text-slate-500">MB</span></div>
                  <div className="text-xs text-slate-500">Base: {freeMB} MB / user</div>
                </div>

                {/* Total Revenue */}
                <div className="rounded-2xl p-5 bg-gradient-sig text-[#0b1410] shadow-sm hover:opacity-95 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#0f2e1f]/70 uppercase tracking-wider">Total Revenue</span>
                    <div className="w-9 h-9 rounded-xl bg-white/50 text-[#0b1410] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">payments</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#0b1410] mb-1">{currencySymbol}{totalRevenue.toFixed(2)}</div>
                  <div className="text-xs text-[#0f2e1f]/70">{stats?.totalSubscriptions ?? subscriptions.length} transactions total</div>
                </div>
              </div>

              {/* Application Rules & Storage Policy Explainer Card */}
              <div className="glass-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1f8a5b] text-[22px]">info</span>
                  <h3 className="text-base font-bold text-slate-900">Application Storage &amp; Subscription Rules</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
                      <span className="material-symbols-outlined text-[#1f8a5b] text-[18px]">verified</span>
                      Primary {freeMB} MB Free Quota
                    </div>
                    Every user or organization creator starts with a default free {freeMB} MB allowance configured in the system.
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
                      <span className="material-symbols-outlined text-[#1f8a5b] text-[18px]">group_work</span>
                      Creator Storage Accounting
                    </div>
                    Only the group creator's subscription space is consumed. Invited members do not consume their quota when working inside the group.
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
                      <span className="material-symbols-outlined text-rose-500 text-[18px]">lock</span>
                      Read-Only Mode Lockout
                    </div>
                    When storage reaches 100%, workspace documents lock into Read-Only mode. Adding, editing, and deleting are disabled until upgraded.
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setActiveTab('tariff')}
                    className="px-4 py-2 rounded-xl bg-gradient-sig text-[#0b1410] text-xs font-bold shadow-sm shadow-[#5cc28f]/20 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Manage Tariff Rates &amp; Tiers
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                    Manage Users &amp; Quotas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAFFIC & TARIFF MANAGEMENT */}
          {activeTab === 'tariff' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-7 bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Traffic &amp; Tariff Rate Management</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Configure base storage allowances, price per 50 MB, and active subscription tiers. Changes immediately apply to all application users.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveTariff}
                    className="px-5 py-2.5 rounded-xl bg-gradient-sig text-[#0b1410] text-xs font-bold shadow-sm shadow-[#5cc28f]/25 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Tariff Configuration
                  </button>
                </div>

                {/* Base Parameters Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Base Free Storage (MB):</label>
                    <input
                      type="number"
                      min="1"
                      value={freeStorageMB}
                      onChange={(e) => setFreeStorageMB(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white outline-none focus:border-[#1f8a5b] focus:ring-1 focus:ring-[#1f8a5b]"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Default: 25 MB free</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Price per 50 MB Pack ($):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={pricePer50MB}
                      onChange={(e) => setPricePer50MB(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white outline-none focus:border-[#1f8a5b] focus:ring-1 focus:ring-[#1f8a5b]"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Default: $5.00</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Warning Threshold (%):</label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={warningThreshold}
                      onChange={(e) => setWarningThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white outline-none focus:border-[#1f8a5b] focus:ring-1 focus:ring-[#1f8a5b]"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Triggers warning banner</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Currency Symbol:</label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 bg-white outline-none focus:border-[#1f8a5b] focus:ring-1 focus:ring-[#1f8a5b]"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">e.g. $, €, ₹</span>
                  </div>
                </div>

                {/* Subscription Plan Tiers Editor */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Active Subscription Plan Tiers</h4>
                      <p className="text-xs text-slate-500">These tiers appear directly in the user subscription modal for purchase.</p>
                    </div>
                    <button
                      onClick={handleAddTier}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-[#1f8a5b] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#1f8a5b]">add</span>
                      Add Tier
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tiers.map((tier, idx) => (
                      <div key={tier.id || idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative group">
                        <button
                          onClick={() => handleRemoveTier(idx)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove tier"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">Plan Name</label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#1f8a5b] outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Bonus MB</label>
                            <input
                              type="number"
                              value={tier.storageMB}
                              onChange={(e) => handleTierChange(idx, 'storageMB', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#1f8a5b] outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Price ($)</label>
                            <input
                              type="number"
                              value={tier.price}
                              onChange={(e) => handleTierChange(idx, 'price', Number(e.target.value))}
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#1f8a5b] outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">Badge Tag</label>
                          <input
                            type="text"
                            value={tier.badge || ''}
                            onChange={(e) => handleTierChange(idx, 'badge', e.target.value)}
                            placeholder="e.g. Popular, Best Value"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#1f8a5b] outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">Description</label>
                          <input
                            type="text"
                            value={tier.description || ''}
                            onChange={(e) => handleTierChange(idx, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-[#1f8a5b] outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveTariff}
                    className="px-6 py-2.5 rounded-xl bg-gradient-sig text-[#0b1410] text-xs font-bold shadow-sm shadow-[#5cc28f]/25 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    Save Tariff &amp; Rates (Applies to All Users Immediately)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS & STORAGE GOVERNANCE */}
          {activeTab === 'users' && (
            <div className="glass-card rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Users &amp; Storage Quotas</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage user roles, monitor storage consumption, and assign custom storage overrides.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by email..."
                      className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none w-64 focus:border-[#1f8a5b]"
                    />
                  </div>

                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 outline-none focus:border-[#1f8a5b]"
                  >
                    <option value="all">All Users</option>
                    <option value="subscribed">Subscribed Only</option>
                    <option value="free">Free Users Only</option>
                    <option value="exceeded">Exceeded / Locked</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4 text-center">Groups Owned</th>
                      <th className="py-3 px-4">Storage Used</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((u) => {
                      const isSuper = u.role === 'superadmin';
                      const isSub = u.isSubscribed;
                      const percent = u.percentUsed || 0;
                      const isLocked = u.isExceeded || percent >= 100;

                      return (
                        <tr key={u.userId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[#0b1410] text-xs ${isSuper ? 'bg-gradient-sig' : 'bg-slate-500'}`}>
                                {(u.userEmail || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{u.userEmail}</div>
                                {isLocked && (
                                  <span className="text-xs text-rose-600 font-bold">100% Full (Read-Only)</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                isSuper
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                              }`}
                              title="Click to toggle role"
                            >
                              {isSuper ? '👑 SUPERADMIN' : 'USER'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                              isSub ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.currentPlan || (isSub ? 'Subscribed' : `Free (${freeMB} MB)`)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                            {u.groupsCount || 0}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="w-48">
                              <div className="flex justify-between items-center text-xs mb-1 font-mono">
                                <span className="text-slate-700">{u.totalUsedMB || 0} / {u.totalQuotaMB || freeMB} MB</span>
                                <span className={isLocked ? 'text-rose-600 font-bold' : 'text-[#1f8a5b] font-bold'}>{percent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isLocked ? 'bg-rose-500' : 'bg-gradient-sig'}`}
                                  style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenQuotaModal(u)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#a8e6c3] hover:text-[#0b1410] text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
                            >
                              Edit Quota
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: WORKSPACE GROUPS OVERVIEW */}
          {activeTab === 'groups' && (
            <div className="glass-card rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Workspace Groups ({groups.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">All collaboration groups created across the entire application.</p>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search group name or ID..."
                    className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none w-64 focus:border-[#1f8a5b]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Group Name</th>
                      <th className="py-3 px-4">Group ID</th>
                      <th className="py-3 px-4">Creator Email</th>
                      <th className="py-3 px-4 text-center">Members</th>
                      <th className="py-3 px-4 text-center">Documents</th>
                      <th className="py-3 px-4 text-right">Storage Used (MB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredGroups.map((g) => (
                      <tr key={g._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{g.name}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#1f8a5b] font-bold">{g.groupId}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{g.createdBy?.email || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 text-xs">{g.memberCount || 1}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 text-xs">{g.docCount || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1f8a5b] text-xs">{g.storageUsedMB || 0} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SUBSCRIPTION LEDGER */}
          {activeTab === 'subscriptions' && (
            <div className="glass-card rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Subscription Transactions ({subscriptions.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time ledger of Razorpay payments and paid storage upgrades from MongoDB.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#1f8a5b]">payments</span>
                    Total Received: {currencySymbol}{totalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Payment &amp; Transaction ID</th>
                      <th className="py-3 px-4">Subscriber</th>
                      <th className="py-3 px-4">Plan Purchased</th>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                          <span className="material-symbols-outlined text-slate-300 text-[36px] block mb-1">receipt_long</span>
                          No subscription transactions recorded yet. Once users purchase storage via Razorpay, transactions appear here live.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-800 text-xs">{sub.transactionId || sub._id}</div>
                            {sub.razorpayOrderId && (
                              <div className="font-mono text-[10px] text-slate-400 mt-0.5">Order: {sub.razorpayOrderId}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900 text-xs">
                            <div>{sub.user?.email || 'N/A'}</div>
                            {(sub.user?.firstName || sub.user?.lastName) && (
                              <div className="text-[10px] text-slate-400">{sub.user.firstName || ''} {sub.user.lastName || ''}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#1f8a5b] text-xs block">{sub.planName}</span>
                            <span className="text-[10px] font-semibold text-slate-500">+{sub.bonusStorageMB} MB Quota Added</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">credit_card</span>
                              {sub.paymentMethod || 'Razorpay'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                            {sub.currency || currencySymbol}{Number(sub.price || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sub.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs">
                            {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => dispatch(downloadInvoice(sub._id))}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#1f8a5b] font-bold text-xs border border-emerald-200 inline-flex items-center gap-1 transition-all shadow-xs"
                              title="View & Print Official Tax Invoice"
                            >
                              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                              Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>

        {/* CUSTOM QUOTA OVERRIDE MODAL */}
        {quotaModalOpen && selectedUserForQuota && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1f8a5b] text-[20px]">tune</span>
                  <h4 className="font-bold text-slate-900 text-base">Custom Storage Quota Override</h4>
                </div>
                <button onClick={() => setQuotaModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>Override storage limit for: <strong className="text-slate-900">{selectedUserForQuota.userEmail}</strong></p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center font-mono">
                  <span>Current Space Used:</span>
                  <span className="font-bold text-slate-900">{selectedUserForQuota.totalUsedMB || 0} MB</span>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">New Quota Limit (MB):</label>
                  <input
                    type="number"
                    min="1"
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(e.target.value)}
                    placeholder="Leave empty for plan default"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 outline-none focus:border-[#1f8a5b] focus:ring-1 focus:ring-[#1f8a5b]"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    (Tip: Setting to 0.001 MB instantly triggers Read-Only lockout for testing)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setQuotaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuotaOverride}
                  className="px-5 py-2 rounded-xl bg-gradient-sig text-[#0b1410] text-xs font-bold shadow-sm shadow-[#5cc28f]/25 hover:opacity-95"
                >
                  Save Quota Override
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
