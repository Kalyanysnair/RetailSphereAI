import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Sliders,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  Plus,
  Bell,
  User,
  ChevronDown,
  MessageSquare,
  Key,
  Lock,
  Unlock,
  ShieldCheck,
  Send,
  X,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Hammer,
  Check,
  AlertCircle,
  Filter,
  CheckCircle
} from 'lucide-react';
import {
  fetchCustomOrders,
  updateProductionProgress,
  CustomOrderData,
  WorkerData,
  fetchWorkers
} from '../../services/api_production';
import {
  updateUserProfile,
  changeFirstPassword
} from '../../services/api';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orders, setOrders] = useState<CustomOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'builds' | 'in_production' | 'completed'>('builds');
  const [statusFilter, setStatusFilter] = useState<'All' | 'In Production' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Notices
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<CustomOrderData | null>(null);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<CustomOrderData | null>(null);
  const [progressStage, setProgressStage] = useState<string>('Material Sourcing');
  const [progressPercent, setProgressPercent] = useState<number>(25);
  const [progressRemarks, setProgressRemarks] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  // Profile / Password Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Dropdown & Notifications
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    // Load logged in user profile from localStorage
    const savedUser = localStorage.getItem('user_profile') || localStorage.getItem('user');
    let currentUser: any = null;
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        setUserProfile(currentUser);
        if (currentUser.must_change_password) {
          setMustChangePasswordModal(true);
        }
      } catch {
        // fallback
      }
    }
    loadDashboardData(currentUser);
  }, []);

  const loadDashboardData = async (userObj?: any) => {
    setLoading(true);
    try {
      const activeUser = userObj || userProfile;
      const workerId = activeUser?.worker_id || activeUser?.user_id || activeUser?.id;
      const workerEmail = (activeUser?.email || '').toLowerCase().trim();
      const workerName = (activeUser?.full_name || '').toLowerCase().trim();

      const data = await fetchCustomOrders(undefined, false, workerId);
      
      // Strictly filter to orders assigned to this worker in tbl_worker_assignments
      const assignedToMe = (data || []).filter((o) => {
        if (!o.assigned_workers || o.assigned_workers.length === 0) return false;
        return o.assigned_workers.some((w) => {
          if (workerId && w.worker_id && Number(w.worker_id) === Number(workerId)) return true;
          if (workerName && w.worker_name && w.worker_name.toLowerCase().trim() === workerName) return true;
          return false;
        });
      });

      setOrders(assignedToMe);
    } catch (err: any) {
      console.error('Failed to load assigned builds:', err);
      setErrorNotice('Could not load workshop builds. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProgress) return;
    setIsUpdatingProgress(true);
    setErrorNotice(null);

    try {
      await updateProductionProgress(
        selectedOrderForProgress.custom_order_id,
        progressStage,
        progressPercent,
        progressRemarks
      );
      setSuccessNotice(`Updated build progress for Order #${selectedOrderForProgress.custom_order_id} (${progressStage} - ${progressPercent}%)`);
      setTimeout(() => setSuccessNotice(null), 6000);
      setSelectedOrderForProgress(null);
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update build progress.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      await updateUserProfile({
        full_name: userProfile?.full_name || 'Artisan Craftsman',
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordNotice({ type: 'success', text: 'Password updated successfully! Use your new password on next login.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordNotice(null);
        setIsProfileModalOpen(false);
      }, 3000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err?.message || 'Failed to update password.' });
    }
  };

  const handleFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      const updatedUser = await changeFirstPassword(currentPassword, newPassword);
      setUserProfile(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
      setMustChangePasswordModal(false);
      setSuccessNotice('Temporary password changed successfully! Welcome to RetailSphere AI Workshop.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err?.message || 'Failed to update temporary password.' });
    }
  };

  const filteredOrders = orders.filter((o) => {
    const st = (o.order_status || '').toLowerCase();
    
    // Sidebar Tab filter
    if (activeTab === 'in_production' && (!st.includes('production') && !st.includes('approved'))) return false;
    if (activeTab === 'completed' && !st.includes('completed')) return false;

    // Status Filter Pill
    if (statusFilter === 'In Production' && (!st.includes('production') && !st.includes('approved'))) return false;
    if (statusFilter === 'Completed' && !st.includes('completed')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.furniture_type.toLowerCase().includes(q) ||
        o.material.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        String(o.custom_order_id).includes(q)
      );
    }
    return true;
  });

  const totalAssignedCount = orders.length;
  const inProductionCount = orders.filter(o => (o.order_status || '').toLowerCase().includes('production') || (o.order_status || '').toLowerCase().includes('approved')).length;
  const completedCount = orders.filter(o => (o.order_status || '').toLowerCase().includes('completed')).length;

  const initials = (userProfile?.full_name || 'Worker')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen text-[#2C241D] flex font-sans selection:bg-[#38A132] selection:text-white overflow-x-hidden">
      {/* 1. BACKGROUND IMAGE LAYER (FULL SCREEN) */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-r from-[#FAF7F2]/85 via-[#F3EDE5]/80 to-[#EAE1D5]/85 pointer-events-none" />

      {/* 2. LEFT SIDEBAR NAVIGATION PANEL (VISIBLE SIDE CARD) */}
      <aside className="w-72 flex-shrink-0 min-h-screen hidden md:block border-r border-[#D8CCBD] bg-[#E5DCD0]/80 backdrop-blur-xl p-6 space-y-8 relative z-20 shadow-sm">
        {/* Logo Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#2C241D] tracking-tight flex items-center gap-1.5">
            <span>RetailSphere</span>
            <span className="text-[#38A132]">AI</span>
          </h2>
          <span className="text-[11px] font-black text-[#38A132] uppercase tracking-[0.2em] block font-mono">
            WORKSHOP ARTISAN PORTAL
          </span>
        </div>

        {/* Vertical Navigation Menu - Clean 3 Core Tabs */}
        <nav className="space-y-2.5 text-xs font-extrabold">
          <button
            onClick={() => setActiveTab('builds')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'builds'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-4.5 h-4.5" />
              <span className="text-sm">Assigned Builds</span>
            </div>
            {totalAssignedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'builds' ? 'bg-white/20 text-white' : 'bg-[#DCD0C2] text-[#2C241D]'}`}>
                {totalAssignedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('in_production')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'in_production'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4.5 h-4.5" />
              <span className="text-sm">In-Production</span>
            </div>
            {inProductionCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'in_production' ? 'bg-white/20 text-white' : 'bg-[#DCD0C2] text-[#2C241D]'}`}>
                {inProductionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <PackageCheck className="w-4.5 h-4.5" />
              <span className="text-sm">Completed Builds</span>
            </div>
            {completedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-[#DCD0C2] text-[#2C241D]'}`}>
                {completedCount}
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* 3. MAIN CONTENT CONTAINER - LARGE CURVED GLASS PANEL */}
      <main className="flex-1 p-6 lg:p-8 relative z-10 overflow-y-auto min-h-screen">
        <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-8 min-h-[calc(100vh-4rem)]">
          {/* Header Row: Title, Subtitle, Bell Notification & User Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                Workshop Assembly & Build Center
              </h2>
              <p className="text-xs text-[#7A6C5E] mt-1 font-medium max-w-2xl">
                Review assigned custom furniture designs, verify material specifications, set build stages, and update workshop progress.
              </p>
            </div>

            {/* Header Right Controls: Notification Bell + User Pill Button Dropdown */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="w-10 h-10 rounded-2xl bg-white border border-[#E2D7CB] text-[#5C4E42] hover:text-[#38A132] hover:border-[#38A132] transition-all shadow-xs flex items-center justify-center relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#38A132] text-white text-[9px] font-black flex items-center justify-center">
                    6
                  </span>
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                      <h4 className="font-extrabold text-xs text-[#2C241D] flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Workshop Dispatch Alerts</span>
                      </h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#38A132]/15 text-[#38A132]">Live</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-[#E2D7CB] space-y-1">
                        <p className="font-bold text-[#2C241D]">Assigned Workshop Tasks Active</p>
                        <p className="text-[11px] text-[#6B5C4D]">You have {totalAssignedCount} custom furniture build task(s) in your workshop queue.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill Button with Dropdown Overlay */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#38A132] transition-all shadow-xs cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#38A132] text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                    {initials}
                  </div>
                  <span className="text-xs font-extrabold text-[#2C241D] hidden sm:inline">
                    {userProfile?.full_name || 'Geetha Devi'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#38A132]' : ''}`} />
                </button>

                {/* Floating User Menu Dropdown matching reference screenshot */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#2C241D] hover:bg-[#FAF7F2] font-bold transition-colors text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#38A132]" />
                      <span>View Profile</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notices */}
          {successNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl animate-fadeIn flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}
          {errorNotice && (
            <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-2xl animate-fadeIn flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* 3 Metric Stat Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-sm flex items-center justify-between relative overflow-hidden">
              <div>
                <p className="text-[10px] font-black text-[#7A6C5E] uppercase tracking-widest">ASSIGNED BUILDS</p>
                <p className="text-3xl font-black text-[#2C241D] mt-1">{totalAssignedCount} Builds</p>
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  Awaiting review & build
                </span>
              </div>
              <div className="w-8 h-8 rounded-full border border-amber-300 text-amber-600 flex items-center justify-center flex-shrink-0 self-start">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-sm flex items-center justify-between relative overflow-hidden">
              <div>
                <p className="text-[10px] font-black text-[#7A6C5E] uppercase tracking-widest">IN-PRODUCTION</p>
                <p className="text-3xl font-black text-[#2C241D] mt-1">{inProductionCount} Orders</p>
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active framing & joinery
                </span>
              </div>
              <div className="w-8 h-8 rounded-full border border-emerald-300 text-emerald-600 flex items-center justify-center flex-shrink-0 self-start">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-sm flex items-center justify-between relative overflow-hidden">
              <div>
                <p className="text-[10px] font-black text-[#7A6C5E] uppercase tracking-widest">COMPLETED BUILDS</p>
                <p className="text-3xl font-black text-[#2C241D] mt-1">{completedCount} Builds</p>
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Finished & quality checked
                </span>
              </div>
              <div className="w-8 h-8 rounded-full border border-emerald-300 text-emerald-600 flex items-center justify-center flex-shrink-0 self-start">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Status Filter Pills Row + Search Bar Input */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-[#7A6C5E] mr-1">Filter Status:</span>
              
              <button
                onClick={() => setStatusFilter('All')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === 'All'
                    ? 'bg-[#38A132] text-white shadow-sm'
                    : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                }`}
              >
                All ({totalAssignedCount})
              </button>

              <button
                onClick={() => setStatusFilter('In Production')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === 'In Production'
                    ? 'bg-[#38A132] text-white shadow-sm'
                    : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                }`}
              >
                In Production ({inProductionCount})
              </button>

              <button
                onClick={() => setStatusFilter('Completed')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === 'Completed'
                    ? 'bg-[#38A132] text-white shadow-sm'
                    : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Search Bar Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID, client, material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2D7CB] rounded-full text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D] shadow-xs"
              />
            </div>
          </div>

          {/* Order Cards List */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-[#E2D7CB]">
                <RefreshCw className="w-8 h-8 text-[#38A132] animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#6B5C4D]">Loading assigned workshop builds...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 px-4 text-center bg-white rounded-3xl border border-[#E2D7CB] space-y-3">
                <Wrench className="w-10 h-10 text-[#8C7C6D] mx-auto" />
                <h4 className="font-extrabold text-base text-[#2C241D]">No assigned builds found</h4>
                <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                  {searchQuery ? `No builds match "${searchQuery}".` : 'Assigned custom furniture build orders will appear here for stage updates.'}
                </p>
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div key={ord.custom_order_id} className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-sm hover:shadow-md transition-shadow space-y-5">
                  {/* Top Row: Order Badge & Title */}
                  <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#38A132]/15 text-[#38A132]">
                        Order #{ord.custom_order_id}
                      </span>
                      <h3 className="text-lg font-black text-[#2C241D]">{ord.furniture_type}</h3>
                    </div>
                  </div>

                  {/* Specs Grid - 4 Clean Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[11px] font-bold text-[#7A6C5E]">Client Name</p>
                      <p className="font-black text-[#2C241D] mt-0.5">{ord.customer_name || 'Customer'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#7A6C5E]">Material Finish</p>
                      <p className="font-black text-[#2C241D] mt-0.5">{ord.material || 'Solid Teak Wood'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#7A6C5E]">Color / Polish</p>
                      <p className="font-black text-[#2C241D] mt-0.5">{ord.color || 'Natural Polish'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#7A6C5E]">Order Date</p>
                      <p className="font-black text-[#2C241D] mt-0.5">{ord.order_date ? ord.order_date.split('T')[0] : (ord.created_at || '2026-08-13')}</p>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDetails(ord)}
                      className="px-5 py-2.5 rounded-2xl bg-[#F3EDE5] hover:bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#7A6C5E]" />
                      <span>View Specs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForProgress(ord);
                        setProgressStage(ord.current_stage || ord.production_stage || 'Structural Joinery & Framing');
                        setProgressPercent(ord.progress_percentage ?? ord.progress_percent ?? 50);
                        setProgressRemarks(ord.latest_remarks || ord.progress_remarks || '');
                      }}
                      className="px-6 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Update Stage & Progress</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: Update Build Stage & Progress */}
      {selectedOrderForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForProgress(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-extrabold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Update Workshop Stage</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForProgress.custom_order_id} • {selectedOrderForProgress.furniture_type}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProgressSubmit} className="space-y-5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Current Workshop Stage</label>
                <div className="relative">
                  <select
                    value={progressStage}
                    onChange={(e) => {
                      const newStage = e.target.value;
                      setProgressStage(newStage);
                      switch (newStage) {
                        case 'Material Sourcing':
                          setProgressPercent(15);
                          break;
                        case 'Structural Joinery & Framing':
                          setProgressPercent(35);
                          break;
                        case 'Upholstery & Cushioning':
                          setProgressPercent(55);
                          break;
                        case 'Surface Lacquering & Finishing':
                          setProgressPercent(75);
                          break;
                        case 'Quality Assurance & Packaging':
                          setProgressPercent(90);
                          break;
                        case 'Completed & Ready for Dispatch':
                          setProgressPercent(100);
                          break;
                        default:
                          break;
                      }
                    }}
                    className="w-full py-3 pl-4 pr-10 text-xs bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all appearance-none cursor-pointer shadow-xs"
                  >
                    <option value="Material Sourcing" className="py-2 font-bold bg-white text-[#2C241D]">1. Material Sourcing (15%)</option>
                    <option value="Structural Joinery & Framing" className="py-2 font-bold bg-white text-[#2C241D]">2. Structural Joinery & Framing (35%)</option>
                    <option value="Upholstery & Cushioning" className="py-2 font-bold bg-white text-[#2C241D]">3. Upholstery & Cushioning (55%)</option>
                    <option value="Surface Lacquering & Finishing" className="py-2 font-bold bg-white text-[#2C241D]">4. Surface Lacquering & Finishing (75%)</option>
                    <option value="Quality Assurance & Packaging" className="py-2 font-bold bg-white text-[#2C241D]">5. Quality Assurance & Packaging (90%)</option>
                    <option value="Completed & Ready for Dispatch" className="py-2 font-bold bg-white text-[#2C241D]">6. Completed & Ready for Dispatch (100%)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#38A132] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-[#2C241D]">Progress Percentage</label>
                  <div className="flex items-center gap-1 bg-[#38A132]/10 border border-[#38A132]/30 px-3 py-1 rounded-xl">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={progressPercent}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setProgressPercent(val);
                      }}
                      className="w-10 text-right font-black text-sm text-[#38A132] bg-transparent focus:outline-none"
                    />
                    <span className="font-black text-xs text-[#38A132]">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="w-full accent-[#38A132] h-2 bg-[#E2D7CB] rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between mt-2 text-[10px] text-[#7A6C5E] font-bold">
                  <button type="button" onClick={() => setProgressPercent(15)} className="hover:text-[#38A132] cursor-pointer">15%</button>
                  <button type="button" onClick={() => setProgressPercent(35)} className="hover:text-[#38A132] cursor-pointer">35%</button>
                  <button type="button" onClick={() => setProgressPercent(55)} className="hover:text-[#38A132] cursor-pointer">55%</button>
                  <button type="button" onClick={() => setProgressPercent(75)} className="hover:text-[#38A132] cursor-pointer">75%</button>
                  <button type="button" onClick={() => setProgressPercent(100)} className="hover:text-[#38A132] cursor-pointer">100%</button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Technician Build Remarks / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add workshop notes or technical details..."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full p-3 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-medium focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForProgress(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProgress}
                  className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProgress ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isUpdatingProgress ? 'Saving...' : 'Confirm Stage Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Order Specifications Details */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto text-xs">
            <button
              onClick={() => setSelectedOrderForDetails(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-extrabold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 text-[#38A132]">
                  ORDER #{selectedOrderForDetails.custom_order_id}
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-0.5">{selectedOrderForDetails.furniture_type}</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 shadow-xs">
              <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px]">Client Information</h4>
              <p><span className="font-bold">Customer Name:</span> {selectedOrderForDetails.customer_name}</p>
              <p><span className="font-bold">Contact Email:</span> {selectedOrderForDetails.customer_email || 'N/A'}</p>
              <p><span className="font-bold">Phone Contact:</span> {selectedOrderForDetails.customer_phone || 'N/A'}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 shadow-xs">
              <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px]">Technical Specifications</h4>
              <p><span className="font-bold">Primary Hardwood/Material:</span> {selectedOrderForDetails.material}</p>
              <p><span className="font-bold">Dimensions:</span> {selectedOrderForDetails.dimensions}</p>
              <p><span className="font-bold">Upholstery / Polish Finish:</span> {selectedOrderForDetails.color}</p>
              {selectedOrderForDetails.design_description && (
                <div className="pt-2 border-t border-[#EFE7DE]">
                  <span className="font-bold block mb-1">Design Notes:</span>
                  <p className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4E42] whitespace-pre-wrap">
                    {selectedOrderForDetails.design_description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="px-6 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                Close Specs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Worker Password / Profile */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative text-xs">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-extrabold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Worker Profile & Credentials</h3>
                <p className="text-xs text-[#7A6C5E]">{userProfile?.email || 'worker@retailsphere.ai'}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-xs">
              {passwordNotice && (
                <div className={`p-3 rounded-xl font-bold border ${passwordNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
                  {passwordNotice.text}
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Mandatory First Login Password Change */}
      {mustChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/80 backdrop-blur-lg animate-fadeIn text-xs">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-extrabold flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  First Login Action Required
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-1">Change Temporary Password</h3>
              </div>
            </div>

            <p className="text-xs text-[#6B5C4D] font-semibold">
              Your worker account was created with an automatically generated temporary password. For security, you must set a new password before proceeding to your workspace.
            </p>

            <form onSubmit={handleFirstLoginPasswordChange} className="space-y-4 text-xs">
              {passwordNotice && (
                <div className={`p-3 rounded-xl font-bold border ${passwordNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
                  {passwordNotice.text}
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Temporary Password (from email)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter temporary password"
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-rose-600 font-extrabold hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
                >
                  Set New Password & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboardPage;
