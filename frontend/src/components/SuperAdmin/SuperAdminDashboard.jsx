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
  const [freeStorageMB, setFreeStorageMB] = useState(50);
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
      setFreeStorageMB(tariff.freeStorageMB ?? 50);
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
    setCustomQuotaInput(user.totalQuotaMB || 50);
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

  // Storage numbers
  const totalMBUsed = stats?.totalApplicationMB || 0;
  const freeMB = tariff?.freeStorageMB || 50;

  return (
    <div className="superadmin-console-wrapper font-sans antialiased overflow-x-hidden min-h-screen relative selection:bg-[#4d8fe8]/20 selection:text-[#359871]">
      
      {/* Soft Ambient Glows */}
      <div className="fixed top-[-100px] left-[-50px] w-[650px] h-[650px] bg-gradient-to-br from-[#4d8fe8]/20 via-[#359871]/15 to-transparent rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[20%] right-[-100px] w-[700px] h-[700px] bg-gradient-to-bl from-[#359871]/18 via-[#4d8fe8]/12 to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Floating Status Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#359871]/40 shadow-xl shadow-[#359871]/15 flex items-center gap-3 text-xs font-bold text-[#0f172a] animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[#359871] text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="fixed top-0 left-0 h-screen w-64 flex flex-col justify-between py-5 px-4 z-40 bg-white/90 backdrop-blur-xl border-r border-[#e2e8f0]/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-sig flex items-center justify-center shadow-md shadow-[#359871]/20 text-white font-bold">
              <span className="material-symbols-outlined text-[22px]">auto_stories</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-[#0f172a] tracking-tight flex items-center gap-1.5">
                DocuSphere
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#4d8fe8]/10 text-[#4d8fe8] border border-[#4d8fe8]/20">ADMIN</span>
              </span>
              <span className="text-[11px] text-[#64748b] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#359871] animate-pulse"></span>
                Super Admin Role
              </span>
            </div>
          </div>

          {/* SuperAdmin Authority Pill */}
          <div className="px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4d8fe8] text-[18px]">verified_user</span>
              <span className="text-xs font-semibold text-[#334155]">Full Application Control</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#359871] font-mono text-[10px] font-bold border border-emerald-200">
              Active
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'overview'
                  ? 'text-white font-semibold bg-gradient-sig shadow-sm shadow-[#359871]/25'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100/70 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Overview &amp; Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('tariff')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'tariff'
                  ? 'text-white font-semibold bg-gradient-sig shadow-sm shadow-[#359871]/25'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100/70 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
              <span>Traffic &amp; Tariff Pricing</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'users'
                  ? 'text-white font-semibold bg-gradient-sig shadow-sm shadow-[#359871]/25'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100/70 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">groups</span>
              <span>Users &amp; Storage Quotas</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'groups'
                  ? 'text-white font-semibold bg-gradient-sig shadow-sm shadow-[#359871]/25'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100/70 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              <span>Workspace Groups</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left w-full ${
                activeTab === 'subscriptions'
                  ? 'text-white font-semibold bg-gradient-sig shadow-sm shadow-[#359871]/25'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100/70 font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>Subscription Ledger</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="flex flex-col gap-2 border-t border-[#e2e8f0] pt-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 py-2 px-3 rounded-xl text-[#326127] hover:bg-emerald-50 transition-colors text-xs font-semibold text-left"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Open User Workspace</span>
          </button>
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
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-8 h-16 bg-white/80 backdrop-blur-md border-b border-[#e2e8f0]/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#0f172a] tracking-tight">Super Admin Command Center</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#359871] text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#359871] animate-pulse"></span>
              Live Connected to MongoDB
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 border border-[#359871]/30 hover:border-[#359871] text-[#326127] text-xs font-bold transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              Open User App
            </button>

            <button
              onClick={loadAllData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-[#cbd5e1] hover:border-[#4d8fe8] text-[#334155] text-xs font-semibold transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Data
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-[#e2e8f0]">
              <div className="w-8 h-8 rounded-xl bg-gradient-sig flex items-center justify-center text-white font-bold text-xs shadow-xs">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0f172a]">{currentUser?.email || 'super@gmail.com'}</span>
                <span className="text-[10px] text-[#64748b]">Super Admin Role</span>
              </div>
            </div>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="flex-1 p-8 space-y-7 relative z-10">

          {/* TAB 1: OVERVIEW & REAL METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Bento KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Users */}
                <div className="rounded-2xl p-5 bg-white/90 backdrop-blur-md border border-[#e2e8f0] shadow-sm hover:border-[#4d8fe8]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Total Registered Users</span>
                    <div className="w-9 h-9 rounded-xl bg-gradient-sig flex items-center justify-center text-white shadow-xs">
                      <span className="material-symbols-outlined text-[19px]">groups</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#0f172a] mb-1">{stats?.totalUsers ?? users.length}</div>
                  <div className="flex items-center justify-between text-xs text-[#64748b]">
                    <span>Free: <strong className="text-[#334155]">{stats?.freeUsersCount ?? 0}</strong></span>
                    <span>Paid: <strong className="text-[#359871]">{stats?.subscribedCount ?? 0}</strong></span>
                  </div>
                </div>

                {/* Total Groups */}
                <div className="rounded-2xl p-5 bg-white/90 backdrop-blur-md border border-[#e2e8f0] shadow-sm hover:border-[#359871]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Total Workspaces &amp; Groups</span>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#359871] to-[#60a5fa] flex items-center justify-center text-white shadow-xs">
                      <span className="material-symbols-outlined text-[19px]">corporate_fare</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#0f172a] mb-1">{stats?.totalGroups ?? groups.length}</div>
                  <div className="text-xs text-[#64748b]">Active Multi-User Groups</div>
                </div>

                {/* Total Documents */}
                <div className="rounded-2xl p-5 bg-white/90 backdrop-blur-md border border-[#e2e8f0] shadow-sm hover:border-[#4d8fe8]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Documents in Workspaces</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#4d8fe8] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[19px]">description</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#0f172a] mb-1">{stats?.totalDocuments ?? 0}</div>
                  <div className="text-xs text-[#64748b]">Created across all groups</div>
                </div>

                {/* Platform Storage Used */}
                <div className="rounded-2xl p-5 bg-white/90 backdrop-blur-md border border-[#e2e8f0] shadow-sm hover:border-[#359871]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Global Storage Used</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#359871] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[19px]">database</span>
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#0f172a] mb-1">{totalMBUsed} <span className="text-sm font-normal text-[#64748b]">MB</span></div>
                  <div className="text-xs text-[#64748b]">Base Free Allowance: {freeMB} MB / creator</div>
                </div>
              </div>

              {/* Application Rules & Storage Policy Explainer Card */}
              <div className="rounded-2xl p-6 bg-white/95 border border-[#e2e8f0] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#359871] text-[22px]">info</span>
                  <h3 className="text-base font-bold text-[#0f172a]">Application Storage &amp; Subscription Rules</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#475569]">
                  <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="font-bold text-[#0f172a] mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#4d8fe8] text-[16px]">verified</span>
                      Primary 50 MB Free Quota
                    </div>
                    Every user or organization creator starts with a default free {freeMB} MB allowance.
                  </div>
                  <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="font-bold text-[#0f172a] mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#359871] text-[16px]">group_work</span>
                      Creator Storage Accounting
                    </div>
                    Only the group creator's subscription space is consumed. Invited members do not consume their quota when working inside the group.
                  </div>
                  <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="font-bold text-[#0f172a] mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-rose-500 text-[16px]">lock</span>
                      Read-Only Mode Lockout
                    </div>
                    When storage reaches 100%, documents lock into Read-Only mode. Adding, editing, and deleting are disabled until upgraded.
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setActiveTab('tariff')}
                    className="px-4 py-2 rounded-xl bg-gradient-sig text-white text-xs font-bold shadow-sm shadow-[#359871]/20 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Manage Tariff Rates &amp; Tiers
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#334155] text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                    Manage Users &amp; Quotas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAFFIC & TARIFF MANAGEMENT (CORE FEATURE) */}
          {activeTab === 'tariff' && (
            <div className="space-y-6">
              <div className="rounded-3xl p-7 bg-white/95 border border-[#e2e8f0] shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0]">
                  <div>
                    <h3 className="text-xl font-bold text-[#0f172a]">Traffic &amp; Tariff Rate Management</h3>
                    <p className="text-xs text-[#64748b] mt-1">
                      Configure base storage allowances, price per 50 MB, and active subscription tiers. Changes immediately apply to all application users.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveTariff}
                    className="px-5 py-2.5 rounded-xl bg-gradient-sig text-white text-xs font-bold shadow-md shadow-[#359871]/25 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Tariff Configuration
                  </button>
                </div>

                {/* Base Parameters Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-[#475569] block mb-1">Base Free Storage (MB):</label>
                    <input
                      type="number"
                      min="1"
                      value={freeStorageMB}
                      onChange={(e) => setFreeStorageMB(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#cbd5e1] font-mono text-sm font-bold text-[#0f172a] bg-white outline-none focus:border-[#4d8fe8]"
                    />
                    <span className="text-[11px] text-[#94a3b8] mt-1 block">Default: 50 MB free</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-[#475569] block mb-1">Price per 50 MB Pack ($):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={pricePer50MB}
                      onChange={(e) => setPricePer50MB(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#cbd5e1] font-mono text-sm font-bold text-[#0f172a] bg-white outline-none focus:border-[#4d8fe8]"
                    />
                    <span className="text-[11px] text-[#94a3b8] mt-1 block">Default: $5.00</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-[#475569] block mb-1">Warning Threshold (%):</label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={warningThreshold}
                      onChange={(e) => setWarningThreshold(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#cbd5e1] font-mono text-sm font-bold text-[#0f172a] bg-white outline-none focus:border-[#4d8fe8]"
                    />
                    <span className="text-[11px] text-[#94a3b8] mt-1 block">Triggers amber warning banner</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-[#475569] block mb-1">Currency Symbol:</label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#cbd5e1] font-mono text-sm font-bold text-[#0f172a] bg-white outline-none focus:border-[#4d8fe8]"
                    />
                    <span className="text-[11px] text-[#94a3b8] mt-1 block">e.g. $, €, ₹</span>
                  </div>
                </div>

                {/* Subscription Plan Tiers Editor */}
                <div className="pt-4 border-t border-[#e2e8f0] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-[#0f172a]">Active Subscription Plan Tiers</h4>
                      <p className="text-xs text-[#64748b]">These tiers appear directly in the user subscription modal for purchase.</p>
                    </div>
                    <button
                      onClick={handleAddTier}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-[#cbd5e1] hover:border-[#359871] text-[#334155] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#359871]">add</span>
                      Add Tier
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tiers.map((tier, idx) => (
                      <div key={tier.id || idx} className="p-5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3 relative group">
                        <button
                          onClick={() => handleRemoveTier(idx)}
                          className="absolute top-3 right-3 text-[#94a3b8] hover:text-rose-500 transition-colors p-1"
                          title="Remove tier"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>

                        <div>
                          <label className="text-[11px] font-bold text-[#64748b] block mb-1">Plan Name</label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-[#cbd5e1] bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-[#64748b] block mb-1">Bonus MB</label>
                            <input
                              type="number"
                              value={tier.storageMB}
                              onChange={(e) => handleTierChange(idx, 'storageMB', Number(e.target.value))}
                              className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#cbd5e1] bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#64748b] block mb-1">Price ($)</label>
                            <input
                              type="number"
                              value={tier.price}
                              onChange={(e) => handleTierChange(idx, 'price', Number(e.target.value))}
                              className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#cbd5e1] bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#64748b] block mb-1">Badge Tag</label>
                          <input
                            type="text"
                            value={tier.badge || ''}
                            onChange={(e) => handleTierChange(idx, 'badge', e.target.value)}
                            placeholder="e.g. Popular, Best Value"
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-[#cbd5e1] bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#64748b] block mb-1">Description</label>
                          <input
                            type="text"
                            value={tier.description || ''}
                            onChange={(e) => handleTierChange(idx, 'description', e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-[#cbd5e1] bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveTariff}
                    className="px-6 py-2.5 rounded-xl bg-gradient-sig text-white text-xs font-bold shadow-md shadow-[#359871]/25 hover:opacity-95 transition-all flex items-center gap-2"
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
            <div className="rounded-3xl bg-white/95 border border-[#e2e8f0] shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Users &amp; Storage Quotas</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Manage user roles, monitor storage consumption, and assign custom storage overrides.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#94a3b8] text-[16px]">search</span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by email..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#1e293b] outline-none w-56"
                    />
                  </div>

                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#334155] outline-none"
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
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold text-[#64748b] uppercase">
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4 text-center">Groups Owned</th>
                      <th className="py-3 px-4">Storage Used</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {filteredUsers.map((u) => {
                      const isSuper = u.role === 'superadmin';
                      const isSub = u.isSubscribed;
                      const percent = u.percentUsed || 0;
                      const isLocked = u.isExceeded || percent >= 100;

                      return (
                        <tr key={u.userId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#0f172a]">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${isSuper ? 'bg-gradient-sig' : 'bg-slate-400'}`}>
                                {(u.userEmail || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div>{u.userEmail}</div>
                                {isLocked && (
                                  <span className="text-[10px] text-rose-600 font-bold">100% Full (Read-Only)</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                isSuper
                                  ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                                  : 'bg-slate-100 text-[#475569] border border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle role"
                            >
                              {isSuper ? '👑 SUPERADMIN' : 'USER'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isSub ? 'bg-blue-50 text-[#4d8fe8] border border-blue-200' : 'bg-slate-100 text-[#64748b]'
                            }`}>
                              {u.currentPlan || (isSub ? 'Subscribed' : 'Free (50 MB)')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-[#334155]">
                            {u.groupsCount || 0}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="w-44">
                              <div className="flex justify-between items-center text-[11px] mb-1 font-mono">
                                <span>{u.totalUsedMB || 0} / {u.totalQuotaMB || 50} MB</span>
                                <span className={isLocked ? 'text-rose-600 font-bold' : 'text-[#359871] font-bold'}>{percent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#4d8fe8] hover:text-white text-[#334155] font-semibold text-[11px] transition-all"
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
            <div className="rounded-3xl bg-white/95 border border-[#e2e8f0] shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Workspace Groups ({groups.length})</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">All collaboration groups created across the entire application.</p>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#94a3b8] text-[16px]">search</span>
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search group name or ID..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#1e293b] outline-none w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold text-[#64748b] uppercase">
                      <th className="py-3 px-4">Group Name</th>
                      <th className="py-3 px-4">Group ID</th>
                      <th className="py-3 px-4">Creator Email</th>
                      <th className="py-3 px-4 text-center">Members</th>
                      <th className="py-3 px-4 text-center">Documents</th>
                      <th className="py-3 px-4 text-right">Storage Used (MB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {filteredGroups.map((g) => (
                      <tr key={g._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#0f172a]">{g.name}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#4d8fe8] font-bold">{g.groupId}</td>
                        <td className="py-3.5 px-4 text-[#475569]">{g.createdBy?.email || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#334155]">{g.memberCount || 1}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#334155]">{g.docCount || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#359871]">{g.storageUsedMB || 0} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SUBSCRIPTION LEDGER */}
          {activeTab === 'subscriptions' && (
            <div className="rounded-3xl bg-white/95 border border-[#e2e8f0] shadow-sm overflow-hidden space-y-4 p-6">
              <div className="pb-4 border-b border-[#e2e8f0]">
                <h3 className="text-lg font-bold text-[#0f172a]">Subscription Transactions ({subscriptions.length})</h3>
                <p className="text-xs text-[#64748b] mt-0.5">Real-time ledger of paid storage upgrades from MongoDB.</p>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold text-[#64748b] uppercase">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Subscriber</th>
                      <th className="py-3 px-4">Plan Purchased</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#94a3b8]">
                          No subscription transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#4d8fe8]">{sub.transactionId || sub._id}</td>
                          <td className="py-3.5 px-4 font-semibold text-[#0f172a]">{sub.user?.email || 'N/A'}</td>
                          <td className="py-3.5 px-4 font-bold text-[#359871]">{sub.planName} (+{sub.bonusStorageMB} MB)</td>
                          <td className="py-3.5 px-4 font-mono font-bold">${sub.price}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#359871] border border-emerald-200">
                              {sub.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#64748b]">
                            {new Date(sub.createdAt).toLocaleDateString()}
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
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4d8fe8] text-[20px]">tune</span>
                  <h4 className="font-bold text-[#0f172a] text-base">Custom Storage Quota Override</h4>
                </div>
                <button onClick={() => setQuotaModalOpen(false)} className="text-[#94a3b8] hover:text-[#0f172a]">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="text-xs text-[#64748b] space-y-2">
                <p>Override storage limit for: <strong>{selectedUserForQuota.userEmail}</strong></p>
                <div className="p-3 bg-slate-50 rounded-xl border border-[#e2e8f0] flex justify-between items-center font-mono">
                  <span>Current Space Used:</span>
                  <span className="font-bold text-[#0f172a]">{selectedUserForQuota.totalUsedMB || 0} MB</span>
                </div>
                <div>
                  <label className="font-semibold text-[#334155] block mb-1">New Quota Limit (MB):</label>
                  <input
                    type="number"
                    min="1"
                    value={customQuotaInput}
                    onChange={(e) => setCustomQuotaInput(e.target.value)}
                    placeholder="Leave empty for plan default"
                    className="w-full px-3 py-2 rounded-xl border border-[#cbd5e1] font-mono text-sm font-bold text-[#0f172a] outline-none focus:border-[#4d8fe8]"
                  />
                  <span className="text-[11px] text-[#94a3b8] mt-1 block">
                    (Tip: Setting to 0.001 MB instantly triggers Read-Only lockout for testing)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
                <button
                  onClick={() => setQuotaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-[#475569] text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuotaOverride}
                  className="px-5 py-2 rounded-xl bg-gradient-sig text-white text-xs font-bold shadow-md shadow-[#359871]/25 hover:opacity-95"
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
