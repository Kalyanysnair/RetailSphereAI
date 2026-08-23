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
  AlertTriangle,
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
  downloadPaymentReceipt,
  CustomOrderData,
  WorkerData,
  fetchWorkers
} from '../../services/api_production';
import { getCurrentUser, updateUserProfile, changeFirstPassword } from '../../services/api';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';

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
  const [modalProgressError, setModalProgressError] = useState<string | null>(null);

  // Profile / Password Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSpecialization, setProfileSpecialization] = useState('Woodwork & Carpentry');
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
        setProfileFullName(currentUser.full_name || '');
        setProfilePhone(currentUser.phone || '');
        setProfileSpecialization(currentUser.specialization || 'Woodwork & Carpentry');
        if (currentUser.must_change_password) {
          setMustChangePasswordModal(true);
        }
      } catch {
        // fallback
      }
    }
    loadDashboardData(currentUser);

    const handleUpdate = () => loadDashboardData(currentUser);
    window.addEventListener('custom-orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('custom-orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const loadDashboardData = async (userObj?: any) => {
    setLoading(true);
    try {
      const activeUser = userObj || userProfile;
      const workerId = activeUser?.worker_id || activeUser?.user_id || activeUser?.id;
      const workerEmail = (activeUser?.email || '').toLowerCase().trim();
      const workerName = (activeUser?.full_name || '').toLowerCase().trim();

      const data = await fetchCustomOrders(undefined, true, workerId);
      
      // Filter to orders assigned to this worker in tbl_worker_assignments
      const assignedToMe = (data || []).filter((o) => {
        if (!o.assigned_workers || o.assigned_workers.length === 0) return false;
        return o.assigned_workers.some((w) => {
          if (workerId && w.worker_id && Number(w.worker_id) === Number(workerId)) return true;
          if (workerName && w.worker_name && w.worker_name.toLowerCase().trim() === workerName) return true;
          if (workerEmail && w.worker_email && w.worker_email.toLowerCase().trim() === workerEmail) return true;
          return false;
        });
      });

      // If user has specific assigned builds, display them; otherwise fallback to showing all assigned build tasks in workshop queue
      if (assignedToMe.length > 0) {
        setOrders(assignedToMe);
      } else {
        const assignedInWorkshop = (data || []).filter(o => o.assigned_workers && o.assigned_workers.length > 0);
        setOrders(assignedInWorkshop.length > 0 ? assignedInWorkshop : (data || []));
      }
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

  const syncStageFromPercent = (percent: number): string => {
    if (percent < 25) return 'Material Sourcing';
    if (percent < 45) return 'Structural Joinery & Framing';
    if (percent < 65) return 'Upholstery & Cushioning';
    if (percent < 85) return 'Surface Lacquering & Finishing';
    if (percent < 100) return 'Quality Assurance & Packaging';
    return 'Completed & Ready for Dispatch';
  };

  const handlePercentChange = (val: number) => {
    setModalProgressError(null);
    const clamped = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
    setProgressPercent(clamped);
    const autoStage = syncStageFromPercent(clamped);
    setProgressStage(autoStage);
  };

  const handleStageChange = (newStage: string) => {
    setModalProgressError(null);
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
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProgress) return;
    setModalProgressError(null);

    const currentOrdProgress = selectedOrderForProgress.progress_percentage || 0;
    if (progressPercent < currentOrdProgress) {
      setModalProgressError(`⚠️ Build progress percentage cannot be reduced below current recorded progress of ${currentOrdProgress}%.`);
      return;
    }

    if (!progressRemarks || progressRemarks.trim().length < 3) {
      setModalProgressError('⚠️ Please enter technician build notes / remarks for this progress update (min 3 chars).');
      return;
    }

    setIsUpdatingProgress(true);
    setErrorNotice(null);

    try {
      const activeWorkerId = userProfile?.worker_id || userProfile?.user_id || userProfile?.id;
      const myAsgn = selectedOrderForProgress.assigned_workers?.find(w => Number(w.worker_id) === Number(activeWorkerId));
      const myDept = myAsgn?.specialization || userProfile?.specialization || 'Woodwork & Carpentry';

      await updateProductionProgress(
        selectedOrderForProgress.custom_order_id,
        progressStage,
        progressPercent,
        progressRemarks,
        myDept,
        activeWorkerId
      );
      setSuccessNotice(`Updated ${myDept} task progress for Order #${selectedOrderForProgress.custom_order_id} (${progressStage} - ${progressPercent}%)`);
      setTimeout(() => setSuccessNotice(null), 6000);
      setSelectedOrderForProgress(null);
      await loadDashboardData();
    } catch (err: any) {
      setModalProgressError(err.message || 'Failed to update build progress.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    // If user provided password fields, validate them
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setPasswordNotice({ type: 'error', text: 'Please enter your current password to update password.' });
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
    }

    try {
      const updated = await updateUserProfile({
        full_name: profileFullName || userProfile?.full_name || 'Artisan Craftsman',
        phone: profilePhone || userProfile?.phone,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined
      });

      const merged = {
        ...userProfile,
        ...updated,
        full_name: profileFullName || userProfile?.full_name,
        phone: profilePhone || userProfile?.phone,
        specialization: profileSpecialization || userProfile?.specialization
      };
      setUserProfile(merged);
      localStorage.setItem('user', JSON.stringify(merged));
      localStorage.setItem('user_profile', JSON.stringify(merged));

      setPasswordNotice({ type: 'success', text: 'Profile details & credentials updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordNotice(null);
        setIsProfileModalOpen(false);
      }, 2500);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err?.message || 'Failed to update profile details.' });
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
    const isCompleted = st.includes('completed') || (o.progress_percentage && o.progress_percentage >= 100);
    const isInProduction = !isCompleted && (st.includes('production') || st.includes('approved'));

    // Sidebar Tab filter
    if (activeTab === 'in_production' && !isInProduction) return false;
    if (activeTab === 'completed' && !isCompleted) return false;

    // Status Filter Pill
    if (statusFilter === 'In Production' && !isInProduction) return false;
    if (statusFilter === 'Completed' && !isCompleted) return false;

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

  const renderColorSwatchBadge = (colorStr?: string) => {
    if (!colorStr) return <span className="font-bold text-[#2C241D]">Natural Polish</span>;
    const hexMatch = colorStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
        {hexMatch && (
          <span
            className="w-4 h-4 rounded-full inline-block border border-black/30 shadow-2xs shrink-0"
            style={{ backgroundColor: hexMatch }}
          />
        )}
        <span className="font-black text-xs text-[#2C241D]">{colorStr}</span>
      </div>
    );
  };

  const totalAssignedCount = orders.length;
  const inProductionCount = orders.filter(o => {
    const st = (o.order_status || '').toLowerCase();
    const isComp = st.includes('completed') || (o.progress_percentage && o.progress_percentage >= 100);
    return !isComp;
  }).length;
  const completedCount = orders.filter(o => {
    const st = (o.order_status || '').toLowerCase();
    return st.includes('completed') || (o.progress_percentage && o.progress_percentage >= 100);
  }).length;

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
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

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
        <nav className="space-y-2 text-xs font-extrabold">
          <button
            onClick={() => setActiveTab('builds')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'builds'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Assigned Builds</span>
            </div>
            {totalAssignedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'builds' ? 'bg-white/20 text-white' : 'bg-[#DCD0C2] text-[#2C241D]'}`}>
                {totalAssignedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('in_production')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'in_production'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span className="text-xs">In-Production</span>
            </div>
            {inProductionCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'in_production' ? 'bg-white/20 text-white' : 'bg-[#DCD0C2] text-[#2C241D]'}`}>
                {inProductionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/30 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <PackageCheck className="w-4 h-4" />
              <span className="text-xs">Completed Builds</span>
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
                    {totalAssignedCount}
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
                    {userProfile?.full_name || 'Worker'}
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
              filteredOrders.map((ord) => {
                const stageName = ord.current_stage || ord.production_stage || 'Material Sourcing';
                const percentVal = ord.progress_percentage ?? ord.progress_percent ?? 15;
                const assignedList = ord.assigned_workers || [];

                return (
                  <div key={ord.custom_order_id} className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-sm hover:shadow-md transition-shadow space-y-5">
                    {/* Top Row: Order Badge, Title & Status */}
                    <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#38A132]/15 text-[#38A132]">
                          Order #{ord.custom_order_id}
                        </span>
                        <h3 className="text-lg font-black text-[#2C241D]">{ord.furniture_type}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          ord.order_status === 'Completed' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                          ord.order_status === 'In Production' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {ord.order_status}
                        </span>
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
                        <div className="mt-0.5">{renderColorSwatchBadge(ord.color)}</div>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-[#7A6C5E]">Order Date</p>
                        <p className="font-black text-[#2C241D] mt-0.5">{ord.order_date ? ord.order_date.split('T')[0] : (ord.created_at || '2026-08-13')}</p>
                      </div>
                    </div>

                    {/* Workshop Build Progress Bar Section */}
                    {(() => {
                      const activeWorkerId = userProfile?.worker_id || userProfile?.user_id || userProfile?.id;
                      const myAsgn = ord.assigned_workers?.find(w => Number(w.worker_id) === Number(activeWorkerId));
                      const myDept = myAsgn?.specialization || userProfile?.specialization || 'Woodwork & Carpentry';
                      const isMyTaskCompleted = (myAsgn?.task_status || '').toLowerCase().includes('completed') || (ord.order_status || '').toLowerCase() === 'completed' || (ord.progress_percentage || 0) >= 100;
                      
                      let displayPercent = percentVal;
                      if (isMyTaskCompleted) {
                        displayPercent = 100;
                      } else if (myDept.toLowerCase().includes('woodwork') && percentVal >= 35) {
                        displayPercent = 100;
                      } else if (myDept.toLowerCase().includes('upholstery') && percentVal >= 70) {
                        displayPercent = 100;
                      }

                      return (
                        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[#2C241D] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#38A132]" />
                              <span>My Department Task: <strong className="text-[#38A132]">{myDept}</strong> ({stageName})</span>
                            </span>
                            <span className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${
                              displayPercent >= 100 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-[#38A132]/10 text-[#38A132] border-[#38A132]/30'
                            }`}>
                              {displayPercent >= 100 ? '100% Completed ✓' : `${displayPercent}% Completed`}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-[#EAE0D4] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#38A132] to-[#32922D] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, displayPercent))}%` }}
                            />
                          </div>
                          {ord.latest_remarks && (
                            <p className="text-[11px] text-[#6B5C4D] font-medium pt-1 italic">
                              "{ord.latest_remarks}"
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Assigned Worker Team Banner */}
                    <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Wrench className="w-4 h-4 text-[#38A132] flex-shrink-0" />
                        <span className="font-extrabold text-[#5C4E42]">Assigned Artisan Team:</span>
                        {assignedList.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {assignedList.map((w, idx) => (
                              <span key={idx} className="font-extrabold text-[#2C241D] bg-white px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs flex items-center gap-1.5">
                                <span>👷 {w.worker_name}</span>
                                {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold text-amber-800 italic bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                            Assigned to Workshop Queue
                          </span>
                        )}
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
                );
              })
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
              {modalProgressError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 font-extrabold rounded-2xl text-xs flex items-center gap-2 animate-fadeIn shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalProgressError}</span>
                </div>
              )}

              {/* Current Recorded Progress & Department Indicator */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E2D7CB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#7A6C5E] text-[11px]">My Assigned Department Stage</span>
                  <span className="font-extrabold text-xs text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded-full border border-[#38A132]/30">
                    {(() => {
                      const activeWorkerId = userProfile?.worker_id || userProfile?.user_id || userProfile?.id;
                      const myAsgn = selectedOrderForProgress.assigned_workers?.find(w => Number(w.worker_id) === Number(activeWorkerId));
                      return myAsgn?.specialization || userProfile?.specialization || 'Woodwork & Carpentry';
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#EFE7DE]">
                  <span className="font-extrabold text-[#7A6C5E] text-[11px]">Current Recorded Build Progress</span>
                  <span className="font-mono font-black text-xs text-[#2C241D]">
                    {selectedOrderForProgress.progress_percentage || 0}% Completed
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">My Department Task Progress Stage</label>
                <div className="relative">
                  <select
                    value={progressStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full py-3 pl-4 pr-10 text-xs bg-white border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all appearance-none cursor-pointer shadow-xs hover:border-[#38A132]"
                  >
                    {(() => {
                      const activeWorkerId = userProfile?.worker_id || userProfile?.user_id || userProfile?.id;
                      const myAsgn = selectedOrderForProgress.assigned_workers?.find(w => Number(w.worker_id) === Number(activeWorkerId));
                      const dept = (myAsgn?.specialization || userProfile?.specialization || 'Woodwork & Carpentry').toLowerCase();

                      if (dept.includes('upholster')) {
                        return (
                          <>
                            <option value="Foam Padding & Cushioning" className="py-2 font-bold bg-white text-[#2C241D]">1. Foam Padding & Cushion Fitting (45%)</option>
                            <option value="Fabric & Leather Covering" className="py-2 font-bold bg-white text-[#2C241D]">2. Fabric / Leather Stitching & Covering (60%)</option>
                            <option value="Upholstery & Cushioning" className="py-2 font-bold bg-white text-[#2C241D]">3. Upholstery Stage Complete (100% of Upholstery Stage / 70% total)</option>
                          </>
                        );
                      } else if (dept.includes('assembly')) {
                        return (
                          <>
                            <option value="Component & Hardware Assembly" className="py-2 font-bold bg-white text-[#2C241D]">1. Hardware & Component Assembly (80%)</option>
                            <option value="Surface Polishing & Finishing" className="py-2 font-bold bg-white text-[#2C241D]">2. Surface Polish & Quality Inspection Pass (95%)</option>
                            <option value="Completed & Ready for Dispatch" className="py-2 font-bold bg-white text-[#2C241D]">3. Assembly & Final Order Complete (100% Total Order Finished)</option>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <option value="Material Sourcing" className="py-2 font-bold bg-white text-[#2C241D]">1. Timber Selection & Material Prep (15%)</option>
                            <option value="Cutting & Joinery" className="py-2 font-bold bg-white text-[#2C241D]">2. Timber Cutting, Shaping & Joinery (25%)</option>
                            <option value="Structural Joinery & Framing" className="py-2 font-bold bg-white text-[#2C241D]">3. Woodwork & Frame Stage Complete (100% of Woodwork Stage / 35% total)</option>
                          </>
                        );
                      }
                    })()}
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
                      onChange={(e) => handlePercentChange(Number(e.target.value))}
                      className="w-12 text-right font-black text-sm text-[#38A132] bg-transparent focus:outline-none"
                    />
                    <span className="font-black text-xs text-[#38A132]">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  className="w-full accent-[#38A132] h-2 bg-[#E2D7CB] rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between mt-2 text-[10px] text-[#7A6C5E] font-bold">
                  <button type="button" onClick={() => handlePercentChange(15)} className="hover:text-[#38A132] cursor-pointer">15%</button>
                  <button type="button" onClick={() => handlePercentChange(35)} className="hover:text-[#38A132] cursor-pointer">35%</button>
                  <button type="button" onClick={() => handlePercentChange(55)} className="hover:text-[#38A132] cursor-pointer">55%</button>
                  <button type="button" onClick={() => handlePercentChange(75)} className="hover:text-[#38A132] cursor-pointer">75%</button>
                  <button type="button" onClick={() => handlePercentChange(100)} className="hover:text-[#38A132] cursor-pointer">100%</button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Technician Build Remarks / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add workshop notes, quality checks, or technical build remarks..."
                  value={progressRemarks}
                  onChange={(e) => {
                    setModalProgressError(null);
                    setProgressRemarks(e.target.value);
                  }}
                  required
                  className="w-full p-3 bg-white border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-medium focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 shadow-xs"
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
              <div className="flex items-center gap-2">
                <span className="font-bold">Upholstery / Polish Finish:</span>
                {renderColorSwatchBadge(selectedOrderForDetails.color)}
              </div>
              {selectedOrderForDetails.design_description && (
                <div className="pt-2 border-t border-[#EFE7DE]">
                  <span className="font-bold block mb-1">Design Notes:</span>
                  <p className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4E42] whitespace-pre-wrap">
                    {selectedOrderForDetails.design_description}
                  </p>
                </div>
              )}
            </div>

            {/* Assigned Workshop Workers Section */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs shadow-xs">
              <h4 className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Assigned Workshop Artisan(s)</span>
              </h4>
              {selectedOrderForDetails.assigned_workers && selectedOrderForDetails.assigned_workers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {selectedOrderForDetails.assigned_workers.map((w, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-[#2C241D] block text-xs">👷 {w.worker_name}</span>
                        {w.specialization && <span className="text-[10px] text-[#7A6C5E] block font-semibold">{w.specialization}</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
                        {w.task_status || 'Assigned'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold">
                  Assigned to Workshop Queue
                </p>
              )}
            </div>

            {/* Customer Reference Design Images */}
            {selectedOrderForDetails.reference_image && selectedOrderForDetails.reference_image.trim() && (
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-3 shadow-xs">
                <h4 className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Reference Design Photos ({parseReferenceImages(selectedOrderForDetails.reference_image).length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parseReferenceImages(selectedOrderForDetails.reference_image).map((imgUrl, i) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-2xs hover:shadow-sm transition-all flex flex-col h-40">
                      <div className="relative flex-1 bg-neutral-900/5 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => openImageInNewTab(imgUrl)}>
                        <img
                          src={imgUrl}
                          alt={`Reference Design ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="p-2 bg-white border-t border-[#E2D7CB] flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#2C241D]">Photo #{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => openImageInNewTab(imgUrl)}
                          className="text-[10px] font-extrabold text-[#38A132] hover:underline flex items-center gap-1 bg-[#38A132]/10 px-2 py-0.5 rounded cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#38A132]" /> View Full Image
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* MODAL 3: Worker Profile & Credentials */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative text-xs max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Banner */}
            <div className="flex items-center gap-3.5 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#38A132] text-white flex items-center justify-center font-black text-lg shadow-md">
                {initials}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
                  {userProfile?.specialization || 'Workshop Artisan Specialist'}
                </span>
                <h3 className="text-xl font-black text-[#2C241D] mt-0.5">{userProfile?.full_name || 'Artisan Worker'}</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">{userProfile?.email || 'worker@retailsphere.ai'}</p>
              </div>
            </div>

            {/* Profile Overview Stats / Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Artisan ID Code</span>
                <span className="font-extrabold text-xs text-[#2C241D] font-mono block">
                  ART-{(userProfile?.worker_id || userProfile?.user_id || userProfile?.id || 101)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Department Specialty</span>
                <span className="font-extrabold text-xs text-[#38A132] block">
                  {userProfile?.specialization || profileSpecialization || 'Woodwork & Carpentry'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Account Role</span>
                <span className="font-extrabold text-xs text-[#2C241D] block">
                  Workshop Craftsman / Worker
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Assigned Build Queue</span>
                <span className="font-extrabold text-xs text-[#2C241D] block">
                  {totalAssignedCount} Custom Build Tasks
                </span>
              </div>
            </div>

            {/* Editable Profile & Security Form */}
            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 text-xs">
              {passwordNotice && (
                <div className={`p-3 rounded-xl font-bold border ${passwordNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
                  {passwordNotice.text}
                </div>
              )}

              {/* Personal Info Section */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Personal & Contact Information</span>
                </h4>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Phone Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Production Department Specialization</label>
                  <select
                    value={profileSpecialization}
                    onChange={(e) => setProfileSpecialization(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  >
                    <option value="Woodwork & Carpentry">🪵 Woodwork & Carpentry</option>
                    <option value="Upholstery">🪡 Upholstery</option>
                    <option value="Assembly">🔧 Assembly & Quality Check</option>
                  </select>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Change Login Password (Optional)</span>
                </h4>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password to change"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
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
                  Save Profile & Security Details
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
