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
  RefreshCw,
  Percent,
  Tag,
  Copy,
  Trash2,
  UserCheck,
  Mail,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Download
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
  WorkerData,
  downloadPaymentReceipt
} from '../../services/api_production';
import {
  fetchQueriesFromDB,
  createStaffQueryInDB,
  fetchNotificationsFromDB,
  updateUserProfile
} from '../../services/api';
import { StaffQuery, addStaffQuery } from '../../utils/staffQueriesStorage';
import {
  getCouponsApi,
  createCouponApi,
  deleteCouponApi,
  regenerateCouponApi,
  Coupon,
  CouponAllotment
} from '../../services/api_coupons';
import {
  getMessagesForUser,
  markAdminMessageRead,
  markAllAdminMessagesReadForUser,
  isMessageReadByUser,
  AdminMessage
} from '../../utils/adminMessagesStorage';

export const ProductionStaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : { email: 'production.staff@retailsphere.com', role: 'Production Staff' };
    } catch {
      return { email: 'production.staff@retailsphere.com', role: 'Production Staff' };
    }
  }, []);

  const [orders, setOrders] = useState<CustomOrderData[]>([]);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'approvals' | 'assignments' | 'workers' | 'queries' | 'coupons' | 'admin_messages'>('orders');
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

  // Admin Directives & Messages State
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);

  const loadAdminMessages = () => {
    const userEmail = currentUser.email || 'production.staff@retailsphere.com';
    const userRole = currentUser.role || 'Production Staff';
    setAdminMessages(getMessagesForUser(userEmail, userRole));
  };

  useEffect(() => {
    loadAdminMessages();
    window.addEventListener('admin-messages-updated', loadAdminMessages);
    window.addEventListener('storage', loadAdminMessages);
    return () => {
      window.removeEventListener('admin-messages-updated', loadAdminMessages);
      window.removeEventListener('storage', loadAdminMessages);
    };
  }, [currentUser]);

  const unreadAdminMsgsCount = adminMessages.filter(m => !isMessageReadByUser(m, currentUser.email)).length;

  // Coupons Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>([]);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);

  // New Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [newCouponDescription, setNewCouponDescription] = useState('');
  const [newCouponTargetEmail, setNewCouponTargetEmail] = useState('');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState<number | ''>(10);
  const [newCouponAudience, setNewCouponAudience] = useState<string>('production');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(false);

  const loadCouponsData = async () => {
    try {
      const res = await getCouponsApi();
      setCouponsList(res.coupons);
      setAllotmentsList(res.allotments);
    } catch (e) {
      setCouponsList([]);
      setAllotmentsList([]);
    }
  };

  useEffect(() => {
    loadCouponsData();
  }, []);

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const limitVal = typeof newCouponCustomerLimit === 'number' ? newCouponCustomerLimit : undefined;

    try {
      await createCouponApi({
        code: newCouponCode.trim().toUpperCase(),
        coupon_type: 'percentage_notification',
        discount_percent: newCouponDiscount,
        description: newCouponDescription.trim() || `${newCouponDiscount}% OFF Custom Furniture Offer`,
        target_user_email: newCouponTargetEmail.trim() || undefined,
        customer_limit: limitVal
      });

      await loadCouponsData();
      setSuccessNotice(`Custom Furniture Coupon "${newCouponCode.trim().toUpperCase()}" created successfully!`);
      setNewCouponCode('');
      setNewCouponDiscount(10);
      setNewCouponDescription('');
      setNewCouponTargetEmail('');
      setNewCouponCustomerLimit(10);
      setNewCouponAudience('production');
      setNewCouponAutoAllot(false);
      setIsAddCouponModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to deactivate and remove coupon "${code}"?`)) {
      try {
        await deleteCouponApi(id);
        await loadCouponsData();
        setSuccessNotice(`Coupon "${code}" removed.`);
      } catch (err: any) {
        alert(err.message || 'Failed to remove coupon.');
      }
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

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
    } catch (e) { }

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

  const renderColorSwatchBadge = (colorStr?: string, explicitHex?: string | null) => {
    if (!colorStr) return <span className="font-bold text-[#2C241D]">Natural Finish</span>;
    const hexMatch = explicitHex || colorStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || null;
    return (
      <div className="flex items-center gap-2 flex-wrap mt-0.5">
        {hexMatch && (
          <span
            className="w-4 h-4 rounded-full inline-block border border-black/30 shadow-xs shrink-0"
            style={{ backgroundColor: hexMatch }}
          />
        )}
        <span className="font-extrabold text-xs text-[#2C241D]">{colorStr}</span>
        {hexMatch && (
          <span className="px-2 py-0.5 rounded-md bg-[#38A132]/10 font-mono text-[10px] font-extrabold text-[#38A132] border border-[#38A132]/30">
            {hexMatch.toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  const parseOrderSpecDetails = (ord: CustomOrderData) => {
    const fields: { label: string; value: string; isColor?: boolean; hex?: string | null }[] = [];

    // 1. Furniture Category Determination
    let categoryName = 'Bespoke Custom Furniture';
    const typeLower = (ord.furniture_type || '').toLowerCase();
    if (typeLower.includes('sofa') || typeLower.includes('chair') || typeLower.includes('seat') || typeLower.includes('recliner') || typeLower.includes('daybed') || typeLower.includes('sectional')) {
      categoryName = 'Sofas & Living Room Seating';
    } else if (typeLower.includes('table') || typeLower.includes('dining') || typeLower.includes('coffee')) {
      categoryName = 'Dining & Center Tables';
    } else if (typeLower.includes('desk') || typeLower.includes('office') || typeLower.includes('workstation')) {
      categoryName = 'Executive Desks & Workspace';
    } else if (typeLower.includes('bed') || typeLower.includes('headboard') || typeLower.includes('bedroom')) {
      categoryName = 'Bespoke Beds & Bedroom';
    } else if (typeLower.includes('cabinet') || typeLower.includes('credenza') || typeLower.includes('wardrobe') || typeLower.includes('sideboard')) {
      categoryName = 'Storage & Architectural Cabinets';
    }

    fields.push({ label: 'Furniture Category', value: categoryName });
    fields.push({ label: 'Specific Furniture Type', value: ord.furniture_type });
    fields.push({ label: 'Custom Dimensions', value: ord.dimensions });
    fields.push({ label: 'Primary Timber / Material', value: ord.material });

    // 2. Parse Upholstery Fabric / Texture Finish vs Color / Polish Finish
    let colorVal = ord.color || 'Natural Finish';
    let fabricVal = 'Standard Custom Finish';

    const matchParen = colorVal.match(/^(.*?)\s*\((.*?)\)$/);
    if (matchParen) {
      fabricVal = matchParen[1].trim();
      colorVal = matchParen[2].trim();
    }

    const hexMatch = colorVal.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
    const hexCode = hexMatch ? hexMatch[0] : null;

    fields.push({ label: 'Upholstery Fabric / Texture Finish', value: fabricVal });
    fields.push({
      label: 'Color / Polish Finish',
      value: colorVal,
      isColor: true,
      hex: hexCode
    });

    if (ord.design_description) {
      const desc = ord.design_description;
      const aspectsMatch = desc.match(/Aspects:\s*\[(.*?)\]/);
      if (aspectsMatch && aspectsMatch[1]) {
        const pairs = aspectsMatch[1].split(';');
        pairs.forEach(pair => {
          const [k, v] = pair.split(':').map(s => s?.trim());
          if (k && v) {
            const formattedLabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (formattedLabel.toLowerCase() !== 'furniture category') {
              fields.push({ label: formattedLabel, value: v });
            }
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
    const remarks = approvalRemarks.trim() || 'Custom order request rejected by production staff.';
    await updateOrderStatus(selectedOrderForReview.custom_order_id, 'Rejected', 0, remarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Customization Order #${selectedOrderForReview.custom_order_id} marked as Rejected.`);
    setTimeout(() => setSuccessNotice(null), 5000);
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

  const paidOrdersCount = orders.filter(isPaidCustomOrder).length;
  const inProductionCount = orders.filter(
    (o) =>
      isPaidCustomOrder(o) &&
      o.order_status !== 'Completed' &&
      ((o.assigned_workers && o.assigned_workers.length > 0) || o.order_status === 'In Production')
  ).length;
  const approvedCount = orders.filter((o) => o.order_status === 'Approved' && !isPaidCustomOrder(o)).length;
  const pendingCount = orders.filter((o) => (o.order_status === 'Pending' || o.order_status === 'Pending Approval') && !isPaidCustomOrder(o)).length;
  const rejectedCount = orders.filter((o) => o.order_status === 'Rejected').length;
  const completedCount = orders.filter((o) => o.order_status === 'Completed').length;

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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'orders'
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'approvals'
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'assignments'
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'workers'
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'queries'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
              }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4.5 h-4.5" />
              <span className="text-sm">Queries & Requests</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'coupons'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
              }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4.5 h-4.5" />
              <span className="text-sm">Coupons & Offers</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('admin_messages')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${activeTab === 'admin_messages'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
              }`}
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4.5 h-4.5" />
              <span className="text-sm">Admin Directives</span>
            </div>
            {unreadAdminMsgsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
                {unreadAdminMsgsCount}
              </span>
            )}
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
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'coupons' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Coupons
            </button>
            <button
              onClick={() => setActiveTab('admin_messages')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold relative ${activeTab === 'admin_messages' ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              <span>Directives</span>
              {unreadAdminMsgsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-amber-500 text-white">
                  {unreadAdminMsgsCount}
                </span>
              )}
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

            {/* Unread Admin Directives Banner */}
            {unreadAdminMsgsCount > 0 && activeTab !== 'admin_messages' && (
              <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 text-amber-900 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600 animate-bounce flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs block">
                      📢 You have {unreadAdminMsgsCount} unread Admin Directive{unreadAdminMsgsCount > 1 ? 's' : ''}!
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      System Admin has dispatched official instructions to Production Staff.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('admin_messages')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  View Directives →
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
                  {activeTab === 'coupons' && 'Custom Furniture Coupon & Promotions Hub'}
                  {activeTab === 'admin_messages' && 'Admin Directives & Official Messages'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'orders' && 'Review custom quotes, assign skilled craftsmen, and update workshop build stages.'}
                  {activeTab === 'approvals' && 'Review pending custom furniture designs, verify material specifications, set pricing quotes, and approve or reject customer requests.'}
                  {activeTab === 'assignments' && 'Assign skilled workshop craftsmen and technicians to approved custom furniture builds, specify craft stages, and track active task distribution.'}
                  {activeTab === 'workers' && 'Manage workshop craftsmen, specializations, and active assigned furniture builds.'}
                  {activeTab === 'queries' && 'Submit email change requests or system queries directly to system Admin.'}
                  {activeTab === 'coupons' && 'Manage promotional discount codes for bespoke furniture custom orders, set First N Customer payment limits, and issue targeted VIP customer offers.'}
                  {activeTab === 'admin_messages' && 'Official executive announcements, workshop operational directives, and direct messages from System Admin.'}
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
                              className={`p-2.5 rounded-xl border transition-colors ${n.unread ? 'bg-[#F3EDE5] border-[#48A63E]/40 font-bold' : 'bg-[#FAF7F2] border-[#E2D7CB] text-[#6B5C4D]'
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
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Paid Custom Orders</span>
                    <DollarSign className="w-4 h-4 text-[#48A63E]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{paidOrdersCount} Orders</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                      Customer payment received
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
                      Artisan assigned builds
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2.5 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between text-[#8C8275]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Approved Custom Orders</span>
                    <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{approvedCount} Orders</div>
                  <div>
                    <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                      Staff approved & quoted
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
                        className="ultra-glass-card rounded-3xl p-5 shadow-lg border border-[#E2D7CB] bg-white/90 text-[#2C241D] space-y-4 hover:border-[#38A132]/40 transition-all hover:shadow-xl"
                      >
                        {/* Top Badges & Price Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-mono font-extrabold text-[#38A132] px-3 py-1 rounded-full bg-[#38A132]/10 border border-[#38A132]/25">
                              ORDER #{ord.custom_order_id}
                            </span>

                            {ord.payment_status === 'Paid' || ord.order_status === 'Paid' ? (
                              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Paid & Verified</span>
                              </span>
                            ) : (
                              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                ord.order_status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                ord.order_status === 'Approved' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                ord.order_status === 'In Production' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                ord.order_status === 'Completed' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {ord.order_status}
                              </span>
                            )}
                          </div>

                          {ord.estimated_price && ord.estimated_price > 0 && (
                            <div className="text-base font-black text-[#38A132] bg-[#38A132]/10 px-3.5 py-1 rounded-xl border border-[#38A132]/20">
                              ₹{ord.estimated_price.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Title & Specifications Grid */}
                        <div className="space-y-3">
                          <h3 className="text-xl font-black text-[#2C241D] tracking-tight">
                            {ord.furniture_type}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EAE0D4] text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Client Name</span>
                              <span className="font-bold text-[#2C241D] block truncate">👤 {ord.customer_name}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Dimensions</span>
                              <span className="font-bold text-[#2C241D] block truncate">📐 {ord.dimensions}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Timber / Material</span>
                              <span className="font-bold text-[#2C241D] block truncate">🪵 {ord.material}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Color & Finish</span>
                              <span className="font-bold text-[#38A132] block truncate">🎨 {renderColorSwatchBadge(ord.color)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Toolbar */}
                        <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end ml-auto">
                            <button
                              onClick={() => setSelectedOrderForDetails(ord)}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>View Specs</span>
                            </button>

                            {!(ord.is_locked || ord.order_status === 'Approved' || ord.order_status === 'In Production' || ord.order_status === 'Completed' || (ord.estimated_price && ord.estimated_price > 0)) ? (
                              <button
                                onClick={() => handleToggleLock(ord)}
                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                title="Specs Unlocked. Click to Lock Specs."
                              >
                                <Unlock className="w-4 h-4 text-amber-600" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs opacity-90 cursor-not-allowed"
                                title="Specifications Locked."
                              >
                                <Lock className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}

                            {!(ord.payment_status === 'Paid' || ord.order_status === 'Paid' || ord.order_status === 'In Production' || ord.order_status === 'Completed') ? (
                              <button
                                onClick={() => handleOpenPriceModal(ord)}
                                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              >
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                <span>{ord.estimated_price ? `Edit Price (₹${ord.estimated_price.toLocaleString()})` : 'Set Price Quote'}</span>
                              </button>
                            ) : (
                              (ord.payment_status === 'Paid' || ord.order_status === 'Paid') && (
                                <button
                                  onClick={() => downloadPaymentReceipt(ord)}
                                  className="px-3.5 py-2 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                                  title="Download official paid invoice receipt"
                                >
                                  <Download className="w-3.5 h-3.5 text-white" />
                                  <span>Receipt</span>
                                </button>
                              )
                            )}

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
                {/* Quotes & Approvals Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Pending Review</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{pendingCount} Requests</div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
                        Awaiting review & quote
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Approved Quotes</span>
                      <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{approvedCount} Orders</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                        Quoted, awaiting customer payment
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Rejected Requests</span>
                      <XCircle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{rejectedCount} Requests</div>
                    <div>
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block">
                        Declined requests
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[#7A6C5E]">Filter Status:</span>
                    {(['Pending', 'Approved', 'Rejected', 'Cancelled', 'All'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setApprovalFilter(st as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${approvalFilter === st
                            ? 'bg-[#48A63E] text-white shadow-xs'
                            : 'bg-white border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F5ECE1]'
                          }`}
                      >
                        {st === 'Pending' ? `Pending Review (${pendingCount})` : st === 'Approved' ? `Approved (${approvedCount})` : st}
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

                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold self-start sm:self-auto ${ord.order_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                ord.order_status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                              }`}>
                              {ord.order_status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-[#6B5C4D]">
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Client Name</span>
                              <span className="font-extrabold text-[#2C241D]">{ord.customer_name}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Material Finish</span>
                              <span className="font-bold text-[#2C241D]">{ord.material}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Color / Polish</span>
                              <span className="font-bold">{renderColorSwatchBadge(ord.color)}</span>
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

                {workers.filter((w) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    w.full_name.toLowerCase().includes(q) ||
                    w.email.toLowerCase().includes(q) ||
                    (w.specialization && w.specialization.toLowerCase().includes(q)) ||
                    (w.phone && w.phone.toLowerCase().includes(q))
                  );
                }).length === 0 ? (
                  <div className="py-12 px-4 text-center bg-white rounded-3xl border border-[#E2D7CB] space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5ECE1] text-[#8C7C6D] flex items-center justify-center mx-auto shadow-xs">
                      <Users className="w-7 h-7" />
                    </div>
                    <h4 className="font-extrabold text-base text-[#2C241D]">No workers yet</h4>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                      {searchQuery.trim()
                        ? `No artisan technicians match "${searchQuery}". Try a different search keyword.`
                        : 'No artisan technicians registered yet. Click below to add a craftsman to the workshop directory.'}
                    </p>
                    {!searchQuery.trim() && (
                      <button
                        onClick={() => setIsAddWorkerModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#48A63E]/20 transition-all cursor-pointer mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add First Worker</span>
                      </button>
                    )}
                  </div>
                ) : (
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
                )}
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
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${query.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
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

            {/* TAB 6: CUSTOM FURNITURE COUPONS & PROMOTIONS HUB */}
            {activeTab === 'coupons' && (
              <div className="space-y-6 pt-2">
                {/* Coupon KPI Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Promo Provisions</span>
                      <Tag className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{couponsList.length}</div>
                    <div className="text-[10px] text-[#48A63E] font-bold mt-1">Active Custom Offers</div>
                  </div>

                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>First N Payment Offers</span>
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.filter(c => c.customerLimit && c.customerLimit > 0).length}
                    </div>
                    <div className="text-[10px] text-amber-700 font-bold mt-1">Payment Cap Offers</div>
                  </div>

                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Targeted VIP Offers</span>
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.filter(c => c.targetUserEmail && c.targetUserEmail.trim()).length}
                    </div>
                    <div className="text-[10px] text-purple-700 font-bold mt-1">Direct VIP Customer Offers</div>
                  </div>

                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Redemptions</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.reduce((acc, c) => acc + (c.currentRedemptions || 0), 0)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">Redeemed At Checkout</div>
                  </div>
                </div>

                {/* Main Table Card */}
                <div className="ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6C5E]" />
                      <input
                        type="text"
                        placeholder="Search coupons by code or email..."
                        value={couponSearchQuery}
                        onChange={(e) => setCouponSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#48A63E]"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddCouponModalOpen(true)}
                      className="px-5 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#48A63E]/20 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Coupon Provision</span>
                    </button>
                  </div>

                  {/* Coupon List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Coupon Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Audience / Offer Type</th>
                          <th className="py-3 px-4">Payment Limit Progress</th>
                          <th className="py-3 px-4">Target VIP Customer Email / Allotment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {couponsList
                          .filter(c => !couponSearchQuery.trim() || c.code.toLowerCase().includes(couponSearchQuery.toLowerCase()) || (c.targetUserEmail && c.targetUserEmail.toLowerCase().includes(couponSearchQuery.toLowerCase())))
                          .map((coupon) => {
                            const limitN = coupon.customerLimit || 0;
                            const redeemed = coupon.currentRedemptions || 0;
                            const audience = coupon.audienceType || 'production';

                            let audienceBadge = '🏭 First N Production Customers';
                            let audienceBg = 'bg-amber-50 text-amber-700 border-amber-200';
                            if (audience === 'retail') {
                              audienceBadge = '🛍️ First N Retail Customers';
                              audienceBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else if (audience === 'all') {
                              audienceBadge = '🌐 First N Customers (All)';
                              audienceBg = 'bg-blue-50 text-blue-700 border-blue-200';
                            }

                            if (coupon.targetUserEmail && coupon.targetUserEmail.trim()) {
                              audienceBadge = '⭐ VIP / Special Offer';
                              audienceBg = 'bg-purple-50 text-purple-700 border-purple-200';
                            }

                            return (
                              <tr key={coupon.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                  <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-[#48A63E]" />
                                    <span className="bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">{coupon.code}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">{coupon.discountPercent}% OFF</td>

                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${audienceBg}`}>
                                    {audienceBadge} {limitN > 0 ? `(N = ${limitN})` : ''}
                                  </span>
                                </td>

                                <td className="py-3 px-4 font-mono">
                                  {limitN > 0 ? (
                                    <div className="space-y-1">
                                      <span className="font-bold text-[#2C241D] text-[11px]">{redeemed} / {limitN} Used</span>
                                      <div className="w-24 h-1.5 bg-[#EAE0D4] rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all ${redeemed >= limitN ? 'bg-rose-500' : 'bg-[#48A63E]'}`}
                                          style={{ width: `${Math.min(100, Math.round((redeemed / limitN) * 100))}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[#8C7C6D] text-[11px] font-medium">Unlimited</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-[#6B5C4D]">
                                   {coupon.targetUserEmail ? `🎯 ${coupon.targetUserEmail}` : '🌐 All Customers'}
                                 </td>

                                <td className="py-4 px-4">
                                   <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${coupon.status === 'Active' && (!limitN || redeemed < limitN)
                                       ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                       : 'bg-rose-100 text-rose-700'
                                     }`}>
                                     {limitN > 0 && redeemed >= limitN ? 'Exhausted' : coupon.status}
                                   </span>
                                 </td>

                                <td className="py-4 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => handleRemoveCoupon(coupon.id, coupon.code)}
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Allotment & One-Time Usage Record Table */}
                  <div className="mt-8 border-t border-[#EFE7DE] pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#48A63E]" />
                          <span>Customer Coupon Allotment & One-Time Usage Records</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of users allotted coupons, delivery status, and single-use enforcement.</p>
                      </div>
                      <span className="text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-3 py-1 rounded-lg border border-[#48A63E]/20">
                        {allotmentsList.length} Total Records
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Allotted Customer Email / User ID</th>
                            <th className="py-3 px-4">Coupon Code</th>
                            <th className="py-3 px-4">Discount</th>
                            <th className="py-3 px-4">Allotted Date</th>
                            <th className="py-3 px-4">Usage Status</th>
                            <th className="py-3 px-4">Redeemed Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium">
                          {allotmentsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-[#8C7C6D] italic">
                                No customer coupon allotments recorded yet. When a coupon is sent to a customer email, it will be tracked here.
                              </td>
                            </tr>
                          ) : (
                            allotmentsList.map((alt) => (
                              <tr key={alt.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                  ✉️ {alt.targetUserEmail}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                  <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">
                                    {alt.couponCode}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                  {alt.discountPercent}% OFF
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                  {alt.allottedDate}
                                </td>
                                <td className="py-3.5 px-4">
                                  {alt.used ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30">
                                      Used ✓ (Redeemed)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      Delivered
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                  {alt.usedDate || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: DEDICATED ADMIN DIRECTIVES & MESSAGES PAGE */}
            {activeTab === 'admin_messages' && (
              <div className="space-y-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Directives</span>
                      <Mail className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{adminMessages.length}</div>
                    <div className="text-[10px] text-[#48A63E] font-bold mt-1">Messages from System Admin</div>
                  </div>

                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Unread Directives</span>
                      <Bell className="w-4 h-4 text-amber-600 animate-pulse" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{unreadAdminMsgsCount}</div>
                    <div className="text-[10px] text-amber-700 font-bold mt-1">Pending Review</div>
                  </div>

                  <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Read & Acknowledged</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {adminMessages.length - unreadAdminMsgsCount}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">Acknowledged</div>
                  </div>
                </div>

                {/* Main Messages Container */}
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#48A63E]" />
                        Messages & Directives from System Admin
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Official executive announcements, workshop operational directives, and direct messages.
                      </p>
                    </div>

                    {unreadAdminMsgsCount > 0 && (
                      <button
                        onClick={() => {
                          markAllAdminMessagesReadForUser(currentUser.email, 'Production Staff');
                          loadAdminMessages();
                        }}
                        className="px-4 py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>Mark All as Read</span>
                      </button>
                    )}
                  </div>

                  {/* Messages List */}
                  <div className="space-y-4">
                    {adminMessages.length === 0 ? (
                      <div className="p-10 text-center text-[#7A6C5E] space-y-2 bg-white rounded-2xl border border-[#E2D7CB]">
                        <Mail className="w-8 h-8 text-[#A09080] mx-auto opacity-50" />
                        <p className="text-sm font-extrabold text-[#2C241D]">No Admin Messages Received</p>
                        <p className="text-xs text-[#7A6C5E]">Official announcements dispatched by System Admin to Production Staff will appear here.</p>
                      </div>
                    ) : (
                      adminMessages.map((msg) => {
                        const isRead = isMessageReadByUser(msg, currentUser.email);
                        return (
                          <div
                            key={msg.id}
                            className={`p-5 rounded-2xl border transition-all space-y-3 ${isRead
                                ? 'bg-[#FAF7F2]/80 border-[#E2D7CB] text-[#5C4E42]'
                                : 'bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 border-2 border-amber-300 shadow-md'
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-[#2C241D]">{msg.subject}</span>
                                {isRead ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Read ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                                    <Bell className="w-3 h-3" />
                                    Unread (New Directive)
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs text-[#7A6C5E] font-bold">{msg.createdDate}</span>
                            </div>

                            <p className="text-xs sm:text-sm text-[#2C241D] font-medium leading-relaxed whitespace-pre-line">
                              {msg.message}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-[#EFE7DE]">
                              <span className="text-[11px] font-bold text-[#7A6C5E]">
                                Sender: <strong className="text-[#2C241D]">{msg.sender}</strong> ({msg.recipientType})
                              </span>

                              {!isRead && (
                                <button
                                  onClick={() => {
                                    markAdminMessageRead(msg.id, currentUser.email);
                                    loadAdminMessages();
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mark as Read</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
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

            {/* 1. CLIENT & ORDER TIMELINE SUMMARY */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Client Contact & Order Record</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Client Name</span>
                  <span className="font-extrabold text-[#2C241D] truncate block">{selectedOrderForDetails.customer_name}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Email Address</span>
                  <span className="font-bold text-[#2C241D] block break-all text-[11px]" title={selectedOrderForDetails.customer_email}>{selectedOrderForDetails.customer_email || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Phone Contact</span>
                  <span className="font-bold text-[#2C241D] block truncate">{selectedOrderForDetails.customer_phone || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Submission Date</span>
                  <span className="font-bold text-[#2C241D] block truncate">
                    {selectedOrderForDetails.order_date
                      ? new Date(selectedOrderForDetails.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SEPARATED PRODUCT FIELDS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Product Specifications & Parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {parseOrderSpecDetails(selectedOrderForDetails).map((field, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">{field.label}</span>
                    {field.isColor || field.label.toLowerCase().includes('color') ? (
                      renderColorSwatchBadge(field.value, field.hex)
                    ) : (
                      <span className="font-extrabold text-xs text-[#2C241D] block">{field.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CUSTOMER PROVIDED REFERENCE DESIGN IMAGES */}
            {selectedOrderForDetails.reference_image && selectedOrderForDetails.reference_image.trim() && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#48A63E]" />
                  Customer Provided Reference Images ({selectedOrderForDetails.reference_image.split(',').map(s => s.trim()).filter(Boolean).length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedOrderForDetails.reference_image.split(',').map(s => s.trim()).filter(Boolean).map((imgUrl, i) => (
                    <a
                      key={i}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-2xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-xs hover:shadow-md transition-all block h-32"
                    >
                      <img
                        src={imgUrl}
                        alt={`Reference Design ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          if (target.nextElementSibling) {
                            target.nextElementSibling.classList.remove('hidden');
                          }
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-[#F5ECE1] flex flex-col items-center justify-center p-3 text-center">
                        <ImageIcon className="w-6 h-6 text-[#9E9082] mb-1" />
                        <span className="text-[10px] font-extrabold text-[#7A6C5E]">Reference Photo #{i + 1}</span>
                        <span className="text-[9px] text-[#48A63E] underline font-bold mt-1">Open Image URL</span>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[9px] font-extrabold backdrop-blur-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Photo #{i + 1}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}



            <div className="flex items-center justify-between gap-3 border-t border-[#E2D7CB] pt-4">
              {(selectedOrderForDetails.payment_status === 'Paid' || selectedOrderForDetails.order_status === 'Paid') ? (
                <button
                  onClick={() => downloadPaymentReceipt(selectedOrderForDetails)}
                  className="px-4 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Payment Receipt</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedOrderForDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
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
              <p><span className="font-bold text-[#7A6C5E]">Color / Polish Shade:</span> <strong className="text-[#48A63E]">{selectedOrderForReview.color || 'Natural Finish'}</strong></p>
              {selectedOrderForReview.estimated_price ? (
                <p><span className="font-bold text-[#7A6C5E]">Current Quote:</span> <strong className="text-[#38A132]">₹{selectedOrderForReview.estimated_price.toLocaleString()}</strong></p>
              ) : null}

              {selectedOrderForReview.reference_image && (
                <div className="space-y-1.5 pt-2 border-t border-[#EFE7DE]">
                  <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Customer Reference Photos ({selectedOrderForReview.reference_image.split(',').map(s => s.trim()).filter(Boolean).length})</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedOrderForReview.reference_image.split(',').map(s => s.trim()).filter(Boolean).map((imgUrl, idx) => (
                      <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                        <img
                          src={imgUrl}
                          alt={`Reference ${idx + 1}`}
                          className="w-14 h-14 rounded-xl object-cover border border-[#E2D7CB] group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectOrder}
                className="bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <XCircle className="w-4 h-4 text-white" />
                <span>Reject Request</span>
              </button>

              <button
                type="button"
                onClick={handleApproveOrder}
                className="bg-[#38A132] hover:bg-[#32922D] px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
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
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${passwordNotice.type === 'success' ? 'bg-[#48A63E]/15 text-[#3D9134] border border-[#48A63E]/30' : 'bg-rose-100 text-rose-800 border border-rose-200'
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

      {/* MODAL: CREATE COUPON PROVISION */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto text-[#2C241D]">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1A140E]">Create Custom Furniture Coupon</h3>
                <p className="text-xs font-medium text-[#7A6C5E]">Configure First N customer payment limits or VIP targeted customer special offers.</p>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(false)}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Coupon Promo Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. BESPOKE15 or VIPPROD20"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Discount Percentage (%) *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Offer Description</label>
                <input
                  type="text"
                  placeholder="e.g. 15% Off Custom Bespoke Furniture Orders (First 10 Customers)"
                  value={newCouponDescription}
                  onChange={(e) => setNewCouponDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Audience & Category</label>
                <select
                  value={newCouponAudience}
                  onChange={(e) => setNewCouponAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="production">Production & Custom Furniture Customers Only</option>
                  <option value="retail">Retail Readymade Customers Only</option>
                  <option value="all">All RetailSphere Customers</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-[#E2D7CB]">
                <div>
                  <label className="block font-bold text-[#2C241D] text-xs mb-1">First N Payment Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 10"
                    value={newCouponCustomerLimit}
                    onChange={(e) => setNewCouponCustomerLimit(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                  />
                  <p className="text-[10px] text-[#7A6C5E] mt-1 font-medium">Caps redemptions to first N paying customers.</p>
                </div>

                <div>
                  <label className="block font-bold text-[#2C241D] text-xs mb-1">Target VIP Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. vip.customer@gmail.com"
                    value={newCouponTargetEmail}
                    onChange={(e) => setNewCouponTargetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-[#48A63E]"
                  />
                  <p className="text-[10px] text-[#7A6C5E] mt-1 font-medium">Dispatches email + notification to specific VIP.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prod-auto-allot-check"
                  checked={newCouponAutoAllot}
                  onChange={(e) => setNewCouponAutoAllot(e.target.checked)}
                  className="w-4 h-4 accent-[#48A63E] rounded cursor-pointer"
                />
                <label htmlFor="prod-auto-allot-check" className="text-[11px] font-bold text-[#2C241D] cursor-pointer">
                  Auto-allot & dispatch dashboard notifications + emails to first N customers
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setIsAddCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20"
                >
                  Create & Activate Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
