import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Users,
  Sliders,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  DollarSign,
  Layers,
  ChevronRight,
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
  RefreshCw
} from 'lucide-react';
import {
  fetchCustomOrders,
  updateOrderStatus,
  toggleLockOrderSpecifications,
  fetchWorkers,
  addWorker,
  assignWorkerTask,
  updateProductionProgress,
  CustomOrderData,
  WorkerData
} from '../../services/api_production';
import {
  fetchQueriesFromDB,
  createStaffQueryInDB,
  fetchNotificationsFromDB,
  updateUserProfile
} from '../../services/api';
import { StaffQuery, addStaffQuery } from '../../utils/staffQueriesStorage';

export const ProductionStaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<CustomOrderData[]>([]);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'approvals' | 'assignments' | 'workers' | 'queries'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [approvalFilter, setApprovalFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Direct Assignment Form State
  const [assignFormOrderId, setAssignFormOrderId] = useState<number | ''>('');
  const [assignFormWorkerId, setAssignFormWorkerId] = useState<number | ''>('');
  const [assignFormNotes, setAssignFormNotes] = useState<string>('');

  // Notifications & User Menu Dropdown State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Add Worker Modal State
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerSpec, setNewWorkerSpec] = useState('Timber Joinery & Hardwood');

  // Staff Profile Modal & Password Update State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [newQueryCategory, setNewQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('Email Change Request');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modals state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<CustomOrderData | null>(null);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<CustomOrderData | null>(null);
  const [approvalPrice, setApprovalPrice] = useState<string>('');
  const [approvalRemarks, setApprovalRemarks] = useState<string>('');

  const [selectedOrderForWorker, setSelectedOrderForWorker] = useState<CustomOrderData | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<CustomOrderData | null>(null);
  const [progressStage, setProgressStage] = useState<string>('Material Sourcing');
  const [progressPercent, setProgressPercent] = useState<number>(30);
  const [progressRemarks, setProgressRemarks] = useState<string>('');

  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loadNotifs = async () => {
    try {
      const dbNotifs = await fetchNotificationsFromDB();
      setNotifications(dbNotifs || []);
    } catch {
      setNotifications([]);
    }
  };

  const loadQueries = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      setStaffQueries(dbQueries || []);
    } catch {
      setStaffQueries([]);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orderList, workerList] = await Promise.all([
        fetchCustomOrders('All', true),
        fetchWorkers()
      ]);
      setOrders(orderList);
      setWorkers(workerList);
    } catch (err) {
      console.error('Error loading production data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
    loadQueries();
    loadData();
    window.addEventListener('custom-orders-updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('custom-orders-updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuerySubject.trim() || !newQueryMessage.trim()) return;

    const payload = {
      staff_name: userProfile?.full_name || 'Production Staff Member',
      staff_email: userProfile?.email || 'production.staff@retailsphere.com',
      category: newQueryCategory,
      subject: newQuerySubject,
      message: newQueryMessage
    };

    try {
      const created = await createStaffQueryInDB(payload);
      setStaffQueries((prev) => [created, ...prev]);
    } catch (err) {
      console.warn('Failed to post query to DB, fallback locally:', err);
      const created = addStaffQuery({
        staffName: payload.staff_name,
        staffEmail: payload.staff_email,
        category: payload.category as any,
        subject: payload.subject,
        message: payload.message
      });
      setStaffQueries((prev) => [created, ...prev]);
    }

    setNewQuerySubject('');
    setNewQueryMessage('');
    setSuccessNotice('Your request has been submitted to Admin!');
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    let userFullName = 'Production Staff';
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        userFullName = parsed.full_name || parsed.name || 'Production Staff';
      }
    } catch (e) {}

    try {
      await updateUserProfile({
        full_name: userFullName,
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordNotice({ type: 'success', text: 'Password updated successfully in database!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordNotice(null), 5000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password in database.' });
    }
  };

  // Actions
  const handleOpenPriceModal = (ord: CustomOrderData) => {
    const isPaid = ord.payment_status === 'Paid' || ord.order_status === 'Paid' || ord.order_status === 'In Production' || ord.order_status === 'Completed';
    if (isPaid) {
      setSuccessNotice(`Payment is complete for Order #${ord.custom_order_id}. Price editing is locked.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }
    setSelectedOrderForReview(ord);
    setApprovalPrice(ord.estimated_price ? ord.estimated_price.toString() : '');
    setApprovalRemarks(ord.latest_remarks || '');
  };

  const handleSavePriceOnly = async () => {
    if (!selectedOrderForReview) return;
    const priceNum = parseFloat(approvalPrice) || 0;
    const nextStatus = selectedOrderForReview.order_status === 'Pending' ? 'Approved' : selectedOrderForReview.order_status;
    await updateOrderStatus(selectedOrderForReview.custom_order_id, nextStatus, priceNum, approvalRemarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Price quote ₹${priceNum.toLocaleString('en-IN')} saved for Order #${selectedOrderForReview.custom_order_id}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleApproveOrder = async () => {
    if (!selectedOrderForReview) return;
    const priceNum = parseFloat(approvalPrice) || 0;
    await updateOrderStatus(selectedOrderForReview.custom_order_id, 'Approved', priceNum, approvalRemarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Customization Order #${selectedOrderForReview.custom_order_id} approved and quote updated.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleToggleLock = async (ord: CustomOrderData) => {
    await toggleLockOrderSpecifications(ord.custom_order_id);
    loadData();
  };

  const parseOrderSpecDetails = (ord: CustomOrderData) => {
    const fields: { label: string; value: string }[] = [
      { label: 'Furniture Type', value: ord.furniture_type },
      { label: 'Custom Dimensions', value: ord.dimensions },
      { label: 'Primary Timber / Material', value: ord.material },
      { label: 'Color / Polish Finish', value: ord.color || 'Natural Finish' }
    ];

    if (ord.design_description) {
      const desc = ord.design_description;
      const aspectsMatch = desc.match(/Aspects:\s*\[(.*?)\]/);
      if (aspectsMatch && aspectsMatch[1]) {
        const pairs = aspectsMatch[1].split(';');
        pairs.forEach(pair => {
          const [k, v] = pair.split(':').map(s => s?.trim());
          if (k && v) {
            const formattedLabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            fields.push({ label: formattedLabel, value: v });
          }
        });
      }

      const reqMatch = desc.match(/Special Requirements:\s*(.*)/i);
      if (reqMatch && reqMatch[1] && reqMatch[1].trim()) {
        fields.push({ label: 'Special Customer Requirements', value: reqMatch[1].trim() });
      } else if (!aspectsMatch && desc.trim()) {
        fields.push({ label: 'Custom Notes', value: desc.trim() });
      }
    }

    return fields;
  };

  const handleRejectOrder = async () => {
    if (!selectedOrderForReview) return;
    await updateOrderStatus(selectedOrderForReview.custom_order_id, 'Rejected', undefined, approvalRemarks);
    setSelectedOrderForReview(null);
    setApprovalRemarks('');
    loadData();
  };

  const handleAssignWorkerSubmit = async () => {
    if (!selectedOrderForWorker || !selectedWorkerId) return;
    await assignWorkerTask(selectedOrderForWorker.custom_order_id, selectedWorkerId);
    setSelectedOrderForWorker(null);
    setSelectedWorkerId(null);
    setSuccessNotice(`Technician assigned to Order #${selectedOrderForWorker.custom_order_id}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleDirectAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFormOrderId || !assignFormWorkerId) return;
    await assignWorkerTask(Number(assignFormOrderId), Number(assignFormWorkerId));
    const targetW = workers.find(w => w.worker_id === Number(assignFormWorkerId));
    setAssignFormOrderId('');
    setAssignFormWorkerId('');
    setAssignFormNotes('');
    setSuccessNotice(`Assigned artisan ${targetW?.full_name || 'Worker'} to Order #${assignFormOrderId}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleUpdateProgressSubmit = async () => {
    if (!selectedOrderForProgress) return;
    await updateProductionProgress(selectedOrderForProgress.custom_order_id, progressStage, progressPercent, progressRemarks);
    setSelectedOrderForProgress(null);
    setProgressRemarks('');
    setSuccessNotice(`Production stage updated for Order #${selectedOrderForProgress.custom_order_id}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerEmail) return;
    await addWorker(newWorkerName, newWorkerEmail, newWorkerPhone, newWorkerSpec);
    setNewWorkerName('');
    setNewWorkerEmail('');
    setNewWorkerPhone('');
    setIsAddWorkerModalOpen(false);
    setSuccessNotice(`Artisan worker ${newWorkerName} added to the workshop roster.`);
    setTimeout(() => setSuccessNotice(null), 6000);
    loadData();
  };

  const isPaidCustomOrder = (o: CustomOrderData) => {
    const pStatus = (o.payment_status || '').toLowerCase().trim();
    const oStatus = (o.order_status || '').toLowerCase().trim();
    return pStatus === 'paid' || oStatus === 'paid' || oStatus === 'in production' || oStatus === 'completed';
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.furniture_type.toLowerCase().includes(query) ||
      o.customer_name.toLowerCase().includes(query) ||
      o.material.toLowerCase().includes(query) ||
      o.custom_order_id.toString().includes(query)
    );
  });

  const pendingCount = orders.filter(o => o.order_status === 'Pending').length;
  const inProductionCount = orders.filter(o => o.order_status === 'In Production' || o.order_status === 'Approved').length;
  const completedCount = orders.filter(o => o.order_status === 'Completed').length;

  return (
    <div className="relative min-h-screen text-[#2C241D] flex selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* LEFT SIDEBAR NAVIGATION PANEL */}
      <aside className="w-72 flex-shrink-0 min-h-screen hidden md:block border-r border-[#D8CCBD] bg-[#E5DCD0]/80 backdrop-blur-xl p-6 space-y-8 relative z-20 shadow-sm">
        {/* Logo */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-1.5">
            <span>RetailSphere</span>
            <span className="text-[#38A132]">AI</span>
          </h2>
          <span className="text-[11px] font-extrabold text-[#38A132] uppercase tracking-[0.2em] block font-mono">
            PRODUCTION STAFF PORTAL
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="space-y-2.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'orders'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4.5 h-4.5" />
              <span className="text-sm">Custom Orders</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'approvals'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">Custom Approvals</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'assignments'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">Assign Tasks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'workers'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4.5 h-4.5" />
              <span className="text-sm">Workers Directory</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'queries'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4.5 h-4.5" />
              <span className="text-sm">Queries & Requests</span>
            </div>
          </button>
        </nav>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#2C241D]">Production Studio</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'orders' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'approvals' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Approvals
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'assignments' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'workers' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Workers
            </button>
          </div>
        </div>

        <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* Success Notice */}
            {successNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {successNotice}
                </div>
                <button onClick={() => setSuccessNotice(null)} className="text-[#48A63E] hover:text-[#3D9134] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Page Top Header */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {activeTab === 'orders' && 'Custom Furniture Orders'}
                  {activeTab === 'approvals' && 'Customization Approvals & Quote Center'}
                  {activeTab === 'assignments' && 'Artisan Task Assignments Hub'}
                  {activeTab === 'workers' && 'Artisan Technicians Directory'}
                  {activeTab === 'queries' && 'Production Staff Queries & Admin Request Center'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'orders' && 'Review custom quotes, assign skilled craftsmen, and update workshop build stages.'}
                  {activeTab === 'approvals' && 'Review pending custom furniture designs, verify material specifications, set pricing quotes, and approve or reject customer requests.'}
                  {activeTab === 'assignments' && 'Assign skilled workshop craftsmen and technicians to approved custom furniture builds, specify craft stages, and track active task distribution.'}
                  {activeTab === 'workers' && 'Manage workshop craftsmen, specializations, and active assigned furniture builds.'}
                  {activeTab === 'queries' && 'Submit email change requests or system queries directly to system Admin.'}
                </p>
              </div>

              {/* Top Right Controls */}
              <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserMenuOpen(false);
                    }}
                    className="relative p-2 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] transition-all shadow-xs flex items-center justify-center"
                    title="System Notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#48A63E]" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                        <span className="font-extrabold text-xs text-[#2C241D]">System Notifications</span>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                            className="text-[10px] font-bold text-[#48A63E] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-[#8C7C6D]">
                            <p className="text-xs font-extrabold">No new notifications</p>
                            <p className="text-[10px] text-[#A09080]">System notifications from PostgreSQL will appear here</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl border transition-colors ${
                                n.unread ? 'bg-[#F3EDE5] border-[#48A63E]/40 font-bold' : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#6B5C4D]'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="font-extrabold text-[#2C241D]">{n.title}</span>
                                <span className="text-[10px] text-[#8C7C6D]">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-[#5C4E42] leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Staff Name Dropdown Pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {(userProfile?.full_name || 'Production Lead').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-extrabold text-[#2C241D]">
                      {userProfile?.full_name || 'Production Lead'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left"
                      >
                        <User className="w-4 h-4 text-[#48A63E]" />
                        <span>View Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Stat Cards (Shown ONLY on Custom Orders section) */}
            {activeTab === 'orders' && (
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2.5 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between text-[#8C8275]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Pending Review</span>
                    <Clock className="w-4 h-4 text-[#D97706]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{pendingCount} Orders</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#B4690E] bg-[#FDF3E7] px-2.5 py-0.5 rounded-full border border-[#FDE6D2] inline-block">
                      Requires staff quote
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2.5 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between text-[#8C8275]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">In Production</span>
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{inProductionCount} Builds</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#1E40AF] bg-[#EBF5FF] px-2.5 py-0.5 rounded-full border border-[#DBEAFE] inline-block">
                      Active workshop builds
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2.5 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between text-[#8C8275]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Artisan Workers</span>
                    <Users className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{workers.length} Technicians</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                      Active craftsmen
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2.5 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between text-[#8C8275]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Completed Builds</span>
                    <PackageCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{completedCount} Orders</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                      Ready for dispatch
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: Custom Orders Management */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* Search & Filter Header Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search order specs or client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E] shadow-xs"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold text-[#7A6C5E]">Filter Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs font-bold text-[#2C241D] bg-white border border-[#E2D7CB] rounded-xl py-2 px-3 focus:outline-none focus:border-[#48A63E] shadow-xs"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="In Production">In Production</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {filteredOrders.filter(isPaidCustomOrder).length > 0 ? (
                  filteredOrders
                    .filter(isPaidCustomOrder)
                    .map((ord) => (
                    <div
                      key={ord.custom_order_id}
                      className="ultra-glass-card rounded-3xl p-6 shadow-xl border border-[#E2D7CB] bg-white/85 text-[#2C241D] space-y-4 hover:border-[#48A63E]/50 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        {/* Order Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-extrabold text-[#48A63E] px-2.5 py-0.5 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/30">
                              ORDER #{ord.custom_order_id}
                            </span>

                            <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full ${
                              ord.order_status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              ord.order_status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                              ord.order_status === 'In Production' ? 'bg-emerald-100 text-emerald-800' :
                              ord.order_status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {ord.order_status}
                            </span>
                          </div>

                          <h3 className="text-lg font-extrabold text-[#2C241D]">
                            {ord.furniture_type}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#6B5C4D]">
                            <div><span className="font-bold">Client:</span> {ord.customer_name}</div>
                            <div><span className="font-bold">Dimensions:</span> {ord.dimensions}</div>
                            <div><span className="font-bold">Material:</span> {ord.material}</div>
                          </div>
                        </div>

                        {/* Order Actions: 1. View Specs, 2. Just a Lock Sign, 3. Edit Price */}
                        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
                          {/* 1. View Specs */}
                          <button
                            onClick={() => setSelectedOrderForDetails(ord)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Specs</span>
                          </button>

                          {/* 2. Lock / Unlock Sign Toggle (Approved or Priced requests are ALWAYS locked) */}
                          {!(ord.is_locked || ord.order_status === 'Approved' || ord.order_status === 'In Production' || ord.order_status === 'Completed' || (ord.estimated_price && ord.estimated_price > 0)) ? (
                            <button
                              onClick={() => handleToggleLock(ord)}
                              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                              title="Specs Unlocked. Click to Lock Specs (removes edit option on customer dashboard)."
                            >
                              <Unlock className="w-4 h-4 text-amber-600" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs opacity-90 cursor-not-allowed"
                              title="Specifications Locked (Edit option removed from customer dashboard)."
                            >
                              <Lock className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}

                          {/* 3. Edit Price */}
                          {!(ord.payment_status === 'Paid' || ord.order_status === 'Paid' || ord.order_status === 'In Production' || ord.order_status === 'Completed') ? (
                            <button
                              onClick={() => handleOpenPriceModal(ord)}
                              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <DollarSign className="w-4 h-4 text-amber-600" />
                              <span>{ord.estimated_price ? `Edit Price (₹${ord.estimated_price.toLocaleString()})` : 'Set Price Quote'}</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1.5" title="Payment completed by customer. Price editing is locked.">
                              <Lock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Price Locked (₹{ord.estimated_price ? ord.estimated_price.toLocaleString() : 0})</span>
                            </span>
                          )}

                          {/* ASSIGN WORKER & UPDATE STAGE AVAILABLE ONLY WHEN PAYMENT IS MADE! */}
                          {(ord.payment_status === 'Paid' || ord.order_status === 'Paid' || ord.order_status === 'In Production' || ord.order_status === 'Completed') && (
                            <>
                              <button
                                onClick={() => setSelectedOrderForWorker(ord)}
                                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{ord.assigned_workers && ord.assigned_workers.length > 0 ? 'Reassign Worker' : 'Assign Worker'}</span>
                              </button>

                              <button
                                onClick={() => setSelectedOrderForProgress(ord)}
                                className="px-3.5 py-2 rounded-xl bg-[#38A132]/10 hover:bg-[#38A132]/20 text-[#38A132] border border-[#38A132]/30 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Update Build Stage</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-[#E2D7CB] text-center space-y-3">
                    <Sliders className="w-10 h-10 text-[#A09080] mx-auto" />
                    <h4 className="font-extrabold text-base text-[#2C241D]">No Custom Orders Found</h4>
                    <p className="text-xs text-[#7A6C5E]">No furniture specs matched your current search filters.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CUSTOMIZATION APPROVALS */}
            {activeTab === 'approvals' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[#7A6C5E]">Filter Status:</span>
                    {(['Pending', 'Approved', 'Rejected', 'Cancelled', 'All'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setApprovalFilter(st as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                          approvalFilter === st
                            ? 'bg-[#48A63E] text-white shadow-xs'
                            : 'bg-white border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F5ECE1]'
                        }`}
                      >
                        {st === 'Pending' ? `Pending Review (${pendingCount})` : st}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search order ID, client, material..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {orders
                    .filter(o => !isPaidCustomOrder(o))
                    .filter((o) => (approvalFilter === 'All' ? true : o.order_status === approvalFilter))
                    .filter((o) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        o.furniture_type.toLowerCase().includes(q) ||
                        o.customer_name.toLowerCase().includes(q) ||
                        o.material.toLowerCase().includes(q) ||
                        o.custom_order_id.toString().includes(q)
                      );
                    })
                    .length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-[#E2D7CB] text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-[#48A63E] mx-auto" />
                      <h4 className="font-extrabold text-base text-[#2C241D]">No Customizations Found</h4>
                      <p className="text-xs text-[#7A6C5E]">All pending custom quotes have been reviewed and approved!</p>
                    </div>
                  ) : (
                    orders
                      .filter(o => !isPaidCustomOrder(o))
                      .filter((o) => (approvalFilter === 'All' ? true : o.order_status === approvalFilter))
                      .filter((o) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          o.furniture_type.toLowerCase().includes(q) ||
                          o.customer_name.toLowerCase().includes(q) ||
                          o.material.toLowerCase().includes(q) ||
                          o.custom_order_id.toString().includes(q)
                        );
                      })
                      .map((ord) => (
                        <div key={ord.custom_order_id} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-xl">
                                Order #{ord.custom_order_id}
                              </span>
                              <h3 className="font-extrabold text-sm sm:text-base text-[#2C241D]">{ord.furniture_type}</h3>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold self-start sm:self-auto ${
                              ord.order_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              ord.order_status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {ord.order_status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#6B5C4D]">
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Client Name</span>
                              <span className="font-extrabold text-[#2C241D]">{ord.customer_name}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Material Finish</span>
                              <span className="font-bold text-[#2C241D]">{ord.material}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Quoted Price</span>
                              <span className="font-extrabold text-[#48A63E]">{ord.estimated_price ? `₹${ord.estimated_price.toLocaleString('en-IN')}` : 'Quote Pending'}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Order Date</span>
                              <span className="font-bold text-[#2C241D]">{ord.order_date || 'Standard Build'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EFE7DE]">
                            <button
                              onClick={() => setSelectedOrderForDetails(ord)}
                              className="px-3.5 py-2 rounded-xl bg-[#F5ECE1] hover:bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#6B5C4D]" />
                              <span>View Specs</span>
                            </button>

                            <button
                              onClick={() => handleOpenPriceModal(ord)}
                              className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Review & Quote Price</span>
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ARTISAN TASK ASSIGNMENTS HUB */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Direct Assignment Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-3xl border-2 border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
                      <UserPlus className="w-5 h-5 text-[#48A63E]" />
                      <h3 className="font-extrabold text-base text-[#2C241D]">Assign Artisan to Custom Order</h3>
                    </div>

                    <form onSubmit={handleDirectAssignSubmit} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-[#6B5C4D] mb-1">Select Approved Furniture Order</label>
                        <select
                          value={assignFormOrderId}
                          onChange={(e) => setAssignFormOrderId(Number(e.target.value))}
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                        >
                          <option value="">-- Choose Order to Assign --</option>
                          {orders
                            .filter(isPaidCustomOrder)
                            .map((o) => (
                              <option key={o.custom_order_id} value={o.custom_order_id}>
                                #{o.custom_order_id} - {o.furniture_type} ({o.customer_name})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#6B5C4D] mb-1">Assign Skilled Craftsman / Technician</label>
                        <select
                          value={assignFormWorkerId}
                          onChange={(e) => setAssignFormWorkerId(Number(e.target.value))}
                          required
                          className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                        >
                          <option value="">-- Select Artisan Worker --</option>
                          {workers.map((w) => (
                            <option key={w.worker_id} value={w.worker_id}>
                              {w.full_name} ({w.specialization || 'Craft Specialist'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#6B5C4D] mb-1">Task Instructions & Craft Notes</label>
                        <textarea
                          placeholder="Specific jointing, finish grade, or timber handling instructions..."
                          value={assignFormNotes}
                          onChange={(e) => setAssignFormNotes(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Confirm Artisan Task Assignment</span>
                      </button>
                    </form>
                  </div>

                  {/* Active Worker Assignments Roster Feed */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                      <div>
                        <h3 className="font-extrabold text-base text-[#2C241D]">Active Artisan Workshop Distribution</h3>
                        <p className="text-xs text-[#7A6C5E]">Overview of active technician assignments across workshop custom builds</p>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {orders.filter(isPaidCustomOrder).length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-[#E2D7CB] text-center space-y-2">
                          <Users className="w-8 h-8 text-[#A09080] mx-auto" />
                          <p className="font-extrabold text-sm text-[#2C241D]">No Active Paid Build Tasks</p>
                          <p className="text-xs text-[#7A6C5E]">Approved customer orders will appear here for craftsman allocation once paid.</p>
                        </div>
                      ) : (
                        orders.filter(isPaidCustomOrder).map((ord) => {
                          const assignedWorker = ord.assigned_workers && ord.assigned_workers.length > 0 ? ord.assigned_workers[0] : null;
                          return (
                            <div key={ord.custom_order_id} className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-extrabold text-[#48A63E]">Order #{ord.custom_order_id}</span>
                                  <h4 className="font-extrabold text-sm text-[#2C241D]">{ord.furniture_type}</h4>
                                </div>
                                <p className="text-xs text-[#6B5C4D]">
                                  <span className="font-bold">Client:</span> {ord.customer_name} | <span className="font-bold">Material:</span> {ord.material}
                                </p>
                                <div className="flex items-center gap-2 pt-1 text-[11px]">
                                  <span className="font-bold text-[#7A6C5E]">Assigned Artisan:</span>
                                  {assignedWorker ? (
                                    <span className="font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md">
                                      {assignedWorker.worker_name}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                                      Unassigned
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedOrderForWorker(ord);
                                  setSelectedWorkerId(assignedWorker ? assignedWorker.worker_id : null);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-[#F5ECE1] hover:bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-[#48A63E]" />
                                <span>{assignedWorker ? 'Reassign Worker' : 'Assign Worker'}</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ARTISAN TECHNICIANS DIRECTORY */}
            {activeTab === 'workers' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search worker, email, specialty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddWorkerModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#48A63E]/20 transition-all whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Worker</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workers
                    .filter((w) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        w.full_name.toLowerCase().includes(q) ||
                        w.email.toLowerCase().includes(q) ||
                        (w.specialization && w.specialization.toLowerCase().includes(q)) ||
                        (w.phone && w.phone.toLowerCase().includes(q))
                      );
                    })
                    .map((worker) => (
                    <div key={worker.worker_id} className="bg-white p-5 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                          {(worker.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#2C241D]">{worker.full_name}</h4>
                          <p className="text-[11px] text-[#48A63E] font-bold">{worker.specialization || 'Craft Specialist'}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#6B5C4D]">
                        <p><span className="font-bold">Email:</span> {worker.email}</p>
                        <p><span className="font-bold">Phone:</span> {worker.phone || 'N/A'}</p>
                        <p>
                          <span className="font-bold">Status:</span>{' '}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${worker.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {worker.status ? 'Active Technician' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: STAFF QUERIES & ADMIN REQUESTS */}
            {activeTab === 'queries' && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Submit New Query Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border-2 border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
                      <MessageSquare className="w-5 h-5 text-[#48A63E]" />
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Submit New Admin Request</h4>
                    </div>

                    <form onSubmit={handleSubmitQuery} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block font-extrabold text-[#2C241D] mb-1">Request Category</label>
                        <select
                          value={newQueryCategory}
                          onChange={(e) => setNewQueryCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-extrabold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                        >
                          <option value="Email Change Request">Email Change Request</option>
                          <option value="Role & Access Permission">Role & Access Permission</option>
                          <option value="General Query">General Query</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-extrabold text-[#2C241D] mb-1">Request Subject</label>
                        <input
                          type="text"
                          placeholder="e.g. Update login email to nimal.k.retail@retailsphere.com"
                          value={newQuerySubject}
                          onChange={(e) => setNewQuerySubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Explanation</label>
                        <textarea
                          placeholder="Please specify why this change or access permission is required..."
                          value={newQueryMessage}
                          onChange={(e) => setNewQueryMessage(e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Request to Admin</span>
                      </button>
                    </form>
                  </div>

                  {/* Live Queries & Responses Feed */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#E2D7CB] pb-3 gap-2">
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Submitted Requests & Admin Feedback Feed</h4>
                      <div className="relative w-full sm:w-56">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search request subject..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    </div>

                    {staffQueries.length === 0 ? (
                      <div className="bg-[#FAF7F2] p-8 rounded-2xl border-2 border-dashed border-[#E2D7CB] text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-[#A09080] mx-auto" />
                        <p className="font-extrabold text-sm text-[#2C241D]">No Admin Requests Available</p>
                        <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto">
                          You haven't submitted any email change requests or queries yet. Use the form on the left to reach out to system Admin.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                        {staffQueries
                          .filter((q) => {
                            if (!searchQuery.trim()) return true;
                            const sq = searchQuery.toLowerCase();
                            return (
                              q.subject.toLowerCase().includes(sq) ||
                              q.category.toLowerCase().includes(sq) ||
                              (q.message && q.message.toLowerCase().includes(sq))
                            );
                          })
                          .map((query) => (
                          <div key={query.id} className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#48A63E]/10 text-[#48A63E] mb-1">
                                  {query.category}
                                </span>
                                <h5 className="font-extrabold text-sm text-[#2C241D]">{query.subject}</h5>
                                <p className="text-[11px] text-[#7A6C5E] font-medium">{query.createdAt}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                query.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                query.status === 'In Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                query.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}>
                                {query.status}
                              </span>
                            </div>

                            <p className="text-xs text-[#5C4E42] bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE7DE] leading-relaxed">
                              {query.message}
                            </p>

                            {query.adminResponse ? (
                              <div className="p-3.5 rounded-xl bg-[#48A63E]/10 border border-[#48A63E]/30 space-y-1 text-xs">
                                <div className="flex items-center gap-1.5 text-[#3D9134] font-extrabold">
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Admin Response & Feedback ({query.updatedAt || 'Recently'}):</span>
                                </div>
                                <p className="text-[#2C241D] font-medium leading-relaxed italic">
                                  "{query.adminResponse}"
                                </p>
                              </div>
                            ) : (
                              <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Waiting for Admin review and response...</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MODAL 1: Add New Worker (Inside Workers Directory tab, similar to adding products in Retail) */}
      {isAddWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-lg space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddWorkerModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1.5 rounded-full bg-[#EAE0D4] hover:bg-[#DED2C2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] font-extrabold shadow-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#2C241D] tracking-tight">Register New Artisan Worker</h3>
                <p className="text-xs font-bold text-[#6B5C4D]">Add skilled craftsmen and technicians to the workshop roster</p>
              </div>
            </div>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Worker Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master James Miller"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="james.m@retailsphere.ai"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-948"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Craft Specialization</label>
                <select
                  value={newWorkerSpec}
                  onChange={(e) => setNewWorkerSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Timber Joinery & Hardwood">Timber Joinery & Hardwood</option>
                  <option value="Bouclé & Leather Upholstery">Bouclé & Leather Upholstery</option>
                  <option value="Hand Lacquer & Metal Inlays">Hand Lacquer & Metal Inlays</option>
                  <option value="Ergonomic Structural Framing">Ergonomic Structural Framing</option>
                  <option value="Quality Inspection & QC">Quality Inspection & QC</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Confirm & Save Worker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detailed Order Specifications */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrderForDetails(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#38A132] to-[#32922D] text-white flex items-center justify-center font-extrabold shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 border border-[#38A132]/40 text-[#38A132]">
                  ORDER #{selectedOrderForDetails.custom_order_id}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">{selectedOrderForDetails.furniture_type}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">Client: {selectedOrderForDetails.customer_name}</p>
              </div>
            </div>

            {/* SEPARATED PRODUCT FIELDS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Product Specifications & Parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {parseOrderSpecDetails(selectedOrderForDetails).map((field, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">{field.label}</span>
                    <span className="font-extrabold text-xs text-[#2C241D] block">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* STATUS & QUOTATION SUMMARY */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Order Status</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                  {selectedOrderForDetails.order_status}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Quoted Price</span>
                <span className="font-extrabold text-sm text-[#38A132] mt-0.5 block">
                  {selectedOrderForDetails.estimated_price ? `₹${selectedOrderForDetails.estimated_price.toLocaleString()}` : 'Pending Quote'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Assigned Technician</span>
                <span className="font-extrabold text-xs text-[#2C241D] mt-0.5 block">
                  {selectedOrderForDetails.assigned_workers && selectedOrderForDetails.assigned_workers.length > 0
                    ? selectedOrderForDetails.assigned_workers[0].worker_name
                    : 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#E2D7CB] pt-4">
              <button
                onClick={() => setSelectedOrderForDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Set/Update Product Price & Approval */}
      {selectedOrderForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForReview(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Set / Edit Product Price</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForReview.custom_order_id} • Client: {selectedOrderForReview.customer_name}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <p><span className="font-bold text-[#7A6C5E]">Furniture Type:</span> {selectedOrderForReview.furniture_type}</p>
              <p><span className="font-bold text-[#7A6C5E]">Dimensions:</span> {selectedOrderForReview.dimensions}</p>
              <p><span className="font-bold text-[#7A6C5E]">Material:</span> {selectedOrderForReview.material}</p>
              {selectedOrderForReview.estimated_price ? (
                <p><span className="font-bold text-[#7A6C5E]">Current Quote:</span> <strong className="text-[#38A132]">₹{selectedOrderForReview.estimated_price.toLocaleString()}</strong></p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#2C241D] mb-1">
                Enter Product Price Quote (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 145000"
                value={approvalPrice}
                onChange={(e) => setApprovalPrice(e.target.value)}
                required
                className="w-full py-3 px-4 text-base bg-white border-2 border-[#E2D7CB] rounded-xl text-[#2C241D] font-extrabold focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#2C241D] mb-1">
                Staff Remarks / Technical Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter pricing details or technical notes..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedOrderForReview(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApproveOrder}
                className="bg-[#38A132] hover:bg-[#32922D] px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Save Price</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Assign Worker */}
      {selectedOrderForWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForWorker(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-extrabold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Assign Artisan Technician</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForWorker.custom_order_id}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#2C241D] mb-2">Select Worker</label>
              <select
                value={selectedWorkerId || ''}
                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
              >
                <option value="">-- Choose Artisan Worker --</option>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.full_name} ({w.specialization || 'General Technician'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForWorker(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAssignWorkerSubmit}
                disabled={!selectedWorkerId}
                className="bg-[#48A63E] disabled:opacity-50 hover:bg-[#3D9134] px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#48A63E]/20"
              >
                Assign Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Update Build Stage & Progress */}
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
                <h3 className="text-lg font-extrabold text-[#2C241D]">Update Workshop Build Stage</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForProgress.custom_order_id}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
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
                <label className="block font-extrabold text-[#2C241D] mb-1">Progress Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Notes on current build progress..."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForProgress(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateProgressSubmit}
                className="bg-[#48A63E] hover:bg-[#3D9134] px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#48A63E]/20"
              >
                Update Build Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Staff Profile & Password Update Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                {(userProfile?.full_name || 'Production Lead').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Production Staff Profile</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Manage account security and view assigned credentials</p>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Full Name</label>
                <input
                  type="text"
                  readOnly
                  value={userProfile?.full_name || 'Production Staff Member'}
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-extrabold cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#6B5C4D]">Email Address (Locked)</label>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setActiveTab('queries');
                    }}
                    className="text-[10px] font-bold text-[#48A63E] hover:underline flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" /> Request Email Change →
                  </button>
                </div>
                <input
                  type="email"
                  readOnly
                  value={userProfile?.email || 'production.staff@retailsphere.com'}
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-extrabold cursor-not-allowed"
                />
                <p className="text-[10px] text-amber-800 font-bold mt-1">
                  🔒 Email modification is restricted. Submit an official request in the Queries section to change email.
                </p>
              </div>
            </div>

            {/* Password Update Provision */}
            <div className="border-t border-[#E2D7CB] pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#48A63E]" />
                <h4 className="font-extrabold text-sm text-[#2C241D]">Update Password</h4>
              </div>

              {passwordNotice && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passwordNotice.type === 'success' ? 'bg-[#48A63E]/15 text-[#3D9134] border border-[#48A63E]/30' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {passwordNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{passwordNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
