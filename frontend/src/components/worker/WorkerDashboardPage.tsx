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
  Hammer
} from 'lucide-react';
import {
  fetchCustomOrders,
  updateProductionProgress,
  CustomOrderData,
  WorkerData,
  fetchWorkers
} from '../../services/api_production';
import {
  updateUserProfile
} from '../../services/api';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orders, setOrders] = useState<CustomOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    // Load logged in user profile from localStorage
    const savedUser = localStorage.getItem('user_profile') || localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUserProfile(parsed);
      } catch {
        // fallback
      }
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.error('Failed to load assigned builds:', err);
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
    try {
      await updateProductionProgress(
        selectedOrderForProgress.custom_order_id,
        progressStage,
        progressPercent,
        progressRemarks
      );
      setSuccessNotice(`Progress updated to ${progressPercent}% (${progressStage}) for Order #${selectedOrderForProgress.custom_order_id}.`);
      setSelectedOrderForProgress(null);
      setProgressRemarks('');
      setTimeout(() => setSuccessNotice(null), 5000);
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to update build progress.');
      setTimeout(() => setErrorNotice(null), 5000);
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
      setTimeout(() => setPasswordNotice(null), 5000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err?.message || 'Failed to update password.' });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all') {
      const st = (o.order_status || '').toLowerCase();
      if (statusFilter === 'in-production' && !st.includes('production') && !st.includes('approved')) return false;
      if (statusFilter === 'completed' && !st.includes('completed')) return false;
    }
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

  return (
    <div className="relative min-h-screen text-[#2C241D] flex flex-col selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/90 via-[#F3EDE5]/85 to-[#EAE1D5]/90 pointer-events-none" />

      {/* Main Foreground Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Bar */}
        <header className="sticky top-0 z-40 bg-[#FAF7F2]/80 backdrop-blur-xl border-b border-[#E2D7CB] shadow-sm py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white flex items-center justify-center font-extrabold shadow-md">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                  <span>RetailSphere</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#48A63E]/15 text-[#48A63E] font-extrabold border border-[#48A63E]/30">
                    Artisan Worker Workspace
                  </span>
                </h1>
                <p className="text-[11px] text-[#6B5C4D] font-medium">Bespoke Workshop Build Tasks & Technical Assembly</p>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* User Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                    {(userProfile?.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-extrabold text-[#2C241D] hidden sm:inline">
                    {userProfile?.full_name || 'Artisan Craftsman'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 text-xs">
                    <div className="px-3 py-2 border-b border-[#E2D7CB]">
                      <p className="font-extrabold text-[#2C241D] truncate">{userProfile?.full_name || 'Technician'}</p>
                      <p className="text-[10px] text-[#6B5C4D] truncate">{userProfile?.email || 'worker@retailsphere.ai'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#2C241D] hover:bg-[#F3EDE5] font-bold transition-colors text-left"
                    >
                      <Key className="w-4 h-4 text-[#48A63E]" />
                      <span>Update Password</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Welcome Banner & Overview Stats */}
          <div className="ultra-glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-6">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#48A63E]/15 border border-[#48A63E]/30 text-[#48A63E] inline-flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Workshop Technician Portal</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  Welcome back, {userProfile?.full_name || 'Craftsman'}!
                </h2>
                <p className="text-xs text-[#6B5C4D] mt-1 font-semibold">
                  Track assigned custom furniture builds, view customer material specs, and update live build stage progress.
                </p>
              </div>

              <button
                onClick={() => loadDashboardData()}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-[#48A63E]" />
                <span>Refresh Builds</span>
              </button>
            </div>

            {/* Success & Error Banners */}
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

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Assigned Furniture Builds</p>
                  <p className="text-2xl font-extrabold text-[#2C241D] mt-1">{totalAssignedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F3EDE5] text-[#48A63E] flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">In-Production Builds</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{inProductionCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Completed Builds</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{completedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PackageCheck className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Builds Directory Section */}
          <div className="ultra-glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#48A63E]" />
                <h3 className="text-lg font-extrabold text-[#2C241D]">Assigned Workshop Builds</h3>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search furniture type, material, order #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                >
                  <option value="all">All Statuses</option>
                  <option value="in-production">In Production</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#48A63E] animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#6B5C4D]">Loading assigned workshop builds...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 px-4 text-center bg-white rounded-3xl border border-[#E2D7CB] space-y-3">
                <Wrench className="w-8 h-8 text-[#8C7C6D] mx-auto" />
                <h4 className="font-extrabold text-base text-[#2C241D]">No assigned builds found</h4>
                <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                  {searchQuery ? `No builds match "${searchQuery}".` : 'Assigned custom furniture build orders will appear here for stage updates.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map((ord) => (
                  <div key={ord.custom_order_id} className="bg-white p-5 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-4 hover:shadow-md transition-shadow relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#48A63E]/15 border border-[#48A63E]/30 text-[#48A63E]">
                          ORDER #{ord.custom_order_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          (ord.order_status || '').toLowerCase().includes('completed')
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {ord.order_status || 'In Production'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-[#2C241D]">{ord.furniture_type}</h4>
                      <p className="text-xs text-[#6B5C4D] font-medium mt-0.5">Client: {ord.customer_name || 'Customer'}</p>

                      <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] space-y-1 text-xs mt-3">
                        <p><span className="font-extrabold text-[#7A6C5E]">Primary Material:</span> <span className="font-bold text-[#2C241D]">{ord.material}</span></p>
                        <p><span className="font-extrabold text-[#7A6C5E]">Dimensions:</span> <span className="font-bold text-[#2C241D]">{ord.dimensions}</span></p>
                        <p><span className="font-extrabold text-[#7A6C5E]">Upholstery / Finish:</span> <span className="font-bold text-[#2C241D]">{ord.color}</span></p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetails(ord)}
                        className="px-3 py-2 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold text-xs hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>View Specs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForProgress(ord);
                          setProgressStage('Structural Joinery & Framing');
                          setProgressPercent(50);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Update Stage</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: Update Build Stage & Progress */}
      {selectedOrderForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForProgress(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Update Build Progress</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForProgress.custom_order_id} • {selectedOrderForProgress.furniture_type}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProgressSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Current Workshop Stage</label>
                <select
                  value={progressStage}
                  onChange={(e) => setProgressStage(e.target.value)}
                  className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Material Sourcing">Material Sourcing</option>
                  <option value="Structural Joinery & Framing">Structural Joinery & Framing</option>
                  <option value="Upholstery & Cushioning">Upholstery & Cushioning</option>
                  <option value="Surface Lacquering & Finishing">Surface Lacquering & Finishing</option>
                  <option value="Quality Assurance & Packaging">Quality Assurance & Packaging</option>
                  <option value="Completed & Ready for Dispatch">Completed & Ready for Dispatch</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-[#2C241D]">Progress Percentage</label>
                  <span className="font-extrabold text-[#48A63E]">{progressPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="w-full accent-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Technician Build Remarks / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add workshop notes or technical details (e.g. Frame completed, moving to upholstery...)"
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full p-3 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForProgress(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProgress}
                  className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProgress ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isUpdatingProgress ? 'Saving...' : 'Confirm Update'}</span>
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
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#48A63E]/15 border border-[#48A63E]/30 text-[#48A63E]">
                  ORDER #{selectedOrderForDetails.custom_order_id}
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-0.5">{selectedOrderForDetails.furniture_type}</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2">
              <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px]">Client Information</h4>
              <p><span className="font-bold">Customer Name:</span> {selectedOrderForDetails.customer_name}</p>
              <p><span className="font-bold">Contact Email:</span> {selectedOrderForDetails.customer_email || 'N/A'}</p>
              <p><span className="font-bold">Phone Contact:</span> {selectedOrderForDetails.customer_phone || 'N/A'}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2">
              <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px]">Technical Specs</h4>
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
                className="px-5 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold"
              >
                Close Specs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Worker Password */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Update Password</h3>
                <p className="text-xs text-[#7A6C5E]">Change login password for {userProfile?.email}</p>
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
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold shadow-md shadow-[#48A63E]/20"
                >
                  Save New Password
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
