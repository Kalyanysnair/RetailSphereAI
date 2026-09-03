import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import { fetchAllLeaveRequests, reviewLeaveRequest, WorkerLeaveItem } from '../../services/api_leave';
import { 
  Users, 
  Package, 
  Plus, 
  Search, 
  LogOut, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  Sparkles,
  Briefcase,
  Wrench,
  DollarSign,
  LayoutDashboard,
  ShieldCheck,
  Check,
  MessageSquare,
  Send,
  HelpCircle,
  UserCheck,
  Mail,
  Tag,
  Trash2,
  PackageMinus,
  Bell,
  Edit,
  Eye,
  RotateCcw,
  User,
  ChevronDown,
  Lock,
  Unlock,
  Download,
  Key,
  Truck,
  FileText,
  Clock,
  ShoppingBag,
  PackageCheck,
  Percent,
  Sliders,
  ArrowRight,
  UserX,
  UserPlus,
  Edit3,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import { 
  createStaffUser, 
  fetchStaffUsers, 
  fetchInventoryFromDB, 
  createProductInDB, 
  updateStockInDB, 
  fetchQueriesFromDB, 
  respondToStaffQueryInDB,
  fetchNotificationsFromDB,
  fetchSuppliersFromDB,
  createSupplierInDB,
  updateUserProfile,
  fetchAllUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  deleteUserById
} from '../../services/api';

import {
  VehicleItem,
  FleetSummary,
  VehicleDetailResponse,
  fetchFleetSummaryDB,
  fetchVehiclesDB,
  fetchVehicleDetailsDB,
  createVehicleDB,
  updateVehicleDB,
  updateVehicleStatusDB,
} from '../../services/api_fleet';

import { respondToStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import {
  createCouponApi,
  getCouponsApi,
  deleteCouponApi,
  regenerateCouponApi,
  Coupon,
  CouponAllotment
} from '../../services/api_coupons';
import {
  fetchAdminDashboardSummaryDB,
  fetchRevenueAnalyticsDB,
  fetchProductionBottlenecksDB,
  fetchAuditLogsDB,
  recordAuditLogDB,
  performGlobalSearchDB,
  toggleUserStatusDB,
  updateUserDB,
  exportDatabaseExcel,
  AdminDashboardSummary,
  RevenueAnalyticsData,
  ProductionBottleneckItem,
  SearchResultItem
} from '../../services/api_admin';
import { getStoredRetailOrders, fetchRetailOrdersFromDB, deleteStoredRetailOrder, computeLogicalCompletionStatus, updateStoredRetailOrderCompletionStatus } from '../../utils/retailOrdersStorage';
import { fetchCustomOrders, updateOrderStatus, toggleLockOrderSpecifications, downloadPaymentReceipt, CustomOrderData } from '../../services/api_production';
import { getStoredAdminMessages, sendAdminMessage, deleteAdminMessage, AdminMessage } from '../../utils/adminMessagesStorage';
import { getStoredUserAuthorities, saveUserAuthority, UserAuthorityRecord, CAPABILITY_DEFINITIONS, CapabilityKey } from '../../utils/userAuthoritiesStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';

export interface SystemUserItem {
  id: string;
  user_id: number;
  full_name: string;
  name: string;
  email: string;
  phone: string;
  role_name: string;
  role: string;
  status: boolean;
  status_text: 'Active' | 'Inactive';
  created_at: string;
  dateAdded: string;
}

export interface StaffMember {
  id: string;
  user_id?: number;
  name: string;
  email: string;
  phone: string;
  role: 'Retail Staff' | 'Production Staff' | 'Artisan Worker';
  skill?: string;
  status: 'Active' | 'Inactive';
  dateAdded: string;
}

export interface InventoryItem {
  id: string;
  product_id?: number | string;
  productCode?: string;
  name: string;
  category: string;
  material: string;
  color?: string;
  price: number;
  stockCount: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image_url?: string;
  sku: string;
}

export interface RetailProduct {
  id: string;
  product_id?: number | string;
  productCode?: string;
  name: string;
  category: string;
  material: string;
  color?: string;
  price: number;
  stockCount: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  sku: string;
  image_url?: string;
  detailed_description?: string;
  dimensions?: string;
  warranty_info?: string;
}

export interface RetailOrder {
  orderId: string;
  customerId?: number | string;
  customerName: string;
  email: string;
  itemsCount: number;
  totalAmount: number;
  orderStatus: 'Order Placed' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Paid' | 'Cancelled';
  paymentStatus?: 'Paid' | 'Pending' | 'Cancelled';
  paymentId?: string;
  completionStatus?: string;
  completionPercentage?: number;
  orderDate: string;
  assignedWorkers?: any[];
  items?: Array<{
    id: string;
    productCode?: string;
    sku?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }>;
}

export interface SupplierProductItem {
  product_id?: number;
  id?: string;
  sku?: string;
  name: string;
  category: string;
  material: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface RetailSupplier {
  id: string;
  supplier_id?: number;
  supplier_name: string;
  contact_person: string;
  phone: string;
  address: string;
  assigned_products_count?: number;
  assigned_products?: SupplierProductItem[];
  status: 'Active' | 'Inactive';
}

export const INITIAL_STAFF: StaffMember[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'requests'
    | 'production'
    | 'fabrication'
    | 'onsite'
    | 'inventory'
    | 'workers'
    | 'customers'
    | 'products'
    | 'payments'
    | 'fulfillment'
    | 'returns'
    | 'communication'
    | 'reports'
    | 'alerts'
    | 'audit'
    | 'roles'
    | 'staff'
    | 'suppliers'
    | 'custom_orders'
    | 'queries'
    | 'coupons'
    | 'broadcast'
    | 'users'
    | 'analytics'
    | 'fleet'
  >('overview');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30days');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportDatabaseExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportDatabaseExcel();
      setSuccessBanner('PostgreSQL database export (.xlsx) generated successfully!');
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setStaffFormError(err.message || 'Failed to generate Excel database export.');
      setTimeout(() => setStaffFormError(null), 5000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Fleet Management State
  const [fleetSummaryData, setFleetSummaryData] = useState<FleetSummary | null>(null);
  const [vehiclesList, setVehiclesList] = useState<VehicleItem[]>([]);
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isVehicleDetailModalOpen, setIsVehicleDetailModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<VehicleDetailResponse | null>(null);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<VehicleItem | null>(null);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);

  // Form values for Add / Edit Vehicle
  const [vRegNumber, setVRegNumber] = useState('');
  const [vType, setVType] = useState('Mini Truck');
  const [vCapacity, setVCapacity] = useState('500');
  const [vDriverId, setVDriverId] = useState<string>('');
  const [vStatus, setVStatus] = useState('AVAILABLE');
  const [vNotes, setVNotes] = useState('');
  const [vModelName, setVModelName] = useState('');
  const [vYear, setVYear] = useState('');

  // System BI Dashboard & Real-Time Analytics State
  const [dashboardSummary, setDashboardSummary] = useState<AdminDashboardSummary | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalyticsData | null>(null);
  const [bottlenecksList, setBottlenecksList] = useState<ProductionBottleneckItem[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Custom Orders Admin Studio State
  const [allAdminCustomOrders, setAllAdminCustomOrders] = useState<CustomOrderData[]>([]);
  const [customOrderSubTab, setCustomOrderSubTab] = useState<'all' | 'requests' | 'paid'>('all');
  const [customOrderSearchQuery, setCustomOrderSearchQuery] = useState('');
  const [selectedCustomForAdminDetails, setSelectedCustomForAdminDetails] = useState<CustomOrderData | null>(null);
  const [selectedCustomForAdminReview, setSelectedCustomForAdminReview] = useState<CustomOrderData | null>(null);
  const [adminPriceInput, setAdminPriceInput] = useState('');
  const [adminReviewRemarks, setAdminReviewRemarks] = useState('');

  // Admin Broadcast & Direct Messages State
  const [adminMessagesList, setAdminMessagesList] = useState<AdminMessage[]>(getStoredAdminMessages());
  const [adminMsgRecipientType, setAdminMsgRecipientType] = useState<'All Staff' | 'Retail Staff' | 'Production Staff' | 'Specific Staff'>('All Staff');
  const [adminMsgTargetEmail, setAdminMsgTargetEmail] = useState('');
  const [adminMsgSubject, setAdminMsgSubject] = useState('');
  const [adminMsgContent, setAdminMsgContent] = useState('');

  // Granular Authority & Capability Management State
  const [userAuthoritiesList, setUserAuthoritiesList] = useState<UserAuthorityRecord[]>(getStoredUserAuthorities());
  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false);
  const [authorityEmail, setAuthorityEmail] = useState('');
  const [authorityRole, setAuthorityRole] = useState('Staff');
  const [isFullAdminChecked, setIsFullAdminChecked] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<CapabilityKey[]>([]);

  // Header & Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [adminLeaveRequests, setAdminLeaveRequests] = useState<WorkerLeaveItem[]>([]);

  const loadAdminLeaveRequests = async () => {
    try {
      const leaves = await fetchAllLeaveRequests();
      setAdminLeaveRequests(leaves);
    } catch (err) {
      console.error('Failed to load admin leave requests:', err);
    }
  };

  const handleAdminReviewLeave = async (leaveId: number, status: 'Approved' | 'Rejected', notes?: string) => {
    try {
      await reviewLeaveRequest(leaveId, status, notes, 'System Administrator');
      await loadAdminLeaveRequests();
    } catch (err) {
      console.error('Failed to review leave:', err);
    }
  };

  useEffect(() => {
    loadAdminLeaveRequests();
    window.addEventListener('leave-requests-updated', loadAdminLeaveRequests);
    return () => window.removeEventListener('leave-requests-updated', loadAdminLeaveRequests);
  }, []);

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const dbNotifs = await fetchNotificationsFromDB();
        setNotifications(dbNotifs || []);
      } catch (err) {
        setNotifications([]);
      }
    };
    loadNotifs();
  }, []);

  useEffect(() => {
    const refreshMsgs = () => setAdminMessagesList(getStoredAdminMessages());
    window.addEventListener('admin-messages-updated', refreshMsgs);
    return () => window.removeEventListener('admin-messages-updated', refreshMsgs);
  }, []);

  useEffect(() => {
    const loadSystemBIData = async () => {
      setIsLoadingSummary(true);
      const summary = await fetchAdminDashboardSummaryDB();
      if (summary) setDashboardSummary(summary);

      const rev = await fetchRevenueAnalyticsDB(analyticsTimeframe);
      if (rev) setRevenueAnalytics(rev);

      const bot = await fetchProductionBottlenecksDB();
      setBottlenecksList(bot || []);

      const logs = await fetchAuditLogsDB(50);
      setAuditLogsList(logs || []);
      setIsLoadingSummary(false);
    };

    loadSystemBIData();
  }, [analyticsTimeframe, activeTab]);

  useEffect(() => {
    const handleGlobalSearch = async () => {
      if (searchQuery.trim().length >= 2) {
        const results = await performGlobalSearchDB(searchQuery);
        setGlobalSearchResults(results);
        setIsSearchDropdownOpen(true);
      } else {
        setGlobalSearchResults([]);
        setIsSearchDropdownOpen(false);
      }
    };
    const timer = setTimeout(handleGlobalSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Current Admin Profile State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; initials: string }>({
    name: 'Administrator',
    email: 'admin@retailsphere.com',
    initials: 'AD'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.full_name || parsed.fullName || parsed.name || parsed.email || 'Administrator';
        const email = parsed.email || 'admin@retailsphere.com';

        let initials = 'AD';
        if (name) {
          const parts = name.trim().split(' ');
          if (parts.length >= 2) {
            initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          } else if (parts[0].length >= 2) {
            initials = parts[0].substring(0, 2).toUpperCase();
          } else {
            initials = parts[0][0].toUpperCase();
          }
        }

        setCurrentUser({ name, email, initials });
      }
    } catch (err) {
      console.warn('Error reading admin profile from localStorage:', err);
    }
  }, []);

  const handleSignOut = () => {
    clearUserSession();
    navigate('/login');
  };

  // Staff Management State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('All');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Form values for Add Staff & Worker
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('Retail Staff');
  const [newStaffWorkerSkill, setNewStaffWorkerSkill] = useState('Woodwork & Carpentry');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffIsDriver, setNewStaffIsDriver] = useState(false);

  // Form values for Edit Staff & Worker
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('Retail Staff');
  const [editStaffWorkerSkill, setEditStaffWorkerSkill] = useState('Woodwork & Carpentry');
  const [editStaffIsDriver, setEditStaffIsDriver] = useState(false);
  const [isSubmittingEditStaff, setIsSubmittingEditStaff] = useState(false);
  const [editStaffModalError, setEditStaffModalError] = useState<string | null>(null);

  const handleOpenEditStaffModal = (staff: StaffMember) => {
    setSelectedStaffForEdit(staff);
    setEditStaffName(staff.name || '');
    setEditStaffEmail(staff.email || '');
    setEditStaffPhone(staff.phone || '');
    setEditStaffRole(staff.role);
    setEditStaffWorkerSkill(staff.skill || 'Woodwork & Carpentry');
    setEditStaffIsDriver(Boolean((staff as any).is_driver));
    setEditStaffModalError(null);
    setIsEditStaffModalOpen(true);
  };

  const handleUpdateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForEdit || !selectedStaffForEdit.user_id) return;
    setIsSubmittingEditStaff(true);
    setEditStaffModalError(null);
    try {
      await updateUserDB(selectedStaffForEdit.user_id, {
        full_name: editStaffName.trim(),
        email: editStaffEmail.trim() || undefined,
        phone: editStaffPhone.trim() || undefined,
        role_name: editStaffRole,
        is_driver: editStaffIsDriver
      });

      setSuccessBanner(`${editStaffRole} account for "${editStaffName.trim()}" updated successfully!`);
      setIsEditStaffModalOpen(false);
      setSelectedStaffForEdit(null);
      await loadStaffFromDB();
    } catch (err: any) {
      setEditStaffModalError(err.message || 'Failed to update staff member details.');
    } finally {
      setIsSubmittingEditStaff(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  // Load Staff Users from DB
  const loadStaffFromDB = async () => {
    try {
      const [dbUsers, allUsers] = await Promise.all([
        fetchStaffUsers(),
        fetchAllUsers()
      ]);

      const rawList = [
        ...(Array.isArray(dbUsers) ? dbUsers : []),
        ...(Array.isArray(allUsers) ? allUsers : [])
      ];

      const staffMap = new Map<string, StaffMember>();

      for (const u of rawList) {
        const role = u.role || u.role_name || '';
        const email = (u.email || '').toLowerCase();
        const name = (u.name || u.full_name || '').toLowerCase();
        const userId = u.user_id || u.id;

        if (email === 'admin@retailsphere.com' || name === 'admin' || role === 'Admin' || role === 'Customer') {
          continue;
        }

        if (['Retail Staff', 'Production Staff', 'Artisan Worker', 'Worker', 'Staff'].includes(role)) {
          let roleName: 'Retail Staff' | 'Production Staff' | 'Artisan Worker' = 'Retail Staff';
          if (role === 'Production Staff') roleName = 'Production Staff';
          else if (role === 'Artisan Worker' || role === 'Worker') roleName = 'Artisan Worker';

          const memberKey = String(userId || email || u.id);
          if (!staffMap.has(memberKey)) {
            staffMap.set(memberKey, {
              id: u.id || `staff-${userId}`,
              user_id: typeof userId === 'number' ? userId : (parseInt(String(userId).replace(/\D/g, '')) || 1),
              name: u.name || u.full_name || (u.email ? u.email.split('@')[0].replace('.', ' ').replace(/^./, (str: string) => str.toUpperCase()) : 'Staff Member'),
              email: u.email || 'N/A',
              phone: u.phone || '+91 98765 43210',
              role: roleName,
              skill: u.skill || u.specialization || (roleName === 'Artisan Worker' ? 'Woodwork & Carpentry' : undefined),
              is_driver: u.is_driver,
              status: u.status === false || u.status === 'Inactive' ? 'Inactive' : 'Active',
              availability_status: u.availability_status || 'AVAILABLE',
              active_requests_count: u.active_requests_count || 0,
              active_jobs_count: u.active_jobs_count || 0,
              active_tasks_count: u.active_tasks_count || 0,
              completed_tasks_count: u.completed_tasks_count || 0,
              dateAdded: u.dateAdded || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'Recent')
            } as any);
          }
        }
      }

      setStaffMembers(Array.from(staffMap.values()));
    } catch (err) {
      console.warn('Could not fetch DB staff members:', err);
      setStaffMembers([]);
    }
  };

  useEffect(() => {
    loadStaffFromDB();
  }, []);

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (!staff.user_id) return;
    try {
      const res = await toggleUserStatusDB(staff.user_id);
      const newStatus: 'Active' | 'Inactive' = res.status ? 'Active' : 'Inactive';
      setStaffMembers(prev =>
        prev.map(s => (s.user_id === staff.user_id ? { ...s, status: newStatus } : s))
      );
      setSuccessBanner(`${staff.role} "${staff.name}" account set to ${newStatus.toUpperCase()}!`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setStaffFormError(err.message || 'Failed to update status.');
      setTimeout(() => setStaffFormError(null), 4000);
    }
  };

  const loadFleetDataFromDB = async () => {
    try {
      const summary = await fetchFleetSummaryDB();
      if (summary) setFleetSummaryData(summary);
      const list = await fetchVehiclesDB(fleetStatusFilter);
      setVehiclesList(list || []);
    } catch (err) {
      console.warn('Error loading fleet data:', err);
    }
  };

  useEffect(() => {
    loadFleetDataFromDB();
  }, [fleetStatusFilter, activeTab]);

  const handleOpenAddVehicleModal = () => {
    setVRegNumber('');
    setVType('Mini Truck');
    setVCapacity('500');
    setVDriverId('');
    setVStatus('AVAILABLE');
    setVNotes('');
    setVModelName('');
    setVYear('');
    setVehicleFormError(null);
    setIsAddVehicleModalOpen(true);
  };

  const handleOpenEditVehicleModal = (veh: VehicleItem) => {
    setSelectedVehicleForEdit(veh);
    setVRegNumber(veh.registration_number);
    setVType(veh.vehicle_type);
    setVCapacity(veh.capacity.toString());
    setVDriverId(veh.assigned_driver_id ? veh.assigned_driver_id.toString() : '');
    setVStatus(veh.status);
    setVNotes(veh.notes || '');
    setVModelName(veh.model_name || '');
    setVYear(veh.year ? veh.year.toString() : '');
    setVehicleFormError(null);
    setIsEditVehicleModalOpen(true);
  };

  const handleOpenVehicleDetailModal = async (veh: VehicleItem) => {
    try {
      const detail = await fetchVehicleDetailsDB(veh.vehicle_id);
      if (detail) {
        setSelectedVehicleForDetail(detail);
        setIsVehicleDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    }
  };

  const isValidVehicleRegistration = (reg: string) => {
    const clean = reg.trim().toUpperCase();
    if (!clean || clean.length < 4 || clean.length > 20) return false;
    const regRegex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{0,3}[-\s]?[0-9]{1,4}$|^[A-Z0-9\s-]{4,15}$/i;
    return regRegex.test(clean);
  };

  const handleCreateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vRegNumber.trim()) {
      setVehicleFormError('Registration number is required.');
      return;
    }
    if (!isValidVehicleRegistration(vRegNumber)) {
      setVehicleFormError('Invalid vehicle registration number format. Expected format like KL-01-AB-1234 or KL-14-1234.');
      return;
    }
    setIsSubmittingVehicle(true);
    setVehicleFormError(null);
    try {
      await createVehicleDB({
        registration_number: vRegNumber.trim(),
        vehicle_type: vType,
        capacity: parseInt(vCapacity) || 500,
        assigned_driver_id: vDriverId ? parseInt(vDriverId) : null,
        status: vStatus,
        notes: vNotes.trim() || undefined,
        model_name: vModelName.trim() || undefined,
        year: vYear ? parseInt(vYear) : undefined
      });

      setSuccessBanner(`Vehicle "${vRegNumber.trim().toUpperCase()}" added to company fleet successfully!`);
      setIsAddVehicleModalOpen(false);
      loadFleetDataFromDB();
    } catch (err: any) {
      setVehicleFormError(err.message || 'Failed to add vehicle to fleet.');
    } finally {
      setIsSubmittingVehicle(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForEdit) return;
    if (!isValidVehicleRegistration(vRegNumber)) {
      setVehicleFormError('Invalid vehicle registration number format. Expected format like KL-01-AB-1234 or KL-14-1234.');
      return;
    }
    setIsSubmittingVehicle(true);
    setVehicleFormError(null);
    try {
      await updateVehicleDB(selectedVehicleForEdit.vehicle_id, {
        registration_number: vRegNumber.trim(),
        vehicle_type: vType,
        capacity: parseInt(vCapacity) || 500,
        assigned_driver_id: vDriverId ? parseInt(vDriverId) : null,
        status: vStatus,
        notes: vNotes.trim(),
        model_name: vModelName.trim(),
        year: vYear ? parseInt(vYear) : undefined
      });

      setSuccessBanner(`Vehicle "${vRegNumber.trim().toUpperCase()}" details updated successfully!`);
      setIsEditVehicleModalOpen(false);
      setSelectedVehicleForEdit(null);
      loadFleetDataFromDB();
    } catch (err: any) {
      setVehicleFormError(err.message || 'Failed to update vehicle.');
    } finally {
      setIsSubmittingVehicle(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  // System User Management State
  const [allUsersList, setAllUsersList] = useState<SystemUserItem[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<'All Customers' | 'Active' | 'Inactive' | string>('All Customers');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<SystemUserItem | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<string>('Customer');
  const [editUserStatus, setEditUserStatus] = useState<boolean>(true);
  const [editUserIsDriver, setEditUserIsDriver] = useState<boolean>(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Purchased Products Modal State
  const [selectedUserForPurchases, setSelectedUserForPurchases] = useState<SystemUserItem | null>(null);
  const [isPurchasedProductsModalOpen, setIsPurchasedProductsModalOpen] = useState(false);

  // Edit Order Modal State
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<RetailOrder | null>(null);
  const [editOrderStatusValue, setEditOrderStatusValue] = useState<string>('Order Placed');
  const [editOrderPaymentStatusValue, setEditOrderPaymentStatusValue] = useState<string>('Paid');
  const [editOrderCompletionStatusValue, setEditOrderCompletionStatusValue] = useState<string>('Order Placed & Processing');

  const handleOpenEditOrder = (ord: RetailOrder) => {
    setSelectedOrderForEdit(ord);
    setEditOrderStatusValue(ord.orderStatus || 'Order Placed');
    setEditOrderPaymentStatusValue(ord.paymentStatus || 'Paid');
    const compInfo = computeLogicalCompletionStatus(ord);
    setEditOrderCompletionStatusValue(ord.completionStatus || compInfo.status);
  };

  const handleLogicallyGenerateCompletionStatus = () => {
    if (!selectedOrderForEdit) return;
    const info = computeLogicalCompletionStatus({
      ...selectedOrderForEdit,
      orderStatus: editOrderStatusValue || selectedOrderForEdit.orderStatus,
      paymentStatus: editOrderPaymentStatusValue || selectedOrderForEdit.paymentStatus
    });
    setEditOrderCompletionStatusValue(info.status);
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEdit) return;

    const compInfo = computeLogicalCompletionStatus({
      ...selectedOrderForEdit,
      orderStatus: editOrderStatusValue,
      paymentStatus: editOrderPaymentStatusValue,
      completionStatus: editOrderCompletionStatusValue
    });

    const finalStatus = editOrderCompletionStatusValue || compInfo.status;
    updateStoredRetailOrderCompletionStatus(
      selectedOrderForEdit.orderId,
      finalStatus,
      compInfo.percentage
    );

    const updatedList = orderList.map((o) =>
      o.orderId === selectedOrderForEdit.orderId
        ? {
            ...o,
            orderStatus: editOrderStatusValue as any,
            paymentStatus: editOrderPaymentStatusValue as any,
            completionStatus: finalStatus,
            completionPercentage: compInfo.percentage
          }
        : o
    );
    setOrderList(updatedList as any);
    localStorage.setItem('retailsphere_retail_orders_v1', JSON.stringify(updatedList));
    localStorage.setItem('retail_orders_list', JSON.stringify(updatedList));
    window.dispatchEvent(new Event('retail-orders-updated'));

    setSelectedOrderForEdit(null);
    setSuccessBanner(`Order #${selectedOrderForEdit.orderId} updated successfully with status "${finalStatus}"!`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const formatPaymentTime = (ord: any) => {
    if (ord.createdAt) {
      try {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
      } catch (e) {}
    }
    if (ord.orderDate) {
      try {
        const d = new Date(ord.orderDate);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
      } catch (e) {}
      return ord.orderDate;
    }
    return 'Recent';
  };

  const handleViewUserPurchases = (u: SystemUserItem) => {
    setSelectedUserForPurchases(u);
    setIsPurchasedProductsModalOpen(true);
  };

  // Load All Users from DB (Excluding Admins)
  const loadAllUsersFromDB = async () => {
    try {
      const data = await fetchAllUsers();
      if (data && Array.isArray(data)) {
        const nonAdmin = data.filter((u: any) => {
          const role = u.role || u.role_name || '';
          const email = (u.email || '').toLowerCase();
          const name = (u.full_name || u.name || '').toLowerCase();
          return role !== 'Admin' && email !== 'admin@retailsphere.com' && name !== 'admin';
        });
        setAllUsersList(nonAdmin);
      } else {
        setAllUsersList([]);
      }
    } catch (err) {
      console.warn('Could not fetch all users:', err);
      setAllUsersList([]);
    }
  };

  useEffect(() => {
    loadAllUsersFromDB();
  }, []);

  const handleOpenEditUser = (u: SystemUserItem) => {
    setEditingUser(u);
    setEditUserName(u.full_name || u.name);
    setEditUserEmail(u.email || '');
    setEditUserPhone(u.phone === '+91 98765 43210' ? '' : u.phone);
    setEditUserRole(u.role || u.role_name || 'Customer');
    setEditUserStatus(u.status !== false);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      await updateAdminUser(editingUser.user_id, {
        full_name: editUserName.trim(),
        email: editUserEmail.trim() || undefined,
        phone: editUserPhone.trim() || undefined,
        role_name: editUserRole,
        status: editUserStatus,
      });

      setSuccessBanner(`User "${editUserName.trim()}" updated successfully!`);
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      loadAllUsersFromDB();
    } catch (err: any) {
      setSuccessBanner(`Failed to update user: ${err.message}`);
    } finally {
      setIsUpdatingUser(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  const handleToggleUserStatus = async (user_id: number) => {
    try {
      const res = await toggleUserStatus(user_id);
      setSuccessBanner(`Account status set to ${res.status_text || (res.status ? 'Active' : 'Inactive')}.`);
      loadAllUsersFromDB();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
    } finally {
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  // Products Catalog Management State
  const [productList, setProductList] = useState<RetailProduct[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [newProdMaterial, setNewProdMaterial] = useState('Solid Teak Wood');
  const [isCustomMaterialMode, setIsCustomMaterialMode] = useState(false);
  const [customMaterialInput, setCustomMaterialInput] = useState('');

  const [newProdColor, setNewProdColor] = useState('Natural Wood');
  const [isCustomColorMode, setIsCustomColorMode] = useState(false);
  const [customColorInput, setCustomColorInput] = useState('');

  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdImage, setNewProdImage] = useState('');

  // Edit Product Modal State
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Living Room');
  const [editProdMaterial, setEditProdMaterial] = useState('Solid Teak Wood');
  const [editProdColor, setEditProdColor] = useState('Natural Wood');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');

  // Delete Product Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<RetailProduct | null>(null);

  // Load Inventory & Products from DB
  const loadProductsFromDB = async () => {
    setIsLoadingProducts(true);
    try {
      const dbItems = await fetchInventoryFromDB();
      if (Array.isArray(dbItems)) {
        const mapped: RetailProduct[] = dbItems.map((p: any) => {
          const stock = typeof p.stockCount === 'number'
            ? p.stockCount
            : (typeof p.stock_quantity === 'number' ? p.stock_quantity : (parseInt(p.stock_count || p.stockCount, 10) || 0));

          let derivedStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
          if (stock <= 0) derivedStatus = 'Out of Stock';
          else if (stock < 5) derivedStatus = 'Low Stock';

          return {
            id: p.id || `inv-${p.product_id}`,
            product_id: p.product_id || p.id,
            sku: p.sku || `SKU-RS-${p.product_id || p.id}`,
            name: p.name || p.product_name || 'Untitled Product',
            category: p.category || 'Living Room',
            material: p.material || 'Standard',
            color: p.color || 'Natural Wood',
            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
            stockCount: stock,
            status: derivedStatus,
            image_url: p.image_url || p.image,
          };
        });
        setProductList(mapped);
      } else {
        setProductList([]);
      }
    } catch (err) {
      console.warn('Could not fetch DB inventory for admin:', err);
      setProductList([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProductsFromDB();
  }, []);

  // Stock Control State & Low Stock Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItemToEdit, setStockItemToEdit] = useState<RetailProduct | null>(null);
  const [newStockVal, setNewStockVal] = useState('');
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Suppliers Directory State
  const [supplierList, setSupplierList] = useState<RetailSupplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<RetailSupplier | null>(null);
  const [newSupStatus, setNewSupStatus] = useState<'Active' | 'Inactive'>('Active');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const loadSuppliersFromDB = async () => {
    try {
      const dbSups = await fetchSuppliersFromDB();
      if (dbSups && Array.isArray(dbSups)) {
        setSupplierList(dbSups);
      } else {
        setSupplierList([]);
      }
    } catch (err) {
      console.warn('Could not load suppliers from DB:', err);
      setSupplierList([]);
    }
  };

  useEffect(() => {
    loadSuppliersFromDB();
  }, []);

  // Order Fulfillment Studio State
  const [orderList, setOrderList] = useState<RetailOrder[]>(() => getStoredRetailOrders() as any);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

  const loadAllOrdersForAdmin = async () => {
    try {
      const dbStoreOrders = await fetchRetailOrdersFromDB();
      const allCustomOrders = await fetchCustomOrders('All', true);
      setAllAdminCustomOrders(allCustomOrders || []);

      const paidCustomOrders = (allCustomOrders || []).filter(
        (c) => (c.payment_status || '').toLowerCase() === 'paid' || (c.order_status || '').toLowerCase() === 'paid' || (c.order_status || '').toLowerCase() === 'in production' || (c.order_status || '').toLowerCase() === 'completed'
      );
      
      const formattedCustom: RetailOrder[] = paidCustomOrders.map((c) => ({
        orderId: `CUSTOM-${c.custom_order_id}`,
        customerName: c.customer_name || 'Bespoke Customer',
        email: c.customer_email || 'customer@retailsphere.com',
        itemsCount: 1,
        totalAmount: c.estimated_price || 0,
        orderStatus: c.order_status === 'Paid' ? 'Processing' : (c.order_status === 'Completed' ? 'Delivered' : 'Processing'),
        paymentStatus: 'Paid',
        orderDate: c.order_date ? new Date(c.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        createdAt: c.order_date ? new Date(c.order_date).getTime() : Date.now() + c.custom_order_id * 1000,
        assignedWorkers: c.assigned_workers || [],
        items: [{
          id: `item-custom-${c.custom_order_id}`,
          name: `Custom ${c.furniture_type} (${c.material}, ${c.color})`,
          price: c.estimated_price || 0,
          quantity: 1,
          imageUrl: c.reference_image ? parseReferenceImages(c.reference_image)[0] || '' : ''
        }]
      }));

      const merged = [...formattedCustom, ...dbStoreOrders];
      merged.sort((a, b) => ((b as any).createdAt || 0) - ((a as any).createdAt || 0));
      setOrderList(merged as any);
    } catch (err) {
      console.warn('Error loading all orders for admin:', err);
    }
  };

  useEffect(() => {
    loadAllOrdersForAdmin();
    window.addEventListener('retail-orders-updated', loadAllOrdersForAdmin);
    window.addEventListener('custom-orders-updated', loadAllOrdersForAdmin);
    window.addEventListener('storage', loadAllOrdersForAdmin);
    return () => {
      window.removeEventListener('retail-orders-updated', loadAllOrdersForAdmin);
      window.removeEventListener('custom-orders-updated', loadAllOrdersForAdmin);
      window.removeEventListener('storage', loadAllOrdersForAdmin);
    };
  }, []);

  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered') => {
    const updated = orderList.map(o => o.orderId === orderId ? { ...o, orderStatus: newStatus } : o);
    setOrderList(updated);
    localStorage.setItem('retailsphere_retail_orders_v1', JSON.stringify(updated));
    window.dispatchEvent(new Event('retail-orders-updated'));
    setSuccessBanner(`Order #${orderId} status updated to ${newStatus}!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleAdminToggleLock = async (ord: CustomOrderData) => {
    await toggleLockOrderSpecifications(ord.custom_order_id);
    setSuccessBanner(`Customization Order #${ord.custom_order_id} specification lock toggled.`);
    setTimeout(() => setSuccessBanner(null), 5000);
    loadAllOrdersForAdmin();
  };

  const handleAdminOpenPriceModal = (ord: CustomOrderData) => {
    setSelectedCustomForAdminReview(ord);
    setAdminPriceInput(ord.estimated_price ? ord.estimated_price.toString() : '');
    setAdminReviewRemarks(ord.latest_remarks || '');
  };

  const handleAdminSubmitQuote = async (status: 'Approved' | 'Rejected') => {
    if (!selectedCustomForAdminReview) return;
    const priceNum = parseFloat(adminPriceInput);
    if (status === 'Approved' && (isNaN(priceNum) || priceNum <= 0)) {
      alert('Please enter a valid estimated price quote in ₹.');
      return;
    }
    await updateOrderStatus(selectedCustomForAdminReview.custom_order_id, status, priceNum, adminReviewRemarks);
    setSelectedCustomForAdminReview(null);
    setAdminPriceInput('');
    setAdminReviewRemarks('');
    setSuccessBanner(`Customization Order #${selectedCustomForAdminReview.custom_order_id} status updated to ${status}.`);
    setTimeout(() => setSuccessBanner(null), 5000);
    loadAllOrdersForAdmin();
  };

  const handleExportAnalyticsReport = () => {
    const readymadeStoreOrders = (orderList || []).filter(o => !String(o.orderId).startsWith('CUSTOM-'));
    const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
      (co: any) => (co.payment_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'in production' || 
                   (co.order_status || '').toLowerCase() === 'completed'
    );

    const realStoreRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
    const realCustomRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
    const realGrossRevenue = realStoreRevenue + realCustomRevenue;

    const totalOrdersCount = readymadeStoreOrders.length + paidCustomOrdersList.length;
    const completedOrdersCount = readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length + 
      paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length;
    const activeCustomBuildsCount = (allAdminCustomOrders || []).filter(
      (co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved'
    ).length;

    const csvContent = `Metric,Value\nGross Revenue,₹${realGrossRevenue}\nTotal Store & Custom Orders,${totalOrdersCount}\nCompleted Orders,${completedOrdersCount}\nActive Bespoke Builds,${activeCustomBuildsCount}\nTotal Registered System Accounts,${(allUsersList || []).length}\nReport Export Date,${new Date().toLocaleString()}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RetailSphere_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnalyticsPDF = () => {
    const readymadeStoreOrders = (orderList || []).filter(o => !String(o.orderId).startsWith('CUSTOM-'));
    const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
      (co: any) => (co.payment_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'in production' || 
                   (co.order_status || '').toLowerCase() === 'completed'
    );

    const realStoreRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
    const realCustomRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
    const realGrossRevenue = realStoreRevenue + realCustomRevenue;

    const totalOrdersCount = readymadeStoreOrders.length + paidCustomOrdersList.length;
    const completedOrdersCount = readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length + 
      paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length;
    const activeCustomBuildsCount = (allAdminCustomOrders || []).filter(
      (co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved'
    ).length;
    const totalUsersCount = (allUsersList || []).length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const ordersRowsHTML = [
      ...(orderList || []).map((o: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Catalog: ${(o.items && o.items[0]) ? o.items[0].name : 'Store Order'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${o.orderId}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">Catalog Item</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #2E7D32; font-weight: 800;">₹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${o.orderStatus || 'Completed'}</td>
        </tr>
      `),
      ...(allAdminCustomOrders || []).map((co: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Custom ${co.furniture_type} (${co.material || 'Wood'})</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">CUSTOM-${co.custom_order_id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">Bespoke Build</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #2E7D32; font-weight: 800;">₹${(co.estimated_price || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${co.order_status || 'In Production'}</td>
        </tr>
      `)
    ].join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RetailSphere AI - Executive Business Analytics Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #2C241D;
              background: #FFF;
              margin: 0;
              padding: 40px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #38A132;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
              color: #2C241D;
            }
            .brand span {
              color: #38A132;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              color: #2C241D;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta {
              font-size: 12px;
              color: #7A6C5E;
              margin-top: 4px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 35px;
            }
            .kpi-card {
              background: #FAF7F2;
              border: 1px solid #E2D7CB;
              border-radius: 16px;
              padding: 18px;
            }
            .kpi-label {
              font-size: 10px;
              font-weight: 800;
              color: #7A6C5E;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kpi-val {
              font-size: 22px;
              font-weight: 800;
              color: #2C241D;
              margin-top: 6px;
            }
            .kpi-sub {
              font-size: 11px;
              font-weight: 700;
              color: #38A132;
              margin-top: 4px;
            }
            .section-title {
              font-size: 15px;
              font-weight: 800;
              color: #2C241D;
              margin-bottom: 12px;
              border-left: 4px solid #38A132;
              padding-left: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 12px;
            }
            th {
              background: #FAF7F2;
              color: #7A6C5E;
              text-transform: uppercase;
              font-size: 10px;
              font-weight: 800;
              text-align: left;
              padding: 10px;
              border-bottom: 2px solid #E2D7CB;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E2D7CB;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #7A6C5E;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">RetailSphere<span>AI</span></div>
              <div class="meta">Executive Financial & Operational Analytics</div>
            </div>
            <div style="text-align: right;">
              <div class="title">Official Executive Analytics PDF</div>
              <div class="meta">Generated: ${formattedDate}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Gross Revenue</div>
              <div class="kpi-val">₹${realGrossRevenue.toLocaleString('en-IN')}</div>
              <div class="kpi-sub">PostgreSQL Synced</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Orders</div>
              <div class="kpi-val">${totalOrdersCount}</div>
              <div class="kpi-sub">${completedOrdersCount} Delivered</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Custom Builds</div>
              <div class="kpi-val">${activeCustomBuildsCount} Active</div>
              <div class="kpi-sub">In Production Roster</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Registered Users</div>
              <div class="kpi-val">${totalUsersCount}</div>
              <div class="kpi-sub">Verified Accounts</div>
            </div>
          </div>

          <div class="section-title">Live Orders & Bespoke Custom Builds Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Item / Custom Specification</th>
                <th>Order Reference</th>
                <th>Channel</th>
                <th>Total Value</th>
                <th>Order Status</th>
              </tr>
            </thead>
            <tbody>
              ${ordersRowsHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #7A6C5E;">No orders recorded.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div>CONFIDENTIAL — FOR INTERNAL EXECUTIVE REVIEW ONLY</div>
            <div>RetailSphere AI Business Analytics Engine</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderColorSwatchBadge = (colorStr?: string) => {
    if (!colorStr) return <span className="font-bold text-[#2C241D]">Natural Finish</span>;
    const hexMatch = colorStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {hexMatch && (
          <span
            className="w-3.5 h-3.5 rounded-full inline-block border border-black/30 shadow-2xs shrink-0"
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

    let categoryName = 'Bespoke Custom Furniture';
    const typeLower = (ord.furniture_type || '').toLowerCase();
    if (typeLower.includes('sofa') || typeLower.includes('chair') || typeLower.includes('seat') || typeLower.includes('recliner') || typeLower.includes('daybed')) {
      categoryName = 'Sofas & Living Room Seating';
    } else if (typeLower.includes('table') || typeLower.includes('dining') || typeLower.includes('coffee')) {
      categoryName = 'Dining & Center Tables';
    } else if (typeLower.includes('desk') || typeLower.includes('office') || typeLower.includes('workstation')) {
      categoryName = 'Executive Desks & Workspace';
    } else if (typeLower.includes('bed') || typeLower.includes('headboard') || typeLower.includes('bedroom')) {
      categoryName = 'Bespoke Beds & Bedroom';
    } else if (typeLower.includes('cabinet') || typeLower.includes('credenza') || typeLower.includes('wardrobe')) {
      categoryName = 'Storage & Architectural Cabinets';
    }

    fields.push({ label: 'Furniture Category', value: categoryName });
    fields.push({ label: 'Specific Furniture Type', value: ord.furniture_type });
    fields.push({ label: 'Custom Dimensions', value: ord.dimensions });
    fields.push({ label: 'Primary Timber / Material', value: ord.material });

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

  // Staff & Admin Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [queryFilter, setQueryFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [querySearchQuery, setQuerySearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<StaffQuery | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [adminResponseStatus, setAdminResponseStatus] = useState<'Pending' | 'In Review' | 'Approved' | 'Resolved'>('Approved');

  const loadQueriesFromDB = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      if (dbQueries && Array.isArray(dbQueries)) {
        setStaffQueries(dbQueries);
      } else {
        setStaffQueries([]);
      }
    } catch (err) {
      console.warn('Error loading DB queries in Admin:', err);
      setStaffQueries([]);
    }
  };

  useEffect(() => {
    loadQueriesFromDB();
  }, []);

  // Coupons Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [newCouponType, setNewCouponType] = useState<string>('percentage_notification');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('15');
  const [newCouponFlatAmount, setNewCouponFlatAmount] = useState('500');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponUserEmail, setNewCouponUserEmail] = useState('');
  const [newCouponAudience, setNewCouponAudience] = useState<string>('all');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState('10');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(true);
  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>([]);

  // Admin Profile Modal & Password Update State
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '+91 98765 11223',
    department: 'Executive Administration & Management',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser.name || currentUser.email) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: currentUser.name || 'Administrator',
        email: currentUser.email || 'admin@retailsphere.com',
        phone: '+91 98765 11223',
        department: 'Executive Administration & Management'
      }));
    }
  }, [currentUser]);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [newProdAvailableColors, setNewProdAvailableColors] = useState<string>('');

  // Handlers for Add Product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameTrim = newProdName.trim();
    if (!nameTrim || nameTrim.length < 2) {
      alert('Please enter a valid product title (at least 2 characters).');
      return;
    }

    const priceVal = parseFloat(newProdPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      alert('Please enter a valid positive price amount (greater than ₹0).');
      return;
    }

    const qty = parseInt(newProdStock);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid stock quantity (0 or greater).');
      return;
    }

    const imgUrl = newProdImage.trim() || undefined;

    const finalCategory = isCustomCategoryMode
      ? customCategoryInput.trim()
      : newProdCategory;
    const finalMaterial = isCustomMaterialMode
      ? customMaterialInput.trim()
      : newProdMaterial;
    const finalColor = isCustomColorMode
      ? customColorInput.trim()
      : newProdColor;

    if (!finalCategory) {
      alert('Please specify a valid product category.');
      return;
    }

    try {
      const created = await createProductInDB({
        name: newProdName.trim(),
        category: finalCategory,
        material: finalMaterial || 'Solid Wood',
        color: finalColor || 'Natural Wood',
        available_colors: (newProdAvailableColors.trim() || finalColor || 'Natural Wood'),
        price: priceVal,
        stock_count: qty,
        image_url: imgUrl,
      });

      const newItem: RetailProduct = {
        id: created.id || `prod-${Date.now()}`,
        sku: newProdSku.trim() || `SKU-RS-${created.product_id || Math.floor(100 + Math.random() * 900)}`,
        name: created.name || newProdName.trim(),
        category: created.category || finalCategory,
        material: created.material || finalMaterial,
        color: created.color || finalColor,
        price: created.price || priceVal,
        stockCount: created.stockCount || qty,
        status: created.status || 'In Stock',
        image_url: created.image_url || imgUrl,
      };

      setProductList((prev) => [newItem, ...prev]);
      setSuccessBanner(`Product "${newItem.name}" added to catalog successfully!`);
    } catch (err) {
      console.warn('Could not save product to DB, adding locally:', err);
      let statusVal: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (qty === 0) statusVal = 'Out of Stock';
      else if (qty < 5) statusVal = 'Low Stock';

      const newItem: RetailProduct = {
        id: `prod-${Date.now()}`,
        sku: newProdSku.trim() || `SKU-RS-${Math.floor(100 + Math.random() * 900)}`,
        name: newProdName.trim(),
        category: finalCategory,
        material: finalMaterial,
        color: finalColor,
        price: priceVal,
        stockCount: qty,
        status: statusVal,
        image_url: imgUrl,
      };
      setProductList((prev) => [newItem, ...prev]);
      setSuccessBanner(`Product "${newItem.name}" added to catalog successfully!`);
    }

    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdSku('');
    setNewProdImage('');
    setIsCustomCategoryMode(false);
    setCustomCategoryInput('');
    setIsCustomMaterialMode(false);
    setCustomMaterialInput('');
    setIsCustomColorMode(false);
    setCustomColorInput('');
    setIsAddProductModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Edit Product
  const handleOpenEditProduct = (prod: RetailProduct) => {
    setSelectedProduct(prod);
    setEditProdName(prod.name);
    setEditProdCategory(prod.category);
    setEditProdMaterial(prod.material);
    setEditProdPrice(prod.price.toString());
    setEditProdStock(prod.stockCount.toString());
    setIsEditProductModalOpen(true);
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !editProdName.trim()) return;

    const qty = parseInt(editProdStock) || 0;
    const priceVal = parseFloat(editProdPrice) || 0;

    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (qty === 0) newStatus = 'Out of Stock';
    else if (qty < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              name: editProdName.trim(),
              category: editProdCategory,
              material: editProdMaterial.trim(),
              price: priceVal,
              stockCount: qty,
              status: newStatus,
            }
          : p
      )
    );

    setIsEditProductModalOpen(false);
    setSelectedProduct(null);
    setSuccessBanner(`Product "${editProdName}" details updated successfully!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Delete Product
  const handleOpenDeleteModal = (prod: RetailProduct) => {
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    setProductList((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setIsDeleteModalOpen(false);
    setSuccessBanner(`Product "${productToDelete.name}" removed from catalog.`);
    setProductToDelete(null);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Stock Control Modal
  const handleOpenStockModal = (item: RetailProduct) => {
    setStockItemToEdit(item);
    setNewStockVal(item.stockCount.toString());
    setIsStockModalOpen(true);
  };

  const handleSaveStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockItemToEdit) return;

    const qty = parseInt(newStockVal) || 0;
    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (qty === 0) newStatus = 'Out of Stock';
    else if (qty < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((item) => (item.id === stockItemToEdit.id ? { ...item, stockCount: qty, status: newStatus } : item))
    );

    const dbId = parseInt(stockItemToEdit.id.replace('inv-', '').replace('prod-', '')) || undefined;
    if (dbId) {
      try {
        await updateStockInDB(dbId, qty);
      } catch (err) {
        console.warn('Failed to update stock in DB:', err);
      }
    }

    setIsStockModalOpen(false);
    setStockItemToEdit(null);
    setSuccessBanner(`Stock quantity for "${stockItemToEdit.name}" updated to ${qty} units!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setStaffFormError('Staff name and email address are required.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const created = await createStaffUser({
        full_name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        phone: newStaffPhone.trim() || undefined,
        role_name: newStaffRole,
        password: newStaffPassword.trim() || undefined,
        skill_name: newStaffRole === 'Artisan Worker' ? newStaffWorkerSkill : undefined,
      });

      const newMember: StaffMember = {
        id: `staff-${created.user_id || Date.now()}`,
        user_id: created.user_id,
        name: created.full_name || newStaffName.trim(),
        email: created.email || newStaffEmail.trim(),
        phone: newStaffPhone.trim() || '+91 98765 43210',
        role: newStaffRole,
        skill: newStaffRole === 'Artisan Worker' ? newStaffWorkerSkill : undefined,
        status: 'Active',
        dateAdded: 'Just Now',
      };

      setStaffMembers((prev) => [newMember, ...prev]);
      setSuccessBanner(
        newStaffRole === 'Artisan Worker'
          ? `Artisan Worker "${newMember.name}" (${newStaffWorkerSkill}) created & added to workshop roster!`
          : `Staff user "${newMember.name}" created! Credentials emailed to ${newMember.email}.`
      );
      setIsAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setStaffFormError(err.message || 'Failed to create account. Check if email already exists.');
    } finally {
      setIsSubmittingStaff(false);
      setTimeout(() => setSuccessBanner(null), 7000);
    }
  };

  // Handlers for Add/Edit Supplier
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupContact.trim() || !newSupPhone.trim()) return;

    if (editingSupplier) {
      setSupplierList((prev) =>
        prev.map((sup) =>
          sup.id === editingSupplier.id || (sup.supplier_id && sup.supplier_id === editingSupplier.supplier_id)
            ? {
                ...sup,
                supplier_name: newSupName.trim(),
                contact_person: newSupContact.trim(),
                phone: newSupPhone.trim(),
                address: newSupAddress.trim() || sup.address,
                status: newSupStatus,
              }
            : sup
        )
      );
      setSuccessBanner(`Supplier "${newSupName.trim()}" details updated successfully!`);
    } else {
      try {
        const created = await createSupplierInDB({
          supplier_name: newSupName.trim(),
          contact_person: newSupContact.trim(),
          phone: newSupPhone.trim(),
          email: newSupEmail.trim() || undefined,
          address: newSupAddress.trim() || 'Industrial Estate, India',
          gst_number: newSupGst.trim() || undefined,
        });

        setSupplierList((prev) => [{ ...created, status: newSupStatus }, ...prev]);
        setSuccessBanner(`Supplier "${created.supplier_name}" added successfully!`);
      } catch (err) {
        console.warn('Could not save supplier, fallback locally:', err);
        const fallback: RetailSupplier = {
          id: `sup-${Date.now()}`,
          supplier_name: newSupName.trim(),
          contact_person: newSupContact.trim(),
          phone: newSupPhone.trim(),
          address: newSupAddress.trim() || 'Furniture Supply Zone, India',
          assigned_products_count: 0,
          status: newSupStatus,
        };
        setSupplierList((prev) => [fallback, ...prev]);
        setSuccessBanner(`Supplier "${fallback.supplier_name}" added successfully!`);
      }
    }

    setEditingSupplier(null);
    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setNewSupGst('');
    setNewSupStatus('Active');
    setIsAddSupplierModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleOpenEditSupplierModal = (sup: RetailSupplier) => {
    setEditingSupplier(sup);
    setNewSupName(sup.supplier_name || '');
    setNewSupContact(sup.contact_person || '');
    setNewSupPhone(sup.phone || '');
    setNewSupAddress(sup.address || '');
    setNewSupStatus(sup.status || 'Active');
    setIsAddSupplierModalOpen(true);
  };

  const handleOpenAddSupplierModal = () => {
    setEditingSupplier(null);
    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupAddress('');
    setNewSupStatus('Active');
    setIsAddSupplierModalOpen(true);
  };

  // Handlers for Admin Query Response
  const handleOpenQueryModal = (query: StaffQuery) => {
    setSelectedQuery(query);
    setAdminResponseText(query.adminResponse || '');
    setAdminResponseStatus(query.status === 'Pending' ? 'Approved' : query.status);
  };

  const handleSendAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuery || !adminResponseText.trim()) return;

    const numericId = parseInt(selectedQuery.id.replace('query-', ''), 10);
    if (!isNaN(numericId)) {
      try {
        await respondToStaffQueryInDB(numericId, adminResponseText, adminResponseStatus);
        await loadQueriesFromDB();
      } catch (err) {
        console.warn('Failed to update query in DB, fallback local update:', err);
        const updated = respondToStaffQuery(selectedQuery.id, adminResponseText, adminResponseStatus);
        setStaffQueries(updated);
      }
    } else {
      const updated = respondToStaffQuery(selectedQuery.id, adminResponseText, adminResponseStatus);
      setStaffQueries(updated);
    }

    setSelectedQuery(null);
    setSuccessBanner(`Admin response submitted for ${selectedQuery.staffName}'s request!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Create Coupon & Send Email
  const handleBatchDispatchCoupon = async (coupon: Coupon) => {
    await refreshCoupons();
    setSuccessBanner(`Promo coupon ${coupon.code} active for all eligible customers.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const refreshCoupons = async () => {
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
    refreshCoupons();
  }, []);

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const code = newCouponCode.trim().toUpperCase();
    const discountVal = parseInt(newCouponDiscount, 10) || 15;
    const flatVal = parseFloat(newCouponFlatAmount) || 500;
    const targetEmail = newCouponUserEmail.trim();
    const limitVal = parseInt(newCouponCustomerLimit, 10) || 10;

    try {
      await createCouponApi({
        code,
        coupon_type: newCouponType,
        discount_percent: newCouponType === 'flat_amount' ? 0 : discountVal,
        flat_discount_amount: newCouponType === 'flat_amount' ? flatVal : 0,
        description: newCouponDesc.trim() || (newCouponType === 'flat_amount' ? `₹${flatVal} OFF Flat Discount` : `${discountVal}% Off Discount`),
        customer_limit: newCouponType === 'first_n_customers' ? limitVal : undefined,
        target_user_email: targetEmail || undefined
      });

      setSuccessBanner(`Coupon "${code}" created and saved to database successfully!`);
      await refreshCoupons();
      setNewCouponCode('');
      setNewCouponDesc('');
      setNewCouponUserEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    try {
      await deleteCouponApi(id);
      await refreshCoupons();
      setSuccessBanner(`Coupon "${code}" removed from database!`);
    } catch (err: any) {
      alert(err.message || 'Failed to remove coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleRegenerateCoupon = async (coupon: Coupon) => {
    try {
      await regenerateCouponApi(coupon.id);
      await refreshCoupons();
      setSuccessBanner(`⚡ Promo Coupon "${coupon.code}" reactivated!`);
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 5000);
  };
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        setPasswordError('Please enter your current password to confirm security updates.');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long.');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setPasswordError('New password and confirm password do not match.');
        return;
      }
    }

    try {
      await updateUserProfile({
        full_name: profileForm.full_name,
        current_password: profileForm.currentPassword || undefined,
        new_password: profileForm.newPassword || undefined,
      });

      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.full_name = profileForm.full_name;
        parsed.email = profileForm.email;
        localStorage.setItem('user', JSON.stringify(parsed));
      }

      let initials = 'AD';
      if (profileForm.full_name) {
        const parts = profileForm.full_name.trim().split(' ');
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (parts[0].length >= 2) {
          initials = parts[0].substring(0, 2).toUpperCase();
        }
      }

      setCurrentUser({ name: profileForm.full_name, email: profileForm.email, initials });
      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setIsAdminProfileModalOpen(false);
      setSuccessBanner('Admin profile & security credentials updated successfully!');
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update profile credentials in database.');
    }
  };

  const handleSendAdminMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsgSubject.trim() || !adminMsgContent.trim()) return;

    sendAdminMessage({
      sender: currentUser.name || 'System Admin',
      recipientType: adminMsgRecipientType,
      targetEmail: adminMsgRecipientType === 'Specific Staff' ? adminMsgTargetEmail : undefined,
      subject: adminMsgSubject.trim(),
      message: adminMsgContent.trim(),
    });

    setAdminMessagesList(getStoredAdminMessages());
    setAdminMsgSubject('');
    setAdminMsgContent('');
    setAdminMsgTargetEmail('');
    setSuccessBanner('Official message dispatched from Admin successfully!');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleOpenAuthorityModal = (targetEmail?: string, role?: string) => {
    const email = targetEmail || '';
    setAuthorityEmail(email);
    setAuthorityRole(role || 'Staff');
    const existing = getStoredUserAuthorities().find(a => a.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (existing) {
      setIsFullAdminChecked(existing.isFullAdmin);
      setSelectedCapabilities(existing.capabilities || []);
    } else {
      setIsFullAdminChecked(false);
      setSelectedCapabilities(['supplier_management', 'coupon_management']);
    }
    setIsAuthorityModalOpen(true);
  };

  const handleSaveAuthoritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorityEmail.trim()) return;

    const record: UserAuthorityRecord = {
      email: authorityEmail.trim(),
      role: authorityRole,
      isFullAdmin: isFullAdminChecked,
      capabilities: isFullAdminChecked ? CAPABILITY_DEFINITIONS.map(c => c.key) : selectedCapabilities,
      assignedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      assignedBy: currentUser.name || 'System Admin',
    };

    saveUserAuthority(record);
    setUserAuthoritiesList(getStoredUserAuthorities());
    setIsAuthorityModalOpen(false);
    setSuccessBanner(`Granted authority & capabilities assigned to ${authorityEmail}!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Calculations for KPI summary cards
  const totalProducts = productList.length;
  const totalInStock = productList.reduce((acc, item) => acc + item.stockCount, 0);
  const lowStockProductsList = productList.filter((item) => item.stockCount < 5);
  const lowStockCount = lowStockProductsList.length;
  const activeOrdersCount = orderList.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;

  const displayProducts = productList.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    let matchesPrice = true;
    if (priceRangeFilter === '<10k') matchesPrice = item.price < 10000;
    else if (priceRangeFilter === '10k-25k') matchesPrice = item.price >= 10000 && item.price <= 25000;
    else if (priceRangeFilter === '25k-50k') matchesPrice = item.price > 25000 && item.price <= 50000;
    else if (priceRangeFilter === '50k+') matchesPrice = item.price > 50000;

    const q = (productSearchQuery || searchQuery).toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.material.toLowerCase().includes(q) ||
      (item.color && item.color.toLowerCase().includes(q));

    let matchesStockStatus = true;
    if (stockStatusFilter === 'Low Stock') {
      matchesStockStatus = item.stockCount > 0 && item.stockCount < 5;
    } else if (stockStatusFilter === 'Out of Stock') {
      matchesStockStatus = item.stockCount <= 0;
    } else if (stockStatusFilter === 'In Stock') {
      matchesStockStatus = item.stockCount >= 5;
    }

    return matchesCategory && matchesPrice && matchesSearch && matchesStockStatus;
  });

  const filteredSuppliers = supplierList.filter((s) => {
    if (!supplierSearchQuery.trim()) return true;
    const q = supplierSearchQuery.toLowerCase();
    const matchesBasic =
      s.supplier_name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q));

    if (matchesBasic) return true;

    const isArun = s.supplier_name.toLowerCase().includes('arun');
    let prodsForSup: any[] = [];
    if (s.assigned_products && s.assigned_products.length > 0) {
      prodsForSup = s.assigned_products;
    } else {
      prodsForSup = isArun ? displayProducts.slice(0, 6) : displayProducts.slice(6);
    }

    return prodsForSup.some((p: any) => {
      const pName = (p.name || p.product_name || '').toLowerCase();
      const pSku = (p.sku || `SKU-RS-${p.product_id || p.id}` || '').toLowerCase();
      const pCategory = (p.category || '').toLowerCase();
      const pMaterial = (p.material || '').toLowerCase();
      return pName.includes(q) || pSku.includes(q) || pCategory.includes(q) || pMaterial.includes(q);
    });
  });

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
          <Link to="/dashboard" className="text-2xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <span>RetailSphere</span>
            <span className="text-[#38A132]">AI</span>
          </Link>
          <span className="text-[11px] font-extrabold text-[#38A132] uppercase tracking-[0.2em] block font-mono">
            ADMIN EXECUTIVE PORTAL
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="space-y-1.5 text-xs font-extrabold max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">Dashboard Overview</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'orders'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs">Orders & Requests</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('custom_orders')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'custom_orders'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4" />
              <span className="text-xs">Customer Requests</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'production'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Production & Bottlenecks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs">Stock & Raw Materials</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'staff'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span className="text-xs">Workers & Staff</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'fleet'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4" />
              <span className="text-xs">Fleet & Vehicles</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'users'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs">Customer Directory</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'products'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              <span className="text-xs">Product Catalog</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'suppliers'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs">Supplier Directory</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'analytics' || activeTab === 'reports'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Revenue & Analytics</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'alerts'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs">Needs Attention</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'audit'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              <span className="text-xs">System Audit Log</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'queries'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Queries & Requests</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'coupons'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4" />
              <span className="text-xs">Coupons & Discounts</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'broadcast'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4" />
              <span className="text-xs">Admin Directives</span>
            </div>
          </button>
        </nav>
      </aside>

        {/* MAIN RIGHT CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Mobile Top Header */}
          <div className="md:hidden bg-white border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#2C241D]">Admin Control Center</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['overview', 'orders', 'production', 'inventory'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize ${
                    activeTab === tab ? 'bg-[#48A63E] text-white' : 'bg-[#F9F6F0] text-[#2C241D]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
            <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative">
              {/* Glossy Top Reflection Sheen */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

              {/* SUCCESS NOTICE BANNER */}
              {successBanner && (
                <div className="bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] p-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-between animate-fadeIn relative z-20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#48A63E]" />
                    <span>{successBanner}</span>
                  </div>
                  <button onClick={() => setSuccessBanner(null)} className="text-[#48A63E] hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* TOP HEADER CONTROLS IN MAIN CONTENT AREA */}
              <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                    {activeTab === 'overview' && 'System-Wide Executive Dashboard & Control Center'}
                    {activeTab === 'analytics' && 'Executive Business Analytics & Performance Reports'}
                    {activeTab === 'users' && 'Customer Directory & Shopper Accounts'}
                    {activeTab === 'staff' && 'Staff Accounts & Workers Management'}
                    {activeTab === 'products' && 'Retail Product Management'}
                    {activeTab === 'inventory' && 'Stock & Raw Materials Control'}
                    {activeTab === 'suppliers' && 'Supplier Network & Vendor Management'}
                    {activeTab === 'orders' && 'Customer Orders & Requests'}
                    {activeTab === 'custom_orders' && 'Bespoke Customization & Customer Requests'}
                    {activeTab === 'production' && 'Production Control & Stage Bottlenecks'}
                    {activeTab === 'alerts' && 'Needs Attention & Operational Alerts'}
                    {activeTab === 'audit' && 'System-Wide Audit Log & Activity Feed'}
                    {activeTab === 'queries' && 'Queries & Request Communications'}
                    {activeTab === 'coupons' && 'Coupons & Customer Discounts Management'}
                    {activeTab === 'broadcast' && 'Admin Directives & Official Announcements'}
                  </h1>
                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                    {activeTab === 'overview' && 'Complete real-time business visibility, sales performance, production bottlenecks, and operational status calculated live from PostgreSQL.'}
                    {activeTab === 'analytics' && 'Track overall store revenue, order volume, category sales share, and custom build performance across RetailSphere AI.'}
                    {activeTab === 'users' && 'View, search, edit, activate, or deactivate registered customer accounts across RetailSphere AI.'}
                    {activeTab === 'staff' && 'Create and manage Retail Staff, Production Staff, and Artisan Worker accounts.'}
                    {activeTab === 'inventory' && 'Monitor finished furniture products and raw material timber/fabric inventory.'}
                    {activeTab === 'orders' && 'Track ready-made and custom furniture orders across the complete live fulfillment pipeline.'}
                    {activeTab === 'production' && 'Monitor stage progression, active build loads, and workstation bottleneck risks.'}
                    {activeTab === 'alerts' && 'Operational alerts requiring immediate administrative attention.'}
                    {activeTab === 'audit' && 'Complete chronological audit log of all system actions.'}
                  </p>
                </div>

                {/* Global Search + Controls */}
                <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                  {/* Global Search Field with Autocomplete */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6C5E]" />
                    <input
                      type="text"
                      placeholder="Global System Search (ID, User, Product)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/90 border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132] shadow-2xs text-[#2C241D]"
                    />
                    {isSearchDropdownOpen && globalSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] max-h-72 overflow-y-auto space-y-1 animate-fadeIn">
                        <div className="px-3 py-1.5 text-[10px] font-extrabold text-[#7A6C5E] uppercase border-b border-[#EFE7DE]">
                          Search Matches ({globalSearchResults.length})
                        </div>
                        {globalSearchResults.map((res) => (
                          <div
                            key={`${res.type}-${res.id}`}
                            onClick={() => {
                              setIsSearchDropdownOpen(false);
                              if (res.type === 'Order') setActiveTab('orders');
                              else if (res.type === 'Customization') setActiveTab('custom_orders');
                              else if (res.type === 'Product') setActiveTab('products');
                              else if (res.type === 'User') setActiveTab('users');
                            }}
                            className="p-2.5 rounded-xl hover:bg-[#FAF7F2] cursor-pointer transition-colors border border-transparent hover:border-[#E2D7CB]"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-[#2C241D]">
                              <span>{res.title}</span>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#38A132]/10 text-[#38A132] uppercase border border-[#38A132]/20">
                                {res.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7A6C5E] mt-0.5">{res.subtitle}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Export DB Excel Button */}
                  <button
                    onClick={handleExportDatabaseExcel}
                    disabled={isExportingExcel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8729] text-white text-xs font-extrabold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                    title="Export all PostgreSQL database tables and actual records to an Excel (.xlsx) workbook for inspection"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingExcel ? 'Exporting...' : 'Export DB (.xlsx)'}</span>
                  </button>

                  {/* Notification Bell Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(!isNotificationsOpen);
                        setIsUserMenuOpen(false);
                      }}
                      className="relative p-2 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] transition-all shadow-xs flex items-center justify-center cursor-pointer"
                      title="System Notifications"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#48A63E]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                          <span className="font-extrabold text-xs text-[#2C241D]">System Notifications</span>
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
                                </div>
                                <p className="text-[11px] text-[#5C4E42] leading-snug">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Name Dropdown Pill */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                      title="Click for profile and sign out options"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                        {currentUser.initials}
                      </div>
                      <span className="text-xs font-extrabold text-[#2C241D]">
                        {currentUser.name || 'Administrator'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                        <button
                          onClick={() => {
                            setIsAdminProfileModalOpen(true);
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
                            handleSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TAB OVERVIEW: SYSTEM-WIDE EXECUTIVE CONTROL CENTER */}
              {activeTab === 'overview' && (
                <div className="space-y-6 relative z-10">
                  {/* Top Level Business Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[#8C8275]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Revenue</span>
                        <DollarSign className="w-4 h-4 text-[#38A132]" />
                      </div>
                      <div className="text-2xl font-black text-[#2C241D]">
                        ₹{(dashboardSummary?.revenue_metrics?.total_revenue || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                        PostgreSQL Paid Payments
                      </span>
                    </div>

                    <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[#8C8275]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-black text-[#2C241D]">
                        {dashboardSummary?.business_metrics?.total_orders || orderList.length}
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                        Ready-made & Custom Builds
                      </span>
                    </div>

                    <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[#8C8275]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Active Customers</span>
                        <UserCheck className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-black text-[#2C241D]">
                        {dashboardSummary?.business_metrics?.active_customers || allUsersList.length}
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block">
                        Registered System Accounts
                      </span>
                    </div>

                    <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[#8C8275]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Low Stock Warnings</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black text-amber-600">
                        {dashboardSummary?.business_metrics?.low_stock_items || lowStockCount}
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block">
                        Items Under Reorder Level
                      </span>
                    </div>
                  </div>

                  {/* Revenue Analytics & Period Selector */}
                  <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#38A132]" />
                          <span>Revenue & Financial Performance Overview</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Calculated strictly from paid PostgreSQL transactions. Excludes cart values and unpaid quotes.</p>
                      </div>

                      {/* Timeframe Selector Pills */}
                      <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D7CB]">
                        {['today', '7days', '30days', 'this_month', 'this_year'].map((period) => (
                          <button
                            key={period}
                            onClick={() => setAnalyticsTimeframe(period)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold capitalize transition-all cursor-pointer ${
                              analyticsTimeframe === period
                                ? 'bg-[#38A132] text-white shadow-xs'
                                : 'text-[#7A6C5E] hover:text-[#2C241D]'
                            }`}
                          >
                            {period.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-1">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Today's Revenue</span>
                        <div className="text-lg font-black text-[#38A132]">₹{(dashboardSummary?.revenue_metrics?.todays_revenue || 0).toLocaleString('en-IN')}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-1">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">This Month Revenue</span>
                        <div className="text-lg font-black text-[#2C241D]">₹{(dashboardSummary?.revenue_metrics?.this_month_revenue || 0).toLocaleString('en-IN')}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-1">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Average Order Value</span>
                        <div className="text-lg font-black text-purple-700">₹{(revenueAnalytics?.average_order_value || 0).toLocaleString('en-IN')}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-1">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Refunds Total</span>
                        <div className="text-lg font-black text-red-600">₹{(dashboardSummary?.revenue_metrics?.refunds_total_amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Live Operational Order & Production Pipeline */}
                  <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                    <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Live Order & Custom Production Pipeline</span>
                    </h4>

                    {/* Stage Pipeline Progress Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Order Placed</span>
                        <div className="text-xl font-black text-[#2C241D]">{dashboardSummary?.order_status_counts?.Placed || 0}</div>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">New Orders</span>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Technical Review</span>
                        <div className="text-xl font-black text-[#2C241D]">{dashboardSummary?.production_status_summary?.technical_assessment || 0}</div>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block">Assessment</span>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Quotation / Approval</span>
                        <div className="text-xl font-black text-[#2C241D]">{dashboardSummary?.production_status_summary?.customer_approval || 0}</div>
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block">Pending Approval</span>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">In Production</span>
                        <div className="text-xl font-black text-[#38A132]">{dashboardSummary?.production_status_summary?.in_production || 0}</div>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">Workstation</span>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">QC Pending</span>
                        <div className="text-xl font-black text-amber-600">{dashboardSummary?.production_status_summary?.qc_pending || 0}</div>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block">Inspection</span>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-center">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Delivered</span>
                        <div className="text-xl font-black text-emerald-600">{dashboardSummary?.order_status_counts?.Delivered || 0}</div>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* Production Workstation Bottlenecks & Needs Attention Alert Center */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Workstation Bottlenecks Card */}
                    <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                        <span className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-[#38A132]" />
                          <span>Production Stage Bottlenecks</span>
                        </span>
                        <span className="text-[10px] font-extrabold bg-[#38A132]/10 text-[#38A132] px-2.5 py-0.5 rounded-full border border-[#38A132]/20">
                          {bottlenecksList.length} Stages Monitored
                        </span>
                      </h4>

                      <div className="space-y-3">
                        {bottlenecksList.length === 0 ? (
                          <div className="p-4 text-center text-[#7A6C5E] text-xs italic">
                            No production bottlenecks detected across shop floor workstations.
                          </div>
                        ) : (
                          bottlenecksList.map((bot) => (
                            <div key={bot.stage} className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] flex items-center justify-between">
                              <div>
                                <h5 className="font-extrabold text-xs text-[#2C241D]">{bot.stage} Stage</h5>
                                <p className="text-[11px] text-[#7A6C5E] font-medium">
                                  {bot.pending_jobs} pending jobs • {bot.in_progress_jobs} active • {bot.assigned_workers_count} craftsmen assigned
                                </p>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                                bot.risk === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                                bot.risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {bot.risk} RISK
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Operational Alerts / Needs Attention Card */}
                    <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Operational Alert Center ("Needs Attention")</span>
                        </span>
                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                          {(dashboardSummary?.alerts || []).length} Active Alerts
                        </span>
                      </h4>

                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {(dashboardSummary?.alerts || []).length === 0 ? (
                          <div className="p-4 text-center text-[#7A6C5E] text-xs italic">
                            All operations clear! No critical delays, QC failures, or inventory issues.
                          </div>
                        ) : (
                          (dashboardSummary?.alerts || []).map((alt) => (
                            <div key={alt.id} className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-amber-200 flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h5 className="font-extrabold text-xs text-[#2C241D]">{alt.title}</h5>
                                <p className="text-[11px] text-[#5C4E42] mt-0.5">{alt.description}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FLEET OVERVIEW & ACTIVE INTERNAL DELIVERIES (Requirement 19) */}
                  <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#38A132]" />
                        <span>Fleet Overview & Active Internal Deliveries</span>
                      </h4>
                      <button
                        onClick={() => setActiveTab('fleet')}
                        className="text-xs font-extrabold text-[#38A132] hover:text-[#2E8529] cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Manage Fleet</span>
                        <span>→</span>
                      </button>
                    </div>

                    {/* Compact Fleet Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-0.5">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Total Vehicles</span>
                        <div className="text-xl font-black text-[#2C241D]">{fleetSummaryData?.summary?.total || 0}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-0.5">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Available</span>
                        <div className="text-xl font-black text-emerald-600">{fleetSummaryData?.summary?.available || 0}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-0.5">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Assigned</span>
                        <div className="text-xl font-black text-blue-600">{fleetSummaryData?.summary?.assigned || 0}</div>
                      </div>

                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-0.5">
                        <span className="text-[10px] font-black text-[#7A6C5E] uppercase">Maintenance</span>
                        <div className="text-xl font-black text-amber-600">{fleetSummaryData?.summary?.maintenance || 0}</div>
                      </div>
                    </div>

                    {/* Active Internal Deliveries List */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-extrabold text-[#2C241D]">Active Internal Deliveries</h5>
                      {(!fleetSummaryData?.active_deliveries || fleetSummaryData.active_deliveries.length === 0) ? (
                        <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                          No active internal deliveries currently in transit.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2 px-3">Order ID</th>
                                <th className="py-2 px-3">Vehicle</th>
                                <th className="py-2 px-3">Driver</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                              {fleetSummaryData.active_deliveries.map((del) => (
                                <tr key={del.fulfillment_id} className="hover:bg-[#FAF7F2] cursor-pointer" onClick={() => setActiveTab('fleet')}>
                                  <td className="py-2 px-3 font-extrabold text-[#38A132]">{del.order_id}</td>
                                  <td className="py-2 px-3 font-bold">{del.vehicle_code} <span className="text-[#7A6C5E] font-normal">({del.registration_number})</span></td>
                                  <td className="py-2 px-3">{del.driver_name}</td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                      {del.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* System Audit Log & Chronological Activity Feed */}
                  <div className="ultra-glass-card rounded-3xl p-6 space-y-4 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                    <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2 border-b border-[#EFE7DE] pb-3">
                      <Clock className="w-4 h-4 text-[#38A132]" />
                      <span>System-Wide Chronological Activity & Audit Log</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3">Actor / Staff</th>
                            <th className="py-2.5 px-3">Action Performed</th>
                            <th className="py-2.5 px-3">Entity Type</th>
                            <th className="py-2.5 px-3">Entity ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          {(dashboardSummary?.recent_activities || auditLogsList).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-[#7A6C5E] italic">
                                System audit activity feed initialized. Real-time actions will log here.
                              </td>
                            </tr>
                          ) : (
                            (dashboardSummary?.recent_activities || auditLogsList).slice(0, 8).map((act) => (
                              <tr key={act.id} className="hover:bg-[#FAF7F2]">
                                <td className="py-2.5 px-3 font-mono text-[11px] text-[#7A6C5E]">{act.timestamp || 'Just now'}</td>
                                <td className="py-2.5 px-3 font-bold">{act.actorName} ({act.actorRole})</td>
                                <td className="py-2.5 px-3 font-extrabold text-[#38A132]">{act.action}</td>
                                <td className="py-2.5 px-3">{act.entityType}</td>
                                <td className="py-2.5 px-3 font-mono text-[#7A6C5E]">{act.entityId || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB ANALYTICS: EXECUTIVE BUSINESS ANALYTICS */}
              {activeTab === 'analytics' && (() => {
                // Precise DB Computations - Deduplicated across store and custom orders
                const readymadeStoreOrders = (orderList || []).filter(o => !String(o.orderId).startsWith('CUSTOM-'));
                const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
                  (co: any) => (co.payment_status || '').toLowerCase() === 'paid' || 
                               (co.order_status || '').toLowerCase() === 'paid' || 
                               (co.order_status || '').toLowerCase() === 'in production' || 
                               (co.order_status || '').toLowerCase() === 'completed'
                );

                const realStoreRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
                const realCustomRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
                const realGrossRevenue = realStoreRevenue + realCustomRevenue;

                const totalOrdersCount = readymadeStoreOrders.length + paidCustomOrdersList.length;
                const completedOrdersCount = readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length + 
                  paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length;

                const activeCustomBuildsCount = (allAdminCustomOrders || []).filter(
                  (co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved'
                ).length;

                const totalUsersCount = (allUsersList || []).length;

                // Dynamic Last 6 Months Revenue Grouping from Real DB Timestamps
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const now = new Date();
                const last6Months = Array.from({ length: 6 }).map((_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                  return {
                    monthLabel: monthNames[d.getMonth()],
                    mIdx: d.getMonth(),
                    yNum: d.getFullYear(),
                    storeVal: 0,
                    customVal: 0,
                  };
                });

                // Calculate store revenue per month (without duplicating custom orders)
                readymadeStoreOrders.forEach((ord: any) => {
                  let d: Date | null = null;
                  if (ord.createdAt) d = new Date(ord.createdAt);
                  else if (ord.orderDate) d = new Date(ord.orderDate);
                  
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) {
                      found.storeVal += (ord.totalAmount || 0);
                    }
                  }
                });

                // Calculate custom revenue per month
                paidCustomOrdersList.forEach((co: any) => {
                  let d: Date | null = null;
                  if (co.order_date) d = new Date(co.order_date);
                  else if (co.created_at) d = new Date(co.created_at);
                  
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) {
                      found.customVal += (co.estimated_price || 0);
                    }
                  }
                });

                const maxMonthVal = Math.max(
                  ...last6Months.map(m => Math.max(m.storeVal, m.customVal)),
                  1
                );

                // Dynamic Category Distribution from Real DB (deduplicated)
                const catTotalsMap: Record<string, number> = {};
                readymadeStoreOrders.forEach((ord: any) => {
                  (ord.items || []).forEach((it: any) => {
                    const catName = it.category || 'General Store Product';
                    catTotalsMap[catName] = (catTotalsMap[catName] || 0) + ((it.price || 0) * (it.quantity || 1));
                  });
                });
                paidCustomOrdersList.forEach((co: any) => {
                  const catName = `Bespoke ${co.furniture_type || 'Custom Build'}`;
                  catTotalsMap[catName] = (catTotalsMap[catName] || 0) + (co.estimated_price || 0);
                });

                const catList = Object.entries(catTotalsMap).sort((a, b) => b[1] - a[1]);
                const overallCatSum = catList.reduce((acc, curr) => acc + curr[1], 0) || 1;

                // Merge Real Orders for Performance Table (deduplicated)
                const combinedRealOrders = [
                  ...readymadeStoreOrders.map((o: any) => ({
                    id: o.orderId,
                    name: (o.items && o.items[0]) ? o.items[0].name : `Store Order #${o.orderId}`,
                    type: 'Catalog Order',
                    customer: o.customerName || 'Store Customer',
                    qty: o.itemsCount || 1,
                    value: o.totalAmount || 0,
                    amount: o.totalAmount || 0,
                    status: o.orderStatus || 'Processing',
                    date: o.orderDate || 'Recent'
                  })),
                  ...paidCustomOrdersList.map((co: any) => ({
                    id: `CUSTOM-${co.custom_order_id}`,
                    name: `Custom ${co.furniture_type || 'Furniture Build'}`,
                    type: 'Bespoke Custom',
                    customer: co.customer_name || 'Bespoke Customer',
                    qty: 1,
                    value: co.estimated_price || 0,
                    amount: co.estimated_price || 0,
                    status: co.order_status || 'In Production',
                    date: co.order_date || 'Recent'
                  }))
                ];

                return (
                  <div className="space-y-6 animate-fadeIn relative z-10">
                    {/* Key Performance Metrics KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* KPI 1: Real Gross Revenue */}
                      <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Gross Revenue</span>
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <DollarSign className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            ₹{realGrossRevenue.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-emerald-700">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Calculated from live orders</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 2: Real Total Orders */}
                      <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Total Orders</span>
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {totalOrdersCount} Orders
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-blue-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{completedOrdersCount} Completed</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 3: Active Custom Builds */}
                      <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Bespoke Builds</span>
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                            <Wrench className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {activeCustomBuildsCount} Active
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            <span>In Production / Approved</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 4: Total System Accounts */}
                      <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">System Users</span>
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {totalUsersCount} Accounts
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-purple-700">
                            <Users className="w-3.5 h-3.5" />
                            <span>Live System Accounts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeframe Filter & Export Controls Bar */}
                    <div className="flex items-center justify-end gap-3 relative z-30 pt-1 pb-1">
                      <div className="relative">
                        <select
                          value={analyticsTimeframe}
                          onChange={(e) => setAnalyticsTimeframe(e.target.value)}
                          className="pl-4 pr-9 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] hover:border-[#38A132] rounded-xl text-[#2C241D] font-extrabold appearance-none focus:outline-none focus:ring-2 focus:ring-[#38A132]/30 focus:border-[#38A132] shadow-xs cursor-pointer transition-all"
                        >
                          <option value="30days" className="bg-white text-[#2C241D]">Last 30 Days</option>
                          <option value="quarter" className="bg-white text-[#2C241D]">This Quarter</option>
                          <option value="ytd" className="bg-white text-[#2C241D]">Year to Date (2026)</option>
                          <option value="all" className="bg-white text-[#2C241D]">All Time</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#8C7C6D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Single Export Dropdown Button */}
                      <div className="relative z-50">
                        <button
                          onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                          className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F872A] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#38A132]/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Report</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportMenuOpen && (
                          <div className="absolute right-0 top-full mt-2 w-52 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                            <button
                              onClick={() => {
                                setIsExportMenuOpen(false);
                                handleExportAnalyticsPDF();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left"
                            >
                              <FileText className="w-4 h-4 text-[#38A132]" />
                              <div>
                                <span className="block font-black">Download PDF</span>
                                <span className="text-[10px] text-[#7A6C5E] font-medium block">Printable Audit Document</span>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setIsExportMenuOpen(false);
                                handleExportAnalyticsReport();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left"
                            >
                              <Download className="w-4 h-4 text-[#38A132]" />
                              <div>
                                <span className="block font-black">Export CSV</span>
                                <span className="text-[10px] text-[#7A6C5E] font-medium block">Spreadsheet Data File</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Monthly Revenue Trend Visual Bar Chart */}
                    <div className="w-full bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                        <div>
                          <h4 className="font-extrabold text-base text-[#2C241D]">6-Month Revenue Trend</h4>
                          <p className="text-xs text-[#6B5C4D]">Real comparison between Catalog Orders and Bespoke Custom Orders</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-[#38A132]">
                            <span className="w-3 h-3 rounded-full bg-[#38A132] inline-block" /> Catalog Orders
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Bespoke Custom
                          </span>
                        </div>
                      </div>

                      {/* Animated Bars */}
                      <div className="pt-4 pb-2">
                        <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
                          {last6Months.map((m, idx) => {
                            const storePct = maxMonthVal > 0 ? Math.min(100, Math.max(8, (m.storeVal / maxMonthVal) * 100)) : 8;
                            const customPct = maxMonthVal > 0 ? Math.min(100, Math.max(8, (m.customVal / maxMonthVal) * 100)) : 8;

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                                {/* Hover Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#2C241D] text-white text-[10px] p-2 rounded-xl shadow-xl z-20 pointer-events-none whitespace-nowrap text-center">
                                  <p className="font-extrabold">{m.monthLabel} {m.yNum}</p>
                                  <p className="text-emerald-400">Catalog: ₹{m.storeVal.toLocaleString('en-IN')}</p>
                                  <p className="text-amber-300">Custom: ₹{m.customVal.toLocaleString('en-IN')}</p>
                                </div>

                                <div className="w-full flex items-end justify-center gap-1 h-36 bg-[#EFE7DE]/50 rounded-2xl p-1 relative">
                                  <div
                                    className="w-1/2 bg-[#38A132] rounded-xl transition-all duration-500 group-hover:bg-[#2F872A]"
                                    style={{ height: `${storePct}%` }}
                                  />
                                  <div
                                    className="w-1/2 bg-amber-500 rounded-xl transition-all duration-500 group-hover:bg-amber-600"
                                    style={{ height: `${customPct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-extrabold text-[#524538]">{m.monthLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Top Selling Products & Workshop Roster Feed */}
                    <div className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                        <div>
                          <h4 className="font-extrabold text-base text-[#2C241D]">Store & Custom Orders Feed</h4>
                          <p className="text-xs text-[#6B5C4D]">Live order and custom build fulfillment status</p>
                        </div>
                        <span className="px-3 py-1 bg-[#38A132]/10 border border-[#38A132]/30 text-[#38A132] rounded-full text-[11px] font-extrabold">
                          Live Synced
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        {combinedRealOrders.length === 0 ? (
                          <div className="py-8 text-center text-[#8C7C6D]">
                            <p className="text-xs font-bold">No orders recorded yet.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] uppercase text-[10px] font-black tracking-wider">
                                <th className="py-2.5 px-3">Order ID / Item Name</th>
                                <th className="py-2.5 px-3">Order Type</th>
                                <th className="py-2.5 px-3">Quantity</th>
                                <th className="py-2.5 px-3">Valuation</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] text-[#2C241D] font-bold">
                              {combinedRealOrders.slice(0, 10).map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/60 transition-colors">
                                  <td className="py-3 px-3">
                                    <span className="block font-extrabold text-[#2C241D]">{row.name}</span>
                                    <span className="text-[10px] text-[#7A6C5E] font-mono">{row.id}</span>
                                  </td>
                                  <td className="py-3 px-3 text-[#7A6C5E]">{row.type}</td>
                                  <td className="py-3 px-3">{row.qty} Unit{row.qty > 1 ? 's' : ''}</td>
                                  <td className="py-3 px-3 text-[#38A132] font-extrabold">₹{(row.value || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                      row.status === 'Completed' || row.status === 'Delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : row.status === 'In Production' || row.status === 'Processing'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: FLEET & VEHICLES MANAGEMENT (Requirement 2-9) */}
              {activeTab === 'fleet' && (
                <div className="relative z-10 space-y-6 animate-fadeIn">
                  {/* Top Header & Add Vehicle CTA */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg">
                    <div>
                      <h3 className="text-xl font-extrabold text-[#2C241D] flex items-center gap-2.5">
                        <Truck className="w-6 h-6 text-[#38A132]" />
                        <span>Fleet & Vehicles Management</span>
                      </h3>
                      <p className="text-xs text-[#7A6C5E] font-medium mt-1">
                        Manage internal company delivery vehicles, capacity allocations, and driver assignments.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddVehicleModal}
                      className="px-4 py-2.5 bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 cursor-pointer transform active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Vehicle</span>
                    </button>
                  </div>

                  {/* Small Summary Statistics (From PostgreSQL DB) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Vehicles</span>
                        <Truck className="w-4 h-4 text-[#38A132]" />
                      </div>
                      <div className="text-3xl font-black text-[#2C241D]">
                        {fleetSummaryData?.summary?.total || vehiclesList.length}
                      </div>
                      <div className="text-[10px] font-bold text-[#7A6C5E]">Registered Internal Fleet</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Available</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-black text-emerald-600">
                        {fleetSummaryData?.summary?.available || vehiclesList.filter(v => v.status === 'AVAILABLE').length}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700">Ready for Order Dispatch</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Assigned</span>
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-3xl font-black text-blue-600">
                        {fleetSummaryData?.summary?.assigned || vehiclesList.filter(v => v.status === 'ASSIGNED').length}
                      </div>
                      <div className="text-[10px] font-bold text-blue-700">Currently Out on Delivery</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Maintenance</span>
                        <Wrench className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-3xl font-black text-amber-600">
                        {fleetSummaryData?.summary?.maintenance || vehiclesList.filter(v => v.status === 'MAINTENANCE').length}
                      </div>
                      <div className="text-[10px] font-bold text-amber-800">Under Servicing & Repairs</div>
                    </div>
                  </div>

                  {/* Filter Pills & Vehicle Search Bar */}
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-[#E2D7CB] shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Status Filter Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setFleetStatusFilter(st)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              fleetStatusFilter === st
                                ? 'bg-[#38A132] text-white shadow-sm'
                                : 'bg-[#F9F6F0] text-[#7A6C5E] hover:bg-[#F2ECE1] border border-[#E2D7CB]'
                            }`}
                          >
                            {st === 'ALL' ? 'All Fleet' : st}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search registration, type..."
                          value={fleetSearchQuery}
                          onChange={(e) => setFleetSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                        />
                      </div>
                    </div>

                    {/* Vehicle Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-extrabold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3">Vehicle ID</th>
                            <th className="py-3 px-3">Registration Number</th>
                            <th className="py-3 px-3">Vehicle Type</th>
                            <th className="py-3 px-3">Capacity</th>
                            <th className="py-3 px-3">Assigned Driver</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          {vehiclesList.filter(v => {
                            if (!fleetSearchQuery.trim()) return true;
                            const q = fleetSearchQuery.toLowerCase();
                            return v.id.toLowerCase().includes(q) ||
                                   v.registration_number.toLowerCase().includes(q) ||
                                   v.vehicle_type.toLowerCase().includes(q) ||
                                   v.assigned_driver_name.toLowerCase().includes(q);
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#7A6C5E] text-xs italic">
                                No internal vehicles match the current filter. Click "Add Vehicle" to register new fleet vehicles.
                              </td>
                            </tr>
                          ) : (
                            vehiclesList.filter(v => {
                              if (!fleetSearchQuery.trim()) return true;
                              const q = fleetSearchQuery.toLowerCase();
                              return v.id.toLowerCase().includes(q) ||
                                     v.registration_number.toLowerCase().includes(q) ||
                                     v.vehicle_type.toLowerCase().includes(q) ||
                                     v.assigned_driver_name.toLowerCase().includes(q);
                            }).map((veh) => (
                              <tr key={veh.vehicle_id} className="hover:bg-[#FAF7F2] transition-colors">
                                <td className="py-3.5 px-3 font-extrabold text-[#38A132] font-mono">{veh.id}</td>
                                <td className="py-3.5 px-3 font-extrabold text-[#2C241D] tracking-wide">{veh.registration_number}</td>
                                <td className="py-3.5 px-3 font-semibold">{veh.vehicle_type}</td>
                                <td className="py-3.5 px-3 font-bold text-[#6B5C4D]">{veh.capacity} kg</td>
                                <td className="py-3.5 px-3 font-semibold">{veh.assigned_driver_name}</td>
                                <td className="py-3.5 px-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                    veh.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    veh.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    veh.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {veh.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right space-x-2">
                                  <button
                                    onClick={() => handleOpenVehicleDetailModal(veh)}
                                    className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditVehicleModal(veh)}
                                    className="px-2.5 py-1.5 bg-[#FAF7F2] text-[#6B5C4D] border border-[#E2D7CB] rounded-lg hover:bg-[#EFE7DE] hover:text-[#2C241D] font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 0: CUSTOMER DIRECTORY & SHOPPER ACCOUNTS */}
              {activeTab === 'users' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Customers</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => (u.role || u.role_name || 'Customer') === 'Customer').length}
                      </div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Retail & Store Shoppers</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Shoppers</span>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => (u.role || u.role_name || 'Customer') === 'Customer' && u.status !== false).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Active Accounts</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Custom Build Buyers</span>
                        <ShoppingBag className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-purple-700 mt-2">
                        {allAdminCustomOrders.length}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Custom Furniture Orders</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Store Orders</span>
                        <PackageCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {getStoredRetailOrders().length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Total Store Orders</div>
                    </div>
                  </div>

                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {(['All Customers', 'Active', 'Inactive'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setUserRoleFilter(r as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            userRoleFilter === r
                              ? 'bg-[#48A63E] text-white shadow-xs'
                              : 'bg-[#F9F6F0] text-[#6B5C4D] hover:bg-[#EFE7DE]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customer name, email, phone..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Customer Details</th>
                          <th className="py-3 px-4">Email / Username</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Account Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {allUsersList
                          .filter((u) => {
                            const r = u.role || u.role_name || 'Customer';
                            if (r !== 'Customer') return false; // Strictly show ONLY Customers!
                            if (userRoleFilter === 'Active' && u.status === false) return false;
                            if (userRoleFilter === 'Inactive' && u.status !== false) return false;
                            return true;
                          })
                          .filter((u) => {
                            if (!userSearchQuery.trim()) return true;
                            const q = userSearchQuery.toLowerCase();
                            return (
                              (u.full_name || u.name || '').toLowerCase().includes(q) ||
                              (u.email || '').toLowerCase().includes(q) ||
                              (u.phone || '').toLowerCase().includes(q) ||
                              (u.role || u.role_name || '').toLowerCase().includes(q)
                            );
                          })
                          .map((u) => {
                            const roleStr = u.role || u.role_name || 'Customer';
                            const isAct = u.status !== false;
                            const displayName = u.full_name || u.name || u.email.split('@')[0];
                            const initials = displayName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={u.id || u.user_id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#48A63E]/20 text-[#48A63E] font-extrabold flex items-center justify-center text-xs">
                                    {initials}
                                  </div>
                                  <span className="font-extrabold text-[#2C241D]">{displayName}</span>
                                </td>
                                <td className="py-4 px-4 font-mono text-[#6B5C4D]">{u.email}</td>
                                <td className="py-4 px-4 text-[#6B5C4D]">{u.phone || '+91 98765 43210'}</td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                      roleStr === 'Production Staff'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : roleStr === 'Retail Staff'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    }`}>
                                      {roleStr}
                                    </span>
                                    {Boolean((u as any).is_driver) && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 shadow-xs">
                                        🚚 Driver
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    isAct
                                      ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {isAct ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                 <td className="py-4 px-4 text-right whitespace-nowrap">
                                   <div className="flex items-center justify-end gap-2">
                                      {roleStr.toLowerCase().includes('staff') ? (
                                        <button
                                          onClick={() => handleViewUserPurchases(u)}
                                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Products Sold by Staff"
                                        >
                                          <PackageCheck className="w-3.5 h-3.5" />
                                          <span>Sold Products</span>
                                        </button>
                                      ) : (roleStr.toLowerCase().includes('worker') || roleStr.toLowerCase().includes('craftsman')) ? (
                                        <button
                                          onClick={() => {
                                            setActiveTab('custom_orders');
                                            setCustomOrderSearchQuery(u.name || u.full_name || u.email || '');
                                          }}
                                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Production Builds Assigned to Worker"
                                        >
                                          <Wrench className="w-3.5 h-3.5" />
                                          <span>Assigned Jobs</span>
                                        </button>
                                      ) : roleStr.toLowerCase().includes('customer') ? (
                                        <button
                                          onClick={() => handleViewUserPurchases(u)}
                                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Customer Order Purchases"
                                        >
                                          <ShoppingBag className="w-3.5 h-3.5" />
                                          <span>Purchases</span>
                                        </button>
                                      ) : null}
                                      <button
                                        onClick={() => handleOpenEditUser(u)}
                                        className="px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-1 font-extrabold text-xs shadow-xs"
                                        title="Edit User Account Details"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleToggleUserStatus(u.user_id)}
                                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                          isAct
                                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 hover:shadow-rose-600/20'
                                            : 'bg-[#48A63E]/15 text-[#48A63E] hover:bg-[#48A63E] hover:text-white border border-[#48A63E]/30 hover:shadow-[#48A63E]/20'
                                        }`}
                                        title={isAct ? 'Deactivate Account' : 'Activate Account'}
                                      >
                                        {isAct ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                        <span>{isAct ? 'Deactivate' : 'Activate'}</span>
                                      </button>
                                   </div>
                                 </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 1: STAFF ACCOUNTS MANAGEMENT (ADMIN FEATURE) */}
              {activeTab === 'staff' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Staff & Workers Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Roster</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{staffMembers.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Active Accounts & Craftsmen</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Staff</span>
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Retail Staff').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Sales & Customer Operations</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Production Staff</span>
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Production Staff').length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Studio Managers & QC</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Artisan Workers</span>
                        <Wrench className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-purple-700 mt-2">
                        {staffMembers.filter(s => s.role === 'Artisan Worker').length}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Workshop Technicians</div>
                    </div>
                  </div>

                  {/* Header & Create Staff/Worker Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-b border-[#EFE7DE] pb-4">
                    <button
                      onClick={() => {
                        setNewStaffRole('Retail Staff');
                        setIsAddStaffModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Staff / Worker Member</span>
                    </button>
                  </div>

                  {/* Role Filters & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {['All', 'Retail Staff', 'Production Staff', 'Artisan Worker'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setStaffRoleFilter(role as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap ${
                            staffRoleFilter === role
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff name, email, phone..."
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Staff Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Email / Username</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Date Added</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {staffMembers
                          .filter((s) => staffRoleFilter === 'All' || s.role === staffRoleFilter)
                          .filter((s) => {
                            if (!staffSearchQuery.trim()) return true;
                            const q = staffSearchQuery.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.email.toLowerCase().includes(q) ||
                              s.phone.toLowerCase().includes(q) ||
                              s.role.toLowerCase().includes(q)
                            );
                          })
                          .map((staff) => (
                            <tr key={staff.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#48A63E]/20 text-[#48A63E] font-extrabold flex items-center justify-center text-xs">
                                  {staff.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span>{staff.name}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#6B5C4D]">{staff.email}</td>
                              <td className="py-4 px-4 text-[#6B5C4D]">{staff.phone}</td>
                              <td className="py-4 px-4">
                                <div className="space-y-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    staff.role === 'Production Staff'
                                      ? 'bg-amber-100 text-amber-800'
                                      : staff.role === 'Artisan Worker'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {staff.role}
                                  </span>
                                  {staff.skill && (
                                    <span className="block text-[10px] font-bold text-purple-700">
                                      🛠️ {staff.skill}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                  staff.status === 'Active'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E]/30'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}>
                                  {staff.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#7A6C5E]">{staff.dateAdded}</td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditStaffModal(staff)}
                                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Edit staff details, role, specialization, and driver authorization"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  {staff.status === 'Active' ? (
                                    <button
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                      title="Deactivate staff/worker account"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Deactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                      title="Activate staff/worker account"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Activate</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Artisan Worker Leave Applications & Absence Management Section */}
                  <div className="pt-6 border-t border-[#EFE7DE] space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#38A132]" />
                          <span>Artisan Worker Leave Applications & Absence Oversight</span>
                        </h4>
                        <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                          Review, approve, or reject leave requests submitted by artisan craftsmen. Real-time updates sync across Worker & Production Staff portals.
                        </p>
                      </div>
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        {adminLeaveRequests.filter(l => l.status === 'Pending').length} Pending Review
                      </span>
                    </div>

                    {adminLeaveRequests.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#7A6C5E] font-medium border-2 border-dashed border-[#E2D7CB] rounded-2xl bg-white/50">
                        No worker leave requests currently logged.
                      </div>
                    ) : (
                      <div className="overflow-x-auto bg-white/70 rounded-2xl border border-[#E2D7CB] p-2">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#EFE7DE] text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider bg-[#FAF7F2]">
                              <th className="py-3 px-4">Artisan Worker</th>
                              <th className="py-3 px-4">Leave Type</th>
                              <th className="py-3 px-4">Duration & Dates</th>
                              <th className="py-3 px-4">Reason</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions / Review</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE]">
                            {adminLeaveRequests.map((req) => (
                              <tr key={req.leave_id} className="hover:bg-[#F5ECE1]/40 transition-colors">
                                <td className="py-3.5 px-4 font-black text-[#2C241D] whitespace-nowrap">
                                  👷 {req.worker_name || `Worker #${req.worker_id}`}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-[#4A3E32]">
                                  {req.leave_type}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="font-extrabold text-[#2C241D] block">{req.duration_days} Day{req.duration_days > 1 ? 's' : ''}</span>
                                  <span className="text-[10px] text-[#7A6C5E] font-mono">{req.start_date} to {req.end_date}</span>
                                </td>
                                <td className="py-3.5 px-4 font-medium text-[#4A3E32] max-w-xs">
                                  {req.reason}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                    req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                    'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {req.status === 'Pending' ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleAdminReviewLeave(req.leave_id, 'Approved', 'Approved by System Administrator')}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-[11px] transition-all shadow-xs cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminReviewLeave(req.leave_id, 'Rejected', 'Rejected by System Administrator')}
                                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-extrabold text-[11px] transition-all shadow-xs cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[#7A6C5E] font-medium italic">
                                      Reviewed by {req.reviewed_by || 'Admin'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCTS CATALOG MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  {/* Product Catalog Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Products</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{productList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Furniture Store Catalog</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock Items</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter(p => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Available for Purchase</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Categories</span>
                        <Tag className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {new Set(productList.map(p => p.category).filter(Boolean)).size || 5}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Furniture Categories</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                    <button
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <span className="font-extrabold text-[#7A6C5E]">Category:</span>
                      {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office', ...productList.map(p => p.category).filter(c => c && !['Living Room', 'Dining Room', 'Bedroom', 'Home Office'].includes(c))].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors whitespace-nowrap ${
                            categoryFilter === cat
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#7A6C5E]">Price Filter:</span>
                        <select
                          value={priceRangeFilter}
                          onChange={(e) => setPriceRangeFilter(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                        >
                          <option value="All">All Prices</option>
                          <option value="<10k">Under ₹10,000</option>
                          <option value="10k-25k">₹10,000 - ₹25,000</option>
                          <option value="25k-50k">₹25,000 - ₹50,000</option>
                          <option value="50k+">Above ₹50,000</option>
                        </select>
                      </div>

                      <div className="relative w-full sm:w-56">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product, material, color..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Product Code (SKU)</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Material & Color</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Stock Count</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {displayProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D] flex items-center gap-3">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-10 h-10 rounded-xl object-cover border border-[#E2D7CB]" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-[#48A63E]/10 text-[#48A63E] font-bold flex items-center justify-center">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <span>{prod.name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#48A63E] font-extrabold">
                              <span className="bg-[#48A63E]/10 border border-[#48A63E]/20 px-2 py-0.5 rounded text-[11px]">
                                {prod.productCode || prod.sku || `SKU-RS-${prod.product_id || prod.id}`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">{prod.category}</td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">
                              <div>{prod.material}</div>
                              {prod.color && (
                                <span className="inline-block text-[10px] font-bold bg-[#FAF7F2] border border-[#E2D7CB] px-1.5 py-0.5 rounded text-[#48A63E] mt-0.5">
                                  {prod.color}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">₹{prod.price.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">{prod.stockCount} Units</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                prod.status === 'In Stock'
                                  ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                  : prod.status === 'Low Stock'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
                              }`}>
                                {prod.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Edit Product Button */}
                                <div className="relative group/tip">
                                  <button
                                    onClick={() => handleOpenEditProduct(prod)}
                                    className="p-2 rounded-xl text-[#6B5C4D] hover:text-[#48A63E] hover:bg-[#48A63E]/10 transition-all transform hover:scale-110 active:scale-95 border border-transparent hover:border-[#48A63E]/20 shadow-xs cursor-pointer"
                                    aria-label="Edit product details"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 -top-8 opacity-0 group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 transition-all duration-200 pointer-events-none bg-[#2C241D] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 border border-white/10 flex items-center gap-1">
                                    <span>Edit Specs</span>
                                  </div>
                                </div>

                                {/* Remove Product Button */}
                                <div className="relative group/tip">
                                  <button
                                    onClick={() => handleOpenDeleteModal(prod)}
                                    className="p-2 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 transition-all transform hover:scale-110 active:scale-95 border border-transparent hover:border-rose-700 shadow-xs cursor-pointer"
                                    aria-label="Remove product from catalog"
                                  >
                                    <PackageMinus className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 -top-8 opacity-0 group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 transition-all duration-200 pointer-events-none bg-rose-950 text-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 border border-rose-800/40 flex items-center gap-1">
                                    <span>Remove Item</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 3: STOCK CONTROL & WAREHOUSE */}
              {activeTab === 'inventory' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Stock Summary Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Items</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{totalProducts}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">{totalInStock} Total Units</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter((p) => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Sufficient Stock (5+ units)</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Low Stock Alert</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-amber-700 mt-2">
                        {productList.filter((p) => p.stockCount > 0 && p.stockCount < 5).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Under 5 Units Left</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Out of Stock</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-rose-700 mt-2">
                        {productList.filter((p) => p.stockCount <= 0).length}
                      </div>
                      <div className="text-[10px] text-rose-700 font-bold mt-1">0 Units Available</div>
                    </div>
                  </div>

                  {/* Controls Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                    {/* Stock Status Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStockStatusFilter(st)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            stockStatusFilter === st
                              ? st === 'Out of Stock'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : st === 'Low Stock'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-[#48A63E] text-white shadow-xs'
                              : 'bg-[#F9F6F0] text-[#6B5C4D] hover:bg-[#EFE7DE]'
                          }`}
                        >
                          {st === 'All' ? 'All Stock' : st}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search stock by name, SKU, category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        onClick={() => setShowLowStockModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Low Stock Alert ({lowStockProductsList.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">SKU / Code</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Available Units</th>
                          <th className="py-3 px-4">Stock Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {displayProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-[#7A6C5E]">
                              <SlidersHorizontal className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-2" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No stock inventory items found</p>
                              <p className="text-[11px] text-[#8C7C6D]">Try clearing search or choosing another stock status filter.</p>
                            </td>
                          </tr>
                        ) : (
                          displayProducts.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-3">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-[#48A63E]/10 text-[#48A63E] font-bold flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <span>{item.name}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#48A63E] font-extrabold">
                                <span className="bg-[#48A63E]/10 border border-[#48A63E]/20 px-2 py-0.5 rounded text-[11px]">
                                  {item.sku}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                              <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{item.price.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4 font-extrabold text-[#2C241D]">{item.stockCount} Units</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  item.status === 'In Stock'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30'
                                    : item.status === 'Low Stock'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleOpenStockModal(item)}
                                  className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
                                >
                                  Update Stock
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

              {/* TAB 4: SUPPLIER DIRECTORY */}
              {activeTab === 'suppliers' && (
                <div className="space-y-5">
                  {/* Supplier Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Suppliers</span>
                        <Briefcase className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{supplierList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Ready-Made Product Manufacturers</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Partners</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {supplierList.filter(s => s.status === 'Active' || !s.status).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Verified Wholesale & Furniture Vendors</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search by product name or code..."
                          value={supplierSearchQuery}
                          onChange={(e) => setSupplierSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        onClick={handleOpenAddSupplierModal}
                        className="px-4 py-2 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Supplier</span>
                      </button>
                    </div>
                  </div>

                  {/* Suppliers List */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredSuppliers.map((sup) => {
                      const isArun = sup.supplier_name.toLowerCase().includes('arun');
                      let prodsForSup: any[] = [];
                      if (sup.assigned_products && sup.assigned_products.length > 0) {
                        prodsForSup = sup.assigned_products;
                      } else {
                        prodsForSup = isArun ? displayProducts.slice(0, 6) : displayProducts.slice(6);
                      }

                      return (
                        <div key={sup.id} className="p-5 rounded-3xl bg-white border-2 border-[#E2D7CB] space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/10 text-[#48A63E] font-extrabold flex items-center justify-center text-sm">
                                {sup.supplier_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-base text-[#2C241D]">{sup.supplier_name}</h4>
                                <p className="text-xs text-[#7A6C5E] font-semibold">📞 {sup.phone}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-[#48A63E]/15 text-[#48A63E] text-xs font-extrabold">
                                {prodsForSup.length} Products Supplied
                              </span>
                              <button
                                onClick={() => handleOpenEditSupplierModal(sup)}
                                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Edit supplier details"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>

                          {/* Supplied Products Preview Table */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider block">Supplied Furniture Products:</span>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                              {prodsForSup.map((p: any, idx: number) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] flex items-center justify-between">
                                  <div>
                                    <span className="font-extrabold text-[#2C241D] block">{p.name || p.product_name}</span>
                                    <span className="font-mono text-[10px] text-[#48A63E] font-bold">
                                      {p.sku || `SKU-RS-${p.product_id || p.id || Math.floor(100 + Math.random() * 900)}`}
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-[#2C241D]">₹{(p.price || 12000).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

              {/* TAB 5: ORDER FULFILLMENT STUDIO */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  {/* Order Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-[#D97706]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{orderList.length}</div>
                      <div className="text-[10px] text-[#D97706] font-bold mt-1">Customer Purchases</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Pending Orders</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Order Placed').length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Awaiting Processing</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Production / Shipped</span>
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => o.orderStatus === 'Processing' || o.orderStatus === 'Shipped').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Fulfillment Active</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Delivered / Completed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => o.orderStatus === 'Delivered' || o.orderStatus === 'Paid').length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Successfully Fulfilled</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-[#7A6C5E]">Filter Status:</span>
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                      >
                        <option value="All">All Orders</option>
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search order ID, customer, email..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Order & Razorpay ID</th>
                          <th className="py-3 px-4">Customer Details</th>
                          <th className="py-3 px-4">Items & Product Code</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Payment Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {orderList
                          .filter((o) => {
                            if (!orderSearchQuery.trim()) return true;
                            const q = orderSearchQuery.toLowerCase();
                            return (
                              o.orderId.toLowerCase().includes(q) ||
                              o.customerName.toLowerCase().includes(q) ||
                              o.email.toLowerCase().includes(q) ||
                              (o.paymentId && o.paymentId.toLowerCase().includes(q))
                            );
                          }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                              <ShoppingBag className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No customer orders found</p>
                              <p className="text-[11px] text-[#8C7C6D]">When customers place ready-made furniture orders, they will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          orderList
                            .filter((o) => {
                              if (!orderSearchQuery.trim()) return true;
                              const q = orderSearchQuery.toLowerCase();
                              return (
                                o.orderId.toLowerCase().includes(q) ||
                                o.customerName.toLowerCase().includes(q) ||
                                o.email.toLowerCase().includes(q) ||
                                (o.paymentId && o.paymentId.toLowerCase().includes(q))
                              );
                            })
                            .map((ord) => (
                              <tr key={ord.orderId} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="font-mono font-extrabold text-[#48A63E] text-xs">{ord.orderId}</div>
                                  {ord.paymentId && (
                                    <div className="text-[10px] font-mono text-[#7A6C5E] mt-0.5 font-bold" title="Razorpay Payment ID">
                                      {ord.paymentId}
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                   <div className="font-extrabold text-[#2C241D] text-xs">{ord.customerName}</div>
                                   <div className="text-[11px] text-[#6B5C4D] font-semibold">{ord.email}</div>
                                   {ord.assignedWorkers && ord.assignedWorkers.length > 0 && (
                                     <div className="mt-1 font-extrabold text-[10px] text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded-md border border-[#38A132]/20 inline-flex items-center gap-1">
                                       <span>👷 {ord.assignedWorkers.map((w: any) => w.worker_name).join(', ')}</span>
                                     </div>
                                   )}
                                </td>
                                <td className="py-4 px-4">
                                  {ord.items && ord.items.length > 0 ? (
                                    <div className="space-y-2">
                                      {ord.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5">
                                          <img
                                            src={item.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"}
                                            alt={item.name}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80";
                                            }}
                                            className="w-9 h-9 rounded-lg object-cover border border-[#E2D7CB] shrink-0 bg-white shadow-xs"
                                          />
                                          <div>
                                            <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 border border-[#48A63E]/20 px-1.5 py-0.2 rounded inline-block">
                                              {(item as any).productCode || (item as any).sku || `SKU-RS-${item.id}`}
                                            </span>
                                            <div className="text-xs font-bold text-[#2C241D] line-clamp-1">{item.name} (x{item.quantity})</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[#6B5C4D] text-xs font-medium">{ord.itemsCount} Item(s)</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 font-extrabold text-[#2C241D] text-sm">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C241D]">
                                    <Clock className="w-3.5 h-3.5 text-[#48A63E]" />
                                    <span>{formatPaymentTime(ord)}</span>
                                  </div>
                                  <div className="text-[10px] text-[#7A6C5E] font-semibold mt-0.5">
                                    {ord.orderStatus === 'Cancelled' || ord.paymentStatus === 'Cancelled' ? (
                                      <span className="text-rose-600 font-extrabold flex items-center gap-1">
                                        <X className="w-3 h-3 text-rose-600" />
                                        Payment Cancelled
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Paid & Verified
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 5b: BESPOKE CUSTOMIZATION ORDERS & APPROVAL REQUESTS STUDIO */}
            {activeTab === 'custom_orders' && (
              <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                {/* Top Stats Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Total Customization Requests</span>
                    <span className="text-2xl font-black text-[#2C241D] block">{allAdminCustomOrders.length}</span>
                    <span className="text-[10px] text-[#48A63E] font-bold">All custom studio builds</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Approval Requests & Quotes Pending</span>
                    <span className="text-2xl font-black text-amber-600 block">
                      {allAdminCustomOrders.filter(c => c.order_status === 'Pending' || c.order_status === 'Pending Approval' || c.order_status === 'Approved').length}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">Awaiting quotation or customer payment</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Custom Orders Placed & Paid</span>
                    <span className="text-2xl font-black text-emerald-600 block">
                      {allAdminCustomOrders.filter(c => c.payment_status === 'Paid' || c.order_status === 'Paid' || c.order_status === 'In Production' || c.order_status === 'Completed').length}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Paid & verified custom builds</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Completed Artisan Builds</span>
                    <span className="text-2xl font-black text-purple-600 block">
                      {allAdminCustomOrders.filter(c => c.order_status === 'Completed').length}
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold">Delivered to customer</span>
                  </div>
                </div>

                {/* Filter & Search Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                    {[
                      { key: 'all', label: `All Custom Orders (${allAdminCustomOrders.length})` },
                      { key: 'requests', label: `Approval Requests (${allAdminCustomOrders.filter(c => c.order_status === 'Pending' || c.order_status === 'Pending Approval').length})` },
                      { key: 'paid', label: `Orders Placed (${allAdminCustomOrders.filter(c => c.payment_status === 'Paid' || c.order_status === 'Paid' || c.order_status === 'In Production').length})` }
                    ].map((tb) => (
                      <button
                        key={tb.key}
                        onClick={() => setCustomOrderSubTab(tb.key as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                          customOrderSubTab === tb.key
                            ? 'bg-[#38A132] text-white shadow-md'
                            : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                        }`}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search custom order #, furniture, client..."
                      value={customOrderSearchQuery}
                      onChange={(e) => setCustomOrderSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D] shadow-xs"
                    />
                  </div>
                </div>

                {/* Custom Orders List Grid */}
                <div className="space-y-4">
                  {allAdminCustomOrders
                    .filter((c) => {
                      if (customOrderSubTab === 'requests') {
                        return c.order_status === 'Pending' || c.order_status === 'Pending Approval' || c.order_status === 'Approved';
                      }
                      if (customOrderSubTab === 'paid') {
                        return c.payment_status === 'Paid' || c.order_status === 'Paid' || c.order_status === 'In Production' || c.order_status === 'Completed';
                      }
                      return true;
                    })
                    .filter((c) => {
                      if (!customOrderSearchQuery.trim()) return true;
                      const q = customOrderSearchQuery.toLowerCase();
                      return (
                        c.custom_order_id.toString().includes(q) ||
                        c.furniture_type.toLowerCase().includes(q) ||
                        c.customer_name.toLowerCase().includes(q) ||
                        (c.customer_email && c.customer_email.toLowerCase().includes(q)) ||
                        c.material.toLowerCase().includes(q) ||
                        c.color.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-[#E2D7CB] text-[#7A6C5E]">
                      <Sliders className="w-10 h-10 text-[#9E9082] mx-auto opacity-50 mb-2" />
                      <p className="font-extrabold text-sm text-[#2C241D]">No custom orders found</p>
                      <p className="text-xs text-[#8C7C6D] mt-0.5">Customization requests submitted by customers will be displayed here.</p>
                    </div>
                  ) : (
                    allAdminCustomOrders
                      .filter((c) => {
                        if (customOrderSubTab === 'requests') {
                          return c.order_status === 'Pending' || c.order_status === 'Pending Approval' || c.order_status === 'Approved';
                        }
                        if (customOrderSubTab === 'paid') {
                          return c.payment_status === 'Paid' || c.order_status === 'Paid' || c.order_status === 'In Production' || c.order_status === 'Completed';
                        }
                        return true;
                      })
                      .filter((c) => {
                        if (!customOrderSearchQuery.trim()) return true;
                        const q = customOrderSearchQuery.toLowerCase();
                        return (
                          c.custom_order_id.toString().includes(q) ||
                          c.furniture_type.toLowerCase().includes(q) ||
                          c.customer_name.toLowerCase().includes(q) ||
                          (c.customer_email && c.customer_email.toLowerCase().includes(q)) ||
                          c.material.toLowerCase().includes(q) ||
                          c.color.toLowerCase().includes(q)
                        );
                      })
                      .map((ord) => (
                        <div
                          key={ord.custom_order_id}
                          className="rounded-2xl p-3.5 shadow-sm border border-[#E2D7CB] bg-white/90 text-[#2C241D] space-y-2.5 hover:border-[#38A132]/50 hover:bg-white transition-all"
                        >
                          {/* Compact Top Header Bar */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-extrabold text-[#38A132] px-2.5 py-0.5 rounded-md bg-[#38A132]/10 border border-[#38A132]/25">
                                ORDER #{ord.custom_order_id}
                              </span>

                              {ord.payment_status === 'Paid' || ord.order_status === 'Paid' ? (
                                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Paid in Full</span>
                                </span>
                              ) : (
                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  ord.order_status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                  ord.order_status === 'Approved' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                  ord.order_status === 'In Production' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                  ord.order_status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                  'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                  Status: {ord.order_status}
                                </span>
                              )}

                              <h3 className="text-sm font-black text-[#2C241D] tracking-tight ml-1">
                                {ord.furniture_type}
                              </h3>
                            </div>

                            <div className="text-xs font-black text-[#38A132] bg-[#38A132]/10 px-3 py-0.5 rounded-lg border border-[#38A132]/20 shrink-0">
                              {ord.estimated_price ? `₹${ord.estimated_price.toLocaleString('en-IN')}` : 'Quote Pending'}
                            </div>
                          </div>

                          {/* Compact Specifications Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-xs">
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Client Name</span>
                              <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">👤 {ord.customer_name}</span>
                              <span className="text-[10px] text-[#7A6C5E] block truncate">{ord.customer_email || 'N/A'}</span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Dimensions</span>
                              <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">📐 {ord.dimensions}</span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Timber / Material</span>
                              <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">🪵 {ord.material}</span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Color & Finish</span>
                              <span className="font-extrabold text-[#38A132] block truncate text-[11px]">🎨 {renderColorSwatchBadge(ord.color)}</span>
                            </div>
                          </div>

                          {/* Reference Images Thumbnails */}
                          {ord.reference_image && parseReferenceImages(ord.reference_image).length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block shrink-0">Reference Images:</span>
                              {parseReferenceImages(ord.reference_image).map((imgUrl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => openImageInNewTab(imgUrl)}
                                  className="w-7 h-7 rounded-md overflow-hidden border border-[#E2D7CB] shadow-2xs block shrink-0 cursor-pointer"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Ref ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Compact Footer: Worker Banner + Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-[#EFE7DE]">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Wrench className="w-3.5 h-3.5 text-[#38A132] shrink-0" />
                              <span className="font-extrabold text-[#7A6C5E]">Assigned Artisan:</span>
                              {ord.assigned_workers && ord.assigned_workers.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {ord.assigned_workers.map((w, idx) => (
                                    <span key={idx} className="font-extrabold text-[#2C241D] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E2D7CB] text-[10px]">
                                      👷 {w.worker_name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-bold text-amber-800 italic bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                                  No Artisan Worker Assigned Yet
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => setSelectedCustomForAdminDetails(ord)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View Full Specs</span>
                              </button>

                              <button
                                onClick={() => handleAdminOpenPriceModal(ord)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <DollarSign className="w-3 h-3 text-amber-600" />
                                <span>{ord.estimated_price ? `Edit Price (₹${ord.estimated_price.toLocaleString()})` : 'Set Price Quote'}</span>
                              </button>

                              {!(ord.is_locked || ord.order_status === 'Approved' || ord.order_status === 'In Production' || ord.order_status === 'Completed' || (ord.estimated_price && ord.estimated_price > 0)) ? (
                                <button
                                  onClick={() => handleAdminToggleLock(ord)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                  title="Specs Unlocked. Click to Lock Specs."
                                >
                                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                  title="Specs Locked"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                              )}
                              {(ord.payment_status === 'Paid' || ord.order_status === 'Paid') && (
                                <button
                                  onClick={() => downloadPaymentReceipt(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Download className="w-3 h-3 text-white" />
                                  <span>Download Receipt</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: SYSTEM AUDIT LOG & ACTIVITY FEED */}
            {activeTab === 'audit' && (
              <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl bg-white/80 backdrop-blur-xl">
                {/* Header & Description */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#38A132]" />
                      <span>System-Wide Chronological Audit Log</span>
                    </h2>
                    <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                      Real-time activity audit trail capturing user actions, orders, inventory updates, and dispatches directly from PostgreSQL.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsLoadingSummary(true);
                      const logs = await fetchAuditLogsDB(100);
                      setAuditLogsList(logs || []);
                      setIsLoadingSummary(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#F9F6F0] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#38A132]" />
                    <span>Refresh Audit Trail</span>
                  </button>
                </div>

                {/* Audit Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-[#E2D7CB] shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Audit Logs</span>
                      <Clock className="w-4 h-4 text-[#38A132]" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D] mt-2">
                      {(dashboardSummary?.recent_activities || auditLogsList).length}
                    </div>
                    <div className="text-[10px] text-[#38A132] font-bold mt-1">Recorded System Events</div>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-[#E2D7CB] shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Order Events</span>
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-blue-700 mt-2">
                      {(dashboardSummary?.recent_activities || auditLogsList).filter((a: any) => (a.entityType || '').toLowerCase().includes('order') || (a.action || '').toLowerCase().includes('order')).length}
                    </div>
                    <div className="text-[10px] text-blue-700 font-bold mt-1">Placements & Dispatches</div>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-[#E2D7CB] shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Inventory & Catalog</span>
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-700 mt-2">
                      {(dashboardSummary?.recent_activities || auditLogsList).filter((a: any) => (a.entityType || '').toLowerCase().includes('product') || (a.entityType || '').toLowerCase().includes('inventory')).length}
                    </div>
                    <div className="text-[10px] text-amber-700 font-bold mt-1">Stock & Product Audits</div>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-[#E2D7CB] shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Security & Auth</span>
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-purple-700 mt-2">
                      {(dashboardSummary?.recent_activities || auditLogsList).filter((a: any) => (a.entityType || '').toLowerCase().includes('user') || (a.action || '').toLowerCase().includes('user') || (a.action || '').toLowerCase().includes('login')).length}
                    </div>
                    <div className="text-[10px] text-purple-700 font-bold mt-1">User & Role Actions</div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search timestamp, actor, action, entity ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                    />
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-black uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor / Staff Member</th>
                        <th className="py-3 px-4">Action Performed</th>
                        <th className="py-3 px-4">Entity Type</th>
                        <th className="py-3 px-4">Target Entity ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                      {(dashboardSummary?.recent_activities || auditLogsList)
                        .filter((act: any) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            (act.timestamp || '').toLowerCase().includes(q) ||
                            (act.actorName || '').toLowerCase().includes(q) ||
                            (act.actorRole || '').toLowerCase().includes(q) ||
                            (act.action || '').toLowerCase().includes(q) ||
                            (act.entityType || '').toLowerCase().includes(q) ||
                            (String(act.entityId || '')).toLowerCase().includes(q)
                          );
                        }).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#7A6C5E]">
                            <Clock className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-2" />
                            <p className="font-extrabold text-xs text-[#2C241D]">No system audit logs found</p>
                            <p className="text-[11px] text-[#7A6C5E] mt-0.5">Chronological system events and administrative actions will log here automatically.</p>
                          </td>
                        </tr>
                      ) : (
                        (dashboardSummary?.recent_activities || auditLogsList)
                          .filter((act: any) => {
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              (act.timestamp || '').toLowerCase().includes(q) ||
                              (act.actorName || '').toLowerCase().includes(q) ||
                              (act.actorRole || '').toLowerCase().includes(q) ||
                              (act.action || '').toLowerCase().includes(q) ||
                              (act.entityType || '').toLowerCase().includes(q) ||
                              (String(act.entityId || '')).toLowerCase().includes(q)
                            );
                          })
                          .map((act: any, idx: number) => (
                            <tr key={act.id || idx} className="hover:bg-[#FAF7F2] transition-colors">
                              <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#7A6C5E]">
                                {act.timestamp || 'Just now'}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-[#2C241D] text-xs">{act.actorName || 'System Admin'}</div>
                                <div className="text-[10px] text-[#7A6C5E] font-bold">{act.actorRole || 'Administrator'}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 font-extrabold text-xs text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/20 px-2.5 py-1 rounded-lg">
                                  {act.action}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#6B5C4D]">
                                <span className="px-2 py-0.5 rounded-md bg-[#F9F6F0] border border-[#E2D7CB] text-[10px] uppercase font-black tracking-wider">
                                  {act.entityType || 'General'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#7A6C5E]">
                                {act.entityId ? `#${act.entityId}` : '—'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: STAFF & CUSTOMER QUERIES */}
              {activeTab === 'queries' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-2">
                      {['All', 'Pending', 'Resolved'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setQueryFilter(st as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                            queryFilter === st
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff, email, subject, message..."
                        value={querySearchQuery}
                        onChange={(e) => setQuerySearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Queries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Submitted Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {staffQueries
                          .filter((q) => queryFilter === 'All' || (queryFilter === 'Pending' ? q.status === 'Pending' : q.status !== 'Pending'))
                          .filter((q) => {
                            if (!querySearchQuery.trim()) return true;
                            const sq = querySearchQuery.toLowerCase();
                            return (
                              q.staffName.toLowerCase().includes(sq) ||
                              q.staffEmail.toLowerCase().includes(sq) ||
                              q.subject.toLowerCase().includes(sq) ||
                              q.category.toLowerCase().includes(sq) ||
                              (q.message && q.message.toLowerCase().includes(sq))
                            );
                          }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                              <MessageSquare className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No queries or requests found</p>
                              <p className="text-[11px] text-[#8C7C6D]">Submitted staff and customer requests will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          staffQueries
                            .filter((q) => queryFilter === 'All' || (queryFilter === 'Pending' ? q.status === 'Pending' : q.status !== 'Pending'))
                            .filter((q) => {
                              if (!querySearchQuery.trim()) return true;
                              const sq = querySearchQuery.toLowerCase();
                              return (
                                q.staffName.toLowerCase().includes(sq) ||
                                q.staffEmail.toLowerCase().includes(sq) ||
                                q.subject.toLowerCase().includes(sq) ||
                                q.category.toLowerCase().includes(sq) ||
                                (q.message && q.message.toLowerCase().includes(sq))
                              );
                            })
                            .map((query) => (
                              <tr key={query.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">
                                  <div>{query.staffName}</div>
                                  <span className="text-[10px] text-[#7A6C5E] font-mono">{query.staffEmail}</span>
                                </td>
                                <td className="py-4 px-4 text-[#6B5C4D]">
                                  <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md font-bold text-[#48A63E]">
                                    {query.category}
                                  </span>
                                </td>
                                <td className="py-4 px-4 font-bold text-[#2C241D]">{query.subject}</td>
                                <td className="py-4 px-4 font-mono text-[#7A6C5E]">{query.createdAt}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    query.status === 'Resolved' || query.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {query.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <button
                                    onClick={() => handleOpenQueryModal(query)}
                                    className="px-3 py-1.5 rounded-xl bg-[#48A63E] text-white font-extrabold hover:bg-[#3D9134] transition-all shadow-xs cursor-pointer"
                                  >
                                    Respond
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

              {/* TAB 7: COUPONS & DISCOUNTS MANAGEMENT */}
              {activeTab === 'coupons' && (
                <div className="space-y-5">
                  {/* Coupon Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Coupons</span>
                        <Tag className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.filter(c => c.status === 'Active' && (!c.customerLimit || c.customerLimit <= 0 || (c.currentRedemptions || 0) < c.customerLimit)).length}
                      </div>
                      <div className="text-[10px] text-[#7C3AED] font-bold mt-1">Available Redeemable Coupons</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Shop Coupons</span>
                        <Percent className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Total Coupons Created</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Production & Custom</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.filter(c => c.audienceType === 'production').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Custom Furniture Orders</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Section Heading */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight">
                        Coupons & Customer Discounts Management
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Create promo codes, configure percentage discounts, and assign targeted coupons to customer accounts.
                      </p>
                    </div>
                  </div>

                  {/* Create Coupon Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Create & Configure Promotional Coupon</h4>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const prefix = newCouponType === 'percentage_notification' ? 'PROMO' : newCouponType === 'first_n_customers' ? 'FIRST' : 'FLAT';
                            const code = `${prefix}${newCouponDiscount || '15'}_${Math.floor(Math.random() * 90 + 10)}`;
                            setNewCouponCode(code);
                          }}
                          className="text-xs font-extrabold text-[#38A132] hover:underline cursor-pointer"
                        >
                          ⚡ Auto Generate Code
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
                      <div>
                        <label className="block font-bold text-[#7A6C5E] mb-1.5">Select Coupon Type *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewCouponType('percentage_notification')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'percentage_notification'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">1. Percentage % Coupon</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Delivers notification popover/bell to customer dashboard</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewCouponType('first_n_customers')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'first_n_customers'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">2. First N Customers Coupon</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Valid for first N customers during payment (0 prior notification)</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewCouponType('flat_amount')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'flat_amount'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">3. Flat Amount (₹ OFF)</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Fixed rupee discount off total cart subtotal</div>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Coupon Code *</label>
                          <input
                            type="text"
                            placeholder="e.g. SUMMER15"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-[#38A132]"
                            required
                          />
                        </div>

                        {newCouponType !== 'flat_amount' ? (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Discount % *</label>
                            <input
                              type="number"
                              min="1"
                              max="90"
                              placeholder="e.g. 15"
                              value={newCouponDiscount}
                              onChange={(e) => setNewCouponDiscount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Flat Discount Amount (INR ₹) *</label>
                            <input
                              type="number"
                              min="10"
                              placeholder="e.g. 500"
                              value={newCouponFlatAmount}
                              onChange={(e) => setNewCouponFlatAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        )}

                        {newCouponType === 'first_n_customers' ? (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">First N Customer Limit (N) *</label>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              placeholder="e.g. 10"
                              value={newCouponCustomerLimit}
                              onChange={(e) => setNewCouponCustomerLimit(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Target Customer Email (Optional)</label>
                            <input
                              type="text"
                              placeholder="Leave blank for all customers..."
                              value={newCouponUserEmail}
                              onChange={(e) => setNewCouponUserEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2">
                        <div className="text-[11px] text-[#7A6C5E] font-medium">
                          {newCouponType === 'percentage_notification' && '📢 Dispatches notification directly to Customer Dashboard bell icon.'}
                          {newCouponType === 'first_n_customers' && '🔒 First N customers redemption lock. Zero prior notifications sent.'}
                          {newCouponType === 'flat_amount' && '💵 Flat rupee discount applied directly during checkout payment.'}
                        </div>

                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Coupon</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Created Coupons & First N Offers Card Grid */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#38A132]" />
                        <span>Active Created Coupons & Promotional Offers</span>
                      </h4>
                      <span className="text-xs font-extrabold text-[#38A132] bg-[#38A132]/10 px-3 py-1 rounded-lg border border-[#38A132]/20">
                        {couponsList.length} Active Codes
                      </span>
                    </div>

                    {couponsList.length === 0 ? (
                      <div className="p-6 bg-white rounded-2xl border border-[#E2D7CB] text-center text-[#8C7C6D] italic text-xs">
                        No created coupons currently stored. Use the form above to generate a Percentage, First N Customer, or Flat Amount coupon!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {couponsList.map((c) => {
                          const isFirstN = c.type === 'first_n_customers' || (c.customerLimit && c.customerLimit > 0);
                          const limitN = c.customerLimit || 0;
                          const redeemed = c.currentRedemptions || 0;
                          const isExhausted = (limitN > 0 && redeemed >= limitN) || c.status === 'Inactive';

                          return (
                            <div
                              key={c.id}
                              className={`p-4 rounded-2xl border transition-all space-y-2 relative overflow-hidden shadow-2xs ${
                                isExhausted ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-[#E2D7CB] hover:border-[#38A132]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono text-sm font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded-lg border border-[#38A132]/25 inline-block uppercase">
                                    {c.code}
                                  </span>
                                  <div className="text-xs font-extrabold text-[#2C241D] mt-1">
                                    {c.flatDiscountAmount ? `₹${c.flatDiscountAmount.toLocaleString('en-IN')} OFF` : `${c.discountPercent}% OFF`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateCoupon(c)}
                                    className="px-2 py-1 rounded-lg bg-[#38A132]/10 text-[#38A132] hover:bg-[#38A132] hover:text-white transition-all border border-[#38A132]/30 text-[10px] font-extrabold cursor-pointer flex items-center gap-1"
                                    title="Regenerate & Reactivate Coupon Code"
                                  >
                                    ⚡ Regenerate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCoupon(c.id, c.code)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 cursor-pointer"
                                    title="Delete Coupon Code"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-[#6B5C4D] font-medium line-clamp-1">{c.description}</p>

                              <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between text-[10px] font-bold">
                                {isFirstN ? (
                                  <div className="space-y-1 w-full">
                                    <div className="flex items-center justify-between">
                                      <span className="text-blue-700 font-extrabold">🔒 First {limitN} Customers</span>
                                      <span className="text-[#2C241D] font-mono">{redeemed} / {limitN} Used</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#EAE0D4] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${isExhausted ? 'bg-rose-500' : 'bg-[#38A132]'}`}
                                        style={{ width: `${limitN > 0 ? Math.min(100, Math.round((redeemed / limitN) * 100)) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[#7A6C5E] truncate">
                                      {c.targetUserEmail ? `🎯 ${c.targetUserEmail}` : '🌐 All Customers'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${isExhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {isExhausted ? 'Expired' : 'Active'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Unified Customer Coupon Allotment & One-Time Usage Record Table */}
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#38A132]" />
                          <span>Customer Coupon Allotment & Usage Records</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of customer allotted coupons, delivery status, and single-use enforcement.</p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search promo code, email..."
                            value={couponSearchQuery}
                            onChange={(e) => setCouponSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                          />
                        </div>
                        <span className="text-xs font-extrabold text-[#38A132] bg-[#38A132]/10 px-3 py-1.5 rounded-xl border border-[#38A132]/20 shrink-0">
                          {allotmentsList.length} Records
                        </span>
                      </div>
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
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium">
                          {allotmentsList
                            .filter((alt) => {
                              if (!couponSearchQuery.trim()) return true;
                              const cq = couponSearchQuery.toLowerCase();
                              return (
                                alt.couponCode.toLowerCase().includes(cq) ||
                                alt.targetUserEmail.toLowerCase().includes(cq)
                              );
                            })
                            .length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#8C7C6D] italic">
                                No customer coupon allotments recorded yet. When a coupon is issued or dispatched to a customer email, it will be tracked here.
                              </td>
                            </tr>
                          ) : (
                            allotmentsList
                              .filter((alt) => {
                                if (!couponSearchQuery.trim()) return true;
                                const cq = couponSearchQuery.toLowerCase();
                                return (
                                  alt.couponCode.toLowerCase().includes(cq) ||
                                  alt.targetUserEmail.toLowerCase().includes(cq)
                                );
                              })
                              .map((alt) => (
                                <tr key={alt.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                    ✉️ {alt.targetUserEmail}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-extrabold text-[#38A132]">
                                    <span className="bg-[#38A132]/10 px-2 py-0.5 rounded-md border border-[#38A132]/20">
                                      {alt.couponCode}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                    {alt.discountPercent > 0 ? `${alt.discountPercent}% OFF` : 'Flat OFF'}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                    {alt.allottedDate}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {alt.used ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
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
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setAllotmentsList(prev => prev.filter(a => a.id !== alt.id));
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-2xs cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
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

              {/* TAB 8: ADMIN BROADCAST & DIRECT MESSAGES */}
              {activeTab === 'broadcast' && (
                <div className="space-y-5">
                  {/* Broadcast Overview KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Dispatched Messages</span>
                        <Send className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{adminMessagesList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Admin Directives & Announcements</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Staff Messages</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {adminMessagesList.filter(m => m.recipientType.includes('Staff')).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Retail & Production Directives</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                    <div className="border-b border-[#EFE7DE] pb-3">
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#48A63E]" />
                        Dispatch Message from Admin
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Send official announcements or direct messages to Staff members. Messages will appear directly on their dashboards as "Message from Admin".
                      </p>
                    </div>

                    {/* Dispatch Form */}
                    <form onSubmit={handleSendAdminMessageSubmit} className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Recipient Audience *</label>
                          <select
                            value={adminMsgRecipientType}
                            onChange={(e) => setAdminMsgRecipientType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                            required
                          >
                            <option value="All Staff">All Staff Members (Retail & Production)</option>
                            <option value="Retail Staff">Retail Staff Only</option>
                            <option value="Production Staff">Production Staff Only</option>
                            <option value="Specific Staff">Specific Staff Member (by Email)</option>
                          </select>
                        </div>

                        {adminMsgRecipientType === 'Specific Staff' && (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Account Email *</label>
                            <input
                              type="email"
                              placeholder="e.g. staff@retailsphere.com"
                              value={adminMsgTargetEmail}
                              onChange={(e) => setAdminMsgTargetEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                              required
                            />
                          </div>
                        )}

                        <div className={adminMsgRecipientType === 'Specific Staff' ? 'sm:col-span-2' : ''}>
                          <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Message Subject *</label>
                          <input
                            type="text"
                            placeholder="e.g. Urgent Inventory Count & Quality Assurance Directive"
                            value={adminMsgSubject}
                            onChange={(e) => setAdminMsgSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Message Content *</label>
                        <textarea
                          rows={3}
                          placeholder="Type your official announcement or directive message here..."
                          value={adminMsgContent}
                          onChange={(e) => setAdminMsgContent(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-medium text-xs focus:outline-none focus:border-[#48A63E]"
                          required
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#48A63E]/20 flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                          <span>Dispatch Message from Admin</span>
                        </button>
                      </div>
                    </form>

                    {/* Dispatched Messages Record Table */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-sm text-[#2C241D] border-b border-[#EFE7DE] pb-2">Dispatched Admin Messages Log</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Recipient Audience</th>
                              <th className="py-3 px-4">Subject</th>
                              <th className="py-3 px-4">Message Content</th>
                              <th className="py-3 px-4">Date Sent</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE]">
                            {adminMessagesList.filter((msg) => 
                              msg.recipientType === 'All Staff' || 
                              msg.recipientType === 'Retail Staff' || 
                              msg.recipientType === 'Production Staff' || 
                              msg.recipientType === 'Specific Staff'
                            ).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                                  No active staff admin messages dispatched.
                                </td>
                              </tr>
                            ) : (
                              adminMessagesList
                                .filter((msg) => 
                                  msg.recipientType === 'All Staff' || 
                                  msg.recipientType === 'Retail Staff' || 
                                  msg.recipientType === 'Production Staff' || 
                                  msg.recipientType === 'Specific Staff'
                                )
                                .map((msg) => (
                                  <tr key={msg.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-[#2C241D]">
                                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30">
                                        {msg.recipientType}
                                      </span>
                                      {msg.targetEmail && (
                                        <div className="text-[10px] text-[#7A6C5E] font-mono mt-0.5">{msg.targetEmail}</div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">{msg.subject}</td>
                                    <td className="py-3.5 px-4 text-[#6B5C4D] max-w-xs truncate">{msg.message}</td>
                                    <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">{msg.createdDate}</td>
                                    <td className="py-3.5 px-4">
                                      {msg.read || (msg.readByEmails && msg.readByEmails.length > 0) ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          Read ✓ {msg.readByEmails && msg.readByEmails.length > 0 ? `(${msg.readByEmails.length})` : ''}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          Delivered (Unread)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        onClick={() => setAdminMessagesList(deleteAdminMessage(msg.id))}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center gap-1 text-xs font-bold border border-rose-200 cursor-pointer"
                                        title="Delete Message Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
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
            </div>
          </main>
        </div>

      {/* MODAL 1: ADD STAFF MEMBER (High-Contrast Clean White Design) */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4 animate-fadeIn text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#2C241D]">Add Staff / Worker Member</h3>
                <p className="text-xs font-bold text-[#6B5C4D]">Account will be created & credentials emailed to staff/worker.</p>
              </div>
              <button onClick={() => setIsAddStaffModalOpen(false)} className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffFormError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-bold">
                {staffFormError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Verma"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address (Username) *</label>
                <input
                  type="email"
                  placeholder="ramesh@retailsphere.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Role *</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold cursor-pointer"
                >
                  <option value="Retail Staff" className="bg-white text-[#2C241D] font-bold">Retail Staff (Sales & Orders)</option>
                  <option value="Production Staff" className="bg-white text-[#2C241D] font-bold">Production Staff (Studio Manager / QC)</option>
                  <option value="Artisan Worker" className="bg-white text-[#2C241D] font-bold">Artisan Worker (Workshop Craftsman / Technician)</option>
                </select>
              </div>

              {newStaffRole === 'Artisan Worker' && (
                <div className="animate-fadeIn">
                  <label className="block font-extrabold text-[#2C241D] mb-1">Craftsman Specialization / Primary Skill *</label>
                  <select
                    value={newStaffWorkerSkill}
                    onChange={(e) => setNewStaffWorkerSkill(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 text-[#2C241D] font-extrabold text-xs cursor-pointer"
                  >
                    <option value="Woodwork & Carpentry" className="bg-white text-[#2C241D]">Woodwork & Carpentry (Furniture Framing & Timber Joinery)</option>
                    <option value="Upholstery & Cushioning" className="bg-white text-[#2C241D]">Upholstery & Cushioning (Fabric/Leather Padding)</option>
                    <option value="Assembly & Fitting" className="bg-white text-[#2C241D]">Assembly & Fitting (Hardware & Structural Assembly)</option>
                    <option value="Surface Finishing & Polishing" className="bg-white text-[#2C241D]">Surface Finishing & Polishing (Satin Varnish & Lacquer Polish)</option>
                    <option value="Custom Metalwork & Forging" className="bg-white text-[#2C241D]">Custom Metalwork & Forging (Steel/Brass Frames)</option>
                    <option value="Quality Inspection & QC" className="bg-white text-[#2C241D]">Quality Inspection & QC (Final Audit & Testing)</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#2C241D] text-xs flex items-center gap-1.5 cursor-pointer">
                    <Truck className="w-4 h-4 text-[#38A132]" />
                    <span>Driver Capability (Eligible to Drive Fleet Vehicle)</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={newStaffIsDriver}
                    onChange={(e) => setNewStaffIsDriver(e.target.checked)}
                    className="w-4 h-4 text-[#38A132] accent-[#38A132] rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-[#7A6C5E] font-medium">Mark this staff or worker as an eligible driver for company delivery vehicles.</p>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Temporary Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-mono text-xs font-bold placeholder:text-[#9E9082]"
                />
                <p className="text-[11px] font-bold text-[#6B5C4D] mt-1">Leave empty to auto-generate a strong password. Credentials will be emailed.</p>
              </div>

              <div className="pt-3 flex gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                  disabled={isSubmittingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="w-1/2 py-3 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmittingStaff ? <span>Creating...</span> : <><Mail className="w-4 h-4" /><span>Create & Send</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW PRODUCT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Add New Product</h3>
              <button onClick={() => setIsAddProductModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Boucle Chair"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  required
                />
              </div>

              {/* Category Field with Provision to Add New Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-extrabold text-[#2C241D]">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategoryMode(!isCustomCategoryMode);
                      if (!isCustomCategoryMode) setCustomCategoryInput('');
                    }}
                    className="text-[11px] font-extrabold text-[#48A63E] hover:underline"
                  >
                    {isCustomCategoryMode ? '← Select Existing' : '+ Add New Category'}
                  </button>
                </div>

                {isCustomCategoryMode ? (
                  <input
                    type="text"
                    placeholder="Enter new category name (e.g. Balcony & Garden)"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#48A63E]/60 rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
                    required
                  />
                ) : (
                  <select
                    value={newProdCategory}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setIsCustomCategoryMode(true);
                      } else {
                        setNewProdCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs"
                  >
                    {['Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio', ...productList.map(p => p.category).filter(c => c && !['Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio'].includes(c))].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__ADD_NEW__">+ Add New Category...</option>
                  </select>
                )}
              </div>

              {/* Material & Color Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Material Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Material</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomMaterialMode(!isCustomMaterialMode)}
                      className="text-[10px] font-bold text-[#48A63E]"
                    >
                      {isCustomMaterialMode ? 'Select' : '+ Custom'}
                    </button>
                  </div>
                  {isCustomMaterialMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Teak Slab"
                      value={customMaterialInput}
                      onChange={(e) => setCustomMaterialInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                      required
                    />
                  ) : (
                    <select
                      value={newProdMaterial}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomMaterialMode(true);
                        } else {
                          setNewProdMaterial(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                    >
                      {['Solid Teak Wood', 'Sheesham Wood', 'Oak Wood', 'Bouclé Fabric', 'Italian Velvet', 'Genuine Leather', 'Italian Marble', 'Rattan', 'Brass & Metal', 'Engineered Wood'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__CUSTOM__">Custom Material...</option>
                    </select>
                  )}
                </div>

                {/* Color Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Color / Finish</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomColorMode(!isCustomColorMode)}
                      className="text-[10px] font-bold text-[#48A63E]"
                    >
                      {isCustomColorMode ? 'Select' : '+ Custom'}
                    </button>
                  </div>
                  {isCustomColorMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Walnut Brown"
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                      required
                    />
                  ) : (
                    <select
                      value={newProdColor}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomColorMode(true);
                        } else {
                          setNewProdColor(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                    >
                      {['Natural Wood', 'Walnut Brown', 'Ivory White', 'Charcoal Gray', 'Emerald Green', 'Royal Navy Blue', 'Warm Beige', 'Rose Pink', 'Matte Black'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__CUSTOM__">Custom Color...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="24999"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Stock Count</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">
                  Available Color Options (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emerald Green, Warm Beige, Charcoal Black, Slate Grey"
                  value={newProdAvailableColors}
                  onChange={(e) => setNewProdAvailableColors(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold text-xs"
                />
                <span className="text-[10px] text-[#7A6C5E] block mt-0.5 font-medium">
                  Enter multiple color choices (e.g., Emerald Green, Warm Beige, Charcoal Black). Leave single for 1 color.
                </span>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCT */}
      {isEditProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Edit Product Details</h3>
              <button onClick={() => setIsEditProductModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REMOVE PRODUCT CONFIRMATION */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-[#E2D7CB] space-y-4 text-center">
            <PackageMinus className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-extrabold text-[#2C241D]">Remove Product from Catalog?</h3>
            <p className="text-xs text-[#7A6C5E]">Are you sure you want to remove <strong>"{productToDelete.name}"</strong> from catalog?</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold text-xs cursor-pointer hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UPDATE STOCK */}
      {isStockModalOpen && stockItemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-[#E2D7CB] space-y-4">
            <h3 className="text-base font-extrabold text-[#2C241D]">Update Warehouse Stock</h3>
            <p className="text-xs text-[#7A6C5E]">{stockItemToEdit.name}</p>

            <form onSubmit={handleSaveStockUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">New Total Stock Units</label>
                <input
                  type="number"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: LOW STOCK REPORT MODAL */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-2xl shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold">Low Stock Inventory Alert Report</h3>
              </div>
              <button onClick={() => setShowLowStockModal(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Product Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Stock Units</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE] font-medium">
                  {lowStockProductsList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F5ECE1]/60">
                      <td className="py-3 px-3 font-bold text-[#2C241D]">{item.name}</td>
                      <td className="py-3 px-3 text-[#6B5C4D]">{item.category}</td>
                      <td className="py-3 px-3 font-bold">₹{item.price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-amber-800 font-extrabold">{item.stockCount} Units</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setShowLowStockModal(false);
                            handleOpenStockModal(item);
                          }}
                          className="px-2.5 py-1 bg-[#48A63E] text-white rounded-lg text-[11px] font-bold"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD SUPPLIER */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">
                  {editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_name}` : 'Add Product Supplier'}
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">
                  {editingSupplier ? 'Update vendor contact details, phone, address & status.' : 'Register wholesale vendors and ready-made product manufacturers.'}
                </p>
              </div>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Manufacturer / Vendor Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Teak Crafts & Furniture Ltd"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Arun Raj"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9778237180"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Vendor Status</label>
                <select
                  value={newSupStatus}
                  onChange={(e) => setNewSupStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold text-xs cursor-pointer"
                >
                  <option value="Active">Active (Fulfilling Orders)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  {editingSupplier ? 'Save Changes' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: RESPOND TO QUERY MODAL */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">Respond to Staff Request</h3>
              <button onClick={() => setSelectedQuery(null)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F9F6F0] rounded-xl border border-[#E2D7CB] text-xs space-y-1">
              <p className="font-extrabold text-[#2C241D]">{selectedQuery.staffName} ({selectedQuery.staffEmail})</p>
              <p className="font-bold text-[#48A63E]">{selectedQuery.category}: {selectedQuery.subject}</p>
              <p className="text-[#6B5C4D] italic">"{selectedQuery.message}"</p>
            </div>

            <form onSubmit={handleSendAdminResponse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Set Resolution Status</label>
                <select
                  value={adminResponseStatus}
                  onChange={(e) => setAdminResponseStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                >
                  <option value="Approved">Approved</option>
                  <option value="Resolved">Resolved</option>
                  <option value="In Review">In Review</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Admin Response Message</label>
                <textarea
                  rows={4}
                  placeholder="Enter response or confirmation details..."
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuery(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Send Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: ADMIN PROFILE & SECURITY MODAL */}
      {isAdminProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Admin Security & Profile Settings</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Update credentials & system access settings</p>
              </div>
              <button
                onClick={() => setIsAdminProfileModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-bold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSaveAdminProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Admin Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#E2D7CB] space-y-2">
                <span className="font-extrabold text-[#2C241D] block">Update Password Credentials</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New Password (min 6 chars)"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs placeholder-[#8C7C6D]"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm New Password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminProfileModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold bg-[#EAE0D4] hover:bg-[#DED2C2] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold transition-all shadow-md shadow-[#38A132]/20 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT USER */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 relative z-50">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Edit User Profile</h3>
                <p className="text-xs text-[#7A6C5E] font-mono mt-0.5">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="p-1.5 rounded-full text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#F9F6F0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Full Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Email Address (Mail ID)</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Phone Number</label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Account Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs cursor-pointer transition-all shadow-inner-xs"
                >
                  <option value="Customer">Customer (Shopper)</option>
                  <option value="Retail Staff">Retail Staff (Sales & Operations)</option>
                  <option value="Production Staff">Production Staff (Furniture Studio Manager)</option>
                  <option value="Worker">Artisan Worker (Workshop Technician)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5 text-xs">Driver Capability (Can Drive Fleet Vehicle)</label>
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditUserIsDriver(true)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserIsDriver === true
                        ? 'bg-purple-100 text-purple-800 border-purple-400 shadow-xs ring-2 ring-purple-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Driver (Capable)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserIsDriver(false)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserIsDriver === false
                        ? 'bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <span>No Driver Role</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5 text-xs">Account Status</label>
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditUserStatus(true)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserStatus === true
                        ? 'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E] shadow-xs ring-2 ring-[#48A63E]/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserStatus(false)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserStatus === false
                        ? 'bg-rose-100 text-rose-700 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Inactive Account</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95"
                >
                  {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 6: EDIT ORDER */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1A140E]">Edit Order Details</h3>
                <p className="text-xs font-mono font-bold text-[#48A63E] mt-0.5">#{selectedOrderForEdit.orderId}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForEdit(null)}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs font-semibold">
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <div className="text-[#1A140E] font-black text-sm">{selectedOrderForEdit.customerName}</div>
                <div className="text-[#6B5C4D] font-mono text-xs">{selectedOrderForEdit.email}</div>
                <div className="text-[#48A63E] font-black text-sm pt-1">Total Amount: ₹{selectedOrderForEdit.totalAmount.toLocaleString('en-IN')}</div>
                {selectedOrderForEdit.assignedWorkers && selectedOrderForEdit.assignedWorkers.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <span>👷 Assigned Worker(s): {selectedOrderForEdit.assignedWorkers.map((w: any) => `${w.worker_name}${w.specialization ? ` (${w.specialization})` : ''}`).join(', ')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Order Status</label>
                <select
                  value={editOrderStatusValue}
                  onChange={(e) => setEditOrderStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Order Placed">Order Placed</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Payment Status</label>
                <select
                  value={editOrderPaymentStatusValue}
                  onChange={(e) => setEditOrderPaymentStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#7A6C5E] text-xs">Completion Status</label>
                  <button
                    type="button"
                    onClick={() => handleLogicallyGenerateCompletionStatus()}
                    className="text-[10px] font-black text-[#48A63E] bg-[#48A63E]/10 hover:bg-[#48A63E]/20 px-2 py-0.5 rounded-lg border border-[#48A63E]/30 transition-all flex items-center gap-1 cursor-pointer"
                    title="Calculate status based on payment status, worker assignments & progress"
                  >
                    <span>⚡ Logically Auto-Generate</span>
                  </button>
                </div>
                <select
                  value={editOrderCompletionStatusValue}
                  onChange={(e) => setEditOrderCompletionStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Order Placed & Processing">Order Placed & Processing (15%)</option>
                  <option value="Pending Payment">Pending Payment (5%)</option>
                  <option value="In Production (40%)">In Production (40%)</option>
                  <option value="In Production (65%)">In Production (65%)</option>
                  <option value="Completed & Ready for Dispatch">Completed & Ready for Dispatch (100%)</option>
                  <option value="Shipped & In Transit">Shipped & In Transit (85%)</option>
                  <option value="Delivered">Delivered (100%)</option>
                  <option value="Cancelled">Cancelled (0%)</option>
                </select>
                <div className="mt-1 text-[10px] text-[#7A6C5E] font-medium italic">
                  * Click "⚡ Logically Auto-Generate" to automatically deduce stage from order parameters.
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCBD] text-[#4A3E32] font-bold hover:bg-[#EFE7DE] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold shadow-md hover:bg-[#38A132] transition-colors cursor-pointer"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER PURCHASED / SOLD PRODUCTS */}
      {isPurchasedProductsModalOpen && selectedUserForPurchases && (() => {
        const userEmail = (selectedUserForPurchases.email || '').toLowerCase().trim();
        const userId = selectedUserForPurchases.user_id;
        const userRole = selectedUserForPurchases.role || selectedUserForPurchases.role_name || 'Customer';
        const isStaff = userRole.toLowerCase().includes('staff');

        const userOrders = orderList.filter((o: any) => {
          if (isStaff) {
            const oStaffEmail = (o.staffEmail || o.staff_email || o.handledBy || o.processedBy || '').toLowerCase().trim();
            if (oStaffEmail && oStaffEmail === userEmail) return true;
            if (o.staffId && (o.staffId === userId || String(o.staffId) === String(userId))) return true;
            if (o.retailStaffId && (o.retailStaffId === userId || String(o.retailStaffId) === String(userId))) return true;
            if (o.productionStaffId && (o.productionStaffId === userId || String(o.productionStaffId) === String(userId))) return true;

            const hasOtherStaff = (o.staffId && String(o.staffId) !== String(userId)) ||
                                  (o.retailStaffId && String(o.retailStaffId) !== String(userId)) ||
                                  (o.productionStaffId && String(o.productionStaffId) !== String(userId));
            if (!hasOtherStaff) return true;
            return false;
          } else {
            const orderEmail = (o.email || '').toLowerCase().trim();
            if (orderEmail && orderEmail === userEmail) return true;
            if (o.customerId && (o.customerId === userId || String(o.customerId) === String(userId))) return true;
            return false;
          }
        });

        const purchasedItems = userOrders.flatMap((order) =>
          (order.items || []).map((item, idx) => ({
            key: `${order.orderId}-${idx}`,
            orderId: order.orderId,
            orderDate: order.orderDate,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            name: item.name || 'Furniture Item',
            sku: item.productCode || item.sku || 'SKU-RS-STORE',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
          }))
        );

        const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalItemsCount = purchasedItems.reduce((sum, i) => sum + i.quantity, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
            <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-4 flex-shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-full ${isStaff ? 'bg-emerald-600' : 'bg-[#38A132]'} text-white font-black flex items-center justify-center text-base shadow-md flex-shrink-0`}>
                    {(selectedUserForPurchases.full_name || selectedUserForPurchases.name || selectedUserForPurchases.email)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1A140E] tracking-tight flex items-center gap-2">
                      <span>{isStaff ? 'Sold Products History' : 'Purchased Products History'}</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                        isStaff
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-[#38A132]/15 text-[#2C6B27] border border-[#38A132]/40'
                      }`}>
                        {userRole}
                      </span>
                    </h3>
                    <p className="text-sm font-extrabold text-[#2C241D] mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[#1A140E] font-black text-sm">{selectedUserForPurchases.full_name || selectedUserForPurchases.name}</span>
                      <span className="text-[#4A3E32] font-extrabold font-mono text-xs bg-[#EFE7DE] px-2.5 py-0.5 rounded-md border border-[#D8CCBD]">
                        {selectedUserForPurchases.email}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPurchasedProductsModalOpen(false)}
                  className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Purchase / Sales Overview Stats */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Orders Processed' : 'Total Orders'}
                  </span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">{userOrders.length}</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Products Sold' : 'Items Purchased'}
                  </span>
                  <div className="text-xl font-black text-[#2C6B27] mt-0.5">{totalItemsCount} Products</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Total Revenue Sold' : 'Total Amount Spent'}
                  </span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Products List Body */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
                {purchasedItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingBag className="w-12 h-12 text-[#9E9082] mx-auto" />
                    <h4 className="font-extrabold text-base text-[#1A140E]">
                      {isStaff ? 'No Sold Products Found' : 'No Purchased Products Found'}
                    </h4>
                    <p className="text-xs text-[#5C4D3E] font-medium">
                      {isStaff
                        ? 'This staff member has not processed or sold any products yet.'
                        : 'This user has not completed any product orders yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedItems.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white p-4 rounded-2xl border border-[#E2D7CB] flex items-center justify-between gap-4 shadow-xs hover:border-[#38A132] transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {item.imageUrl && item.imageUrl.trim() !== '' ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex-shrink-0 flex items-center justify-center font-extrabold text-[#38A132] shadow-2xs">
                              <FileText className="w-6 h-6 text-[#38A132]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-black text-sm text-[#1A140E] truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono bg-[#EFE7DE] text-[#2C241D] px-2 py-0.5 rounded-md font-extrabold border border-[#D8CCBD]">
                                {item.sku}
                              </span>
                              <span className="text-xs text-[#4A3E32] font-extrabold">
                                Qty: <strong className="text-[#1A140E] font-black">{item.quantity}</strong>
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B5C4D] font-medium mt-1">
                              Order #{item.orderId} • {item.orderDate}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="font-black text-base text-[#1A140E]">
                            ₹{item.total.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-[#5C4D3E] font-bold">
                            ₹{item.price.toLocaleString('en-IN')} each
                          </div>
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                            item.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : item.orderStatus === 'Processing' || item.orderStatus === 'Shipped'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {item.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t-2 border-[#EFE7DE] flex justify-end flex-shrink-0">
                <button
                  onClick={() => setIsPurchasedProductsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#2C241D] text-white font-extrabold text-xs hover:bg-[#1A140E] transition-all cursor-pointer shadow-md"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 8: GRANT AUTHORITY & CAPABILITIES */}
      {isAuthorityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Grant Authority & Capabilities</h3>
                <p className="text-[11px] text-[#7A6C5E]">Assign executive capabilities or admin powers by email with granular checkboxes.</p>
              </div>
              <button onClick={() => setIsAuthorityModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthoritySubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Target Account Email *</label>
                <input
                  type="email"
                  placeholder="Enter email e.g. john.staff@retailsphere.com"
                  value={authorityEmail}
                  onChange={(e) => setAuthorityEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-mono font-bold focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              {/* Master Full Admin Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-amber-900 text-xs block">Full Executive Admin Authority</span>
                  <span className="text-[10px] text-amber-800 font-medium">Grant complete unrestricted administrative control</span>
                </div>
                <input
                  type="checkbox"
                  checked={isFullAdminChecked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFullAdminChecked(checked);
                    if (checked) {
                      setSelectedCapabilities(CAPABILITY_DEFINITIONS.map(c => c.key));
                    }
                  }}
                  className="w-4 h-4 accent-[#48A63E] cursor-pointer"
                />
              </div>

              {/* Granular Capabilities Checkboxes */}
              <div className="space-y-2">
                <label className="block font-extrabold text-[#2C241D] text-xs">Specific Granted Capabilities (Check all that apply):</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {CAPABILITY_DEFINITIONS.filter(c => c.key !== 'full_admin').map((cap) => {
                    const isChecked = selectedCapabilities.includes(cap.key);
                    return (
                      <label key={cap.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-[#48A63E]/10 border-[#48A63E]/40' : 'bg-[#FAF7F2] border-[#E2D7CB]'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCapabilities(prev => [...prev, cap.key]);
                            } else {
                              setSelectedCapabilities(prev => prev.filter(k => k !== cap.key));
                              setIsFullAdminChecked(false);
                            }
                          }}
                          className="w-4 h-4 accent-[#48A63E] mt-0.5"
                        />
                        <div>
                          <span className="font-extrabold text-[#2C241D] block">{cap.label}</span>
                          <span className="text-[10px] text-[#7A6C5E] font-medium block">{cap.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthorityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] font-extrabold text-[#7A6C5E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save & Assign Granted Authority</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 1: Detailed Custom Order Specifications */}
      {selectedCustomForAdminDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCustomForAdminDetails(null)}
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
                  ORDER #{selectedCustomForAdminDetails.custom_order_id}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">{selectedCustomForAdminDetails.furniture_type}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">Client: {selectedCustomForAdminDetails.customer_name}</p>
              </div>
            </div>

            {/* 1. CLIENT & ORDER TIMELINE SUMMARY */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Client Contact & Order Record</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Client Name</span>
                  <span className="font-extrabold text-[#2C241D] truncate block">{selectedCustomForAdminDetails.customer_name}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Email Address</span>
                  <span className="font-bold text-[#2C241D] block break-all text-[11px]">{selectedCustomForAdminDetails.customer_email || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Phone Contact</span>
                  <span className="font-bold text-[#2C241D] block truncate">{selectedCustomForAdminDetails.customer_phone || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Submission Date</span>
                  <span className="font-bold text-[#2C241D] block truncate">
                    {selectedCustomForAdminDetails.order_date
                      ? new Date(selectedCustomForAdminDetails.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1.5 ASSIGNED WORKERS CARD IN SPECS MODAL */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Assigned Workshop Artisan(s) & Production Team</span>
              </h4>
              {selectedCustomForAdminDetails.assigned_workers && selectedCustomForAdminDetails.assigned_workers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {selectedCustomForAdminDetails.assigned_workers.map((w, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-[#2C241D] block text-xs">👷 {w.worker_name}</span>
                        {w.specialization && <span className="text-[10px] text-[#7A6C5E] block font-semibold">{w.specialization}</span>}
                        {w.worker_phone && <span className="text-[10px] text-[#38A132] block font-mono">📞 {w.worker_phone}</span>}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
                        {w.task_status || 'Assigned'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold">
                  ⚠️ No artisan worker assigned yet to this custom build. Production Staff can assign workshop artisans.
                </p>
              )}
            </div>

            {/* 2. SEPARATED PRODUCT FIELDS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Product Specifications & Parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {parseOrderSpecDetails(selectedCustomForAdminDetails).map((field, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">{field.label}</span>
                    {field.isColor || field.label.toLowerCase().includes('color') ? (
                      renderColorSwatchBadge(field.value)
                    ) : (
                      <span className="font-extrabold text-xs text-[#2C241D] block">{field.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CUSTOMER PROVIDED REFERENCE DESIGN IMAGES */}
            {selectedCustomForAdminDetails.reference_image && selectedCustomForAdminDetails.reference_image.trim() && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#38A132]" />
                  Customer Provided Reference Images ({parseReferenceImages(selectedCustomForAdminDetails.reference_image).length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {parseReferenceImages(selectedCustomForAdminDetails.reference_image).map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openImageInNewTab(imgUrl)}
                      className="group relative rounded-2xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-xs hover:shadow-md transition-all block h-32 text-left cursor-pointer w-full"
                    >
                      <img
                        src={imgUrl}
                        alt={`Reference Design ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}



            <div className="flex items-center justify-between gap-3 border-t border-[#E2D7CB] pt-4">
              {(selectedCustomForAdminDetails.payment_status === 'Paid' || selectedCustomForAdminDetails.order_status === 'Paid') ? (
                <button
                  onClick={() => downloadPaymentReceipt(selectedCustomForAdminDetails)}
                  className="px-4 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Payment Receipt</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedCustomForAdminDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 2: Set/Update Price Quote & Approval */}
      {selectedCustomForAdminReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedCustomForAdminReview(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-extrabold shadow-md">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                  ADMIN PRICE QUOTE & APPROVAL
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">Order #{selectedCustomForAdminReview.custom_order_id}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">{selectedCustomForAdminReview.furniture_type} • Client: {selectedCustomForAdminReview.customer_name}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-1">
                  Estimated Price Quote (INR ₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-sm text-[#38A132]">₹</span>
                  <input
                    type="number"
                    value={adminPriceInput}
                    onChange={(e) => setAdminPriceInput(e.target.value)}
                    placeholder="Enter estimated custom build price..."
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#E2D7CB] rounded-xl font-extrabold text-sm focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-1">
                  Approval Remarks / Staff Notes:
                </label>
                <textarea
                  rows={3}
                  value={adminReviewRemarks}
                  onChange={(e) => setAdminReviewRemarks(e.target.value)}
                  placeholder="Notes regarding timber sourcing, estimated lead time..."
                  className="w-full p-3 bg-white border border-[#E2D7CB] rounded-xl font-semibold text-xs focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#E2D7CB] pt-4">
              <button
                type="button"
                onClick={() => handleAdminSubmitQuote('Rejected')}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleAdminSubmitQuote('Approved')}
                className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Approve & Send Quote
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VEHICLE MODAL: ADD VEHICLE (Requirement 7) */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#38A132]" />
                  <span>Add Company Delivery Vehicle</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Register internal transport vehicle for order dispatch.</p>
              </div>
              <button
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Registration Number *</label>
                <input
                  type="text"
                  placeholder="e.g. KL-01-AB-1234 or KL-14-1234"
                  value={vRegNumber}
                  onChange={(e) => setVRegNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold uppercase focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
                <span className="text-[10px] text-[#7A6C5E] font-medium mt-1 block">Format: State Code + RTO + Series + Number (e.g., KL-01-AB-1234)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Vehicle Type *</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Pickup Van">Pickup Van</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Capacity (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={vCapacity}
                    onChange={(e) => setVCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Driver</label>
                <select
                  value={vDriverId}
                  onChange={(e) => setVDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="">-- Select Driver (Optional) --</option>
                  {allUsersList.filter(u => u.role !== 'Customer').map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || u.name} ({u.role || u.role_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Initial Status</label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="AVAILABLE">AVAILABLE (Can be selected for dispatch)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Servicing / Repairs)</option>
                  <option value="INACTIVE">INACTIVE (Not currently used)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary urban delivery vehicle for retail items..."
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingVehicle ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL: EDIT VEHICLE (Requirement 8) */}
      {isEditVehicleModalOpen && selectedVehicleForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#38A132]" />
                  <span>Edit Vehicle Specs — {selectedVehicleForEdit.id}</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Update capacity, driver, status or notes.</p>
              </div>
              <button
                onClick={() => setIsEditVehicleModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateVehicleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Registration Number *</label>
                <input
                  type="text"
                  value={vRegNumber}
                  onChange={(e) => setVRegNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold uppercase focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Vehicle Type *</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Pickup Van">Pickup Van</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Capacity (kg) *</label>
                  <input
                    type="number"
                    value={vCapacity}
                    onChange={(e) => setVCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Driver</label>
                <select
                  value={vDriverId}
                  onChange={(e) => setVDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="">-- Select Driver (Unassigned) --</option>
                  {allUsersList.filter(u => u.role !== 'Customer').map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || u.name} ({u.role || u.role_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Status</label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="AVAILABLE">AVAILABLE (Can be selected for dispatch)</option>
                  <option value="ASSIGNED">ASSIGNED (Currently out on order delivery)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Servicing / Repairs)</option>
                  <option value="INACTIVE">INACTIVE (Preserved for historical data)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditVehicleModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingVehicle ? 'Saving...' : 'Save Specs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL: VIEW VEHICLE DETAIL & HISTORY (Requirement 9) */}
      {isVehicleDetailModalOpen && selectedVehicleForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-xl shadow-2xl border border-[#E2D7CB] relative z-50 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#38A132] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selectedVehicleForDetail.vehicle.id}
                  </span>
                  <h3 className="text-base font-extrabold text-[#2C241D]">
                    {selectedVehicleForDetail.vehicle.registration_number}
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                  {selectedVehicleForDetail.vehicle.vehicle_type} • {selectedVehicleForDetail.vehicle.capacity} kg Capacity
                </p>
              </div>
              <button
                onClick={() => setIsVehicleDetailModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Master Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB]">
              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Assigned Driver</span>
                <span className="font-extrabold text-[#2C241D]">{selectedVehicleForDetail.vehicle.assigned_driver_name}</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 border ${
                  selectedVehicleForDetail.vehicle.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  selectedVehicleForDetail.vehicle.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  selectedVehicleForDetail.vehicle.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {selectedVehicleForDetail.vehicle.status}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Model / Year</span>
                <span className="font-bold text-[#2C241D]">
                  {selectedVehicleForDetail.vehicle.model_name || 'Standard'} {selectedVehicleForDetail.vehicle.year ? `(${selectedVehicleForDetail.vehicle.year})` : ''}
                </span>
              </div>
            </div>

            {selectedVehicleForDetail.vehicle.notes && (
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs">
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-0.5">Notes</span>
                <p className="text-[#2C241D] font-medium italic">{selectedVehicleForDetail.vehicle.notes}</p>
              </div>
            )}

            {/* Current Active Assignment Section */}
            <div className="space-y-2 border-t border-[#EFE7DE] pt-4">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Current Active Delivery Assignment</span>
              </h4>

              {selectedVehicleForDetail.current_assignment ? (
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-900">{selectedVehicleForDetail.current_assignment.order_id}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedVehicleForDetail.current_assignment.order_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4A3E32]">
                    <div><span className="font-bold">Customer:</span> {selectedVehicleForDetail.current_assignment.customer}</div>
                    <div><span className="font-bold">Dispatched:</span> {selectedVehicleForDetail.current_assignment.dispatch_date}</div>
                    <div><span className="font-bold">Expected Delivery:</span> {selectedVehicleForDetail.current_assignment.expected_delivery_date}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                  No active delivery assignment. Vehicle is ready for dispatch.
                </div>
              )}
            </div>

            {/* Delivery History Section */}
            <div className="space-y-2 border-t border-[#EFE7DE] pt-4">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Delivery Order History</span>
              </h4>

              {selectedVehicleForDetail.delivery_history.length === 0 ? (
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                  No previous order deliveries recorded for this vehicle.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Order ID</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Dispatch Date</th>
                        <th className="py-2 px-3">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                      {selectedVehicleForDetail.delivery_history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF7F2]">
                          <td className="py-2 px-3 font-extrabold text-[#38A132] font-mono">{h.order_id}</td>
                          <td className="py-2 px-3">{h.customer}</td>
                          <td className="py-2 px-3 text-[#7A6C5E]">{h.dispatch_date}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{h.delivery_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setIsVehicleDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#F9F6F0] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#6B5C4D] font-extrabold text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF & WORKER DETAILS */}
      {isEditStaffModalOpen && selectedStaffForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#38A132]" />
                  <span>Edit Staff / Worker — {selectedStaffForEdit.name}</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Update contact details, role, specialization, or driver capability.</p>
              </div>
              <button
                onClick={() => setIsEditStaffModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editStaffModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editStaffModalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address *</label>
                <input
                  type="email"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Role *</label>
                <select
                  value={editStaffRole}
                  onChange={(e) => setEditStaffRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="Retail Staff">Retail Staff (Store Operations & Orders)</option>
                  <option value="Production Staff">Production Staff (Manager & Stage QC)</option>
                  <option value="Artisan Worker">Artisan Worker (Workshop Technician)</option>
                </select>
              </div>

              {editStaffRole === 'Artisan Worker' && (
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Artisan Specialization Skill *</label>
                  <select
                    value={editStaffWorkerSkill}
                    onChange={(e) => setEditStaffWorkerSkill(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Woodwork & Carpentry">Woodwork & Carpentry</option>
                    <option value="Finishing & Assembly">Finishing & Assembly</option>
                    <option value="Upholstery">Upholstery</option>
                    <option value="Metalwork & Framing">Metalwork & Framing</option>
                    <option value="Quality Inspection & Polish">Quality Inspection & Polish</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editStaffIsDriver}
                    onChange={(e) => setEditStaffIsDriver(e.target.checked)}
                    className="w-4 h-4 text-[#38A132] rounded focus:ring-[#38A132] border-gray-300"
                  />
                  <div>
                    <span className="font-extrabold text-[#2C241D] block">🚚 Fleet Driver Capability</span>
                    <span className="text-[10px] text-[#7A6C5E] font-medium block">
                      Enable to allow dispatching delivery vehicles to this staff/worker.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditStaffModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditStaff}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingEditStaff ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
