import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Bell,
  Edit,
  Eye,
  RotateCcw,
  User,
  ChevronDown,
  Lock,
  Key,
  Truck,
  Clock,
  ShoppingBag,
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

import { respondToStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import { getStoredCoupons, addStoredCoupon, removeStoredCoupon, updateCouponUserEmail, sendCouponToCustomer, getCouponAllotments, Coupon, CouponAllotment, CouponAudienceType, sendBulkCouponsToFirstNCustomers } from '../../utils/couponStorage';
import { getStoredRetailOrders, fetchRetailOrdersFromDB, deleteStoredRetailOrder } from '../../utils/retailOrdersStorage';
import { fetchCustomOrders } from '../../services/api_production';
import { getStoredAdminMessages, sendAdminMessage, AdminMessage } from '../../utils/adminMessagesStorage';
import { getStoredUserAuthorities, saveUserAuthority, UserAuthorityRecord, CAPABILITY_DEFINITIONS, CapabilityKey } from '../../utils/userAuthoritiesStorage';

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
  role: 'Retail Staff' | 'Production Staff';
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
  orderDate: string;
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

  // Active View Tab: staff | products | inventory | suppliers | orders | queries | coupons | users | broadcast
  const [activeTab, setActiveTab] = useState<'staff' | 'products' | 'inventory' | 'suppliers' | 'orders' | 'queries' | 'coupons' | 'users' | 'broadcast'>('staff');

  // Admin Broadcast & Direct Messages State
  const [adminMessagesList, setAdminMessagesList] = useState<AdminMessage[]>(getStoredAdminMessages());
  const [adminMsgRecipientType, setAdminMsgRecipientType] = useState<'All Staff' | 'Retail Staff' | 'Production Staff' | 'Specific Staff' | 'All Suppliers' | 'Specific Supplier'>('All Staff');
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
    window.addEventListener('storage', refreshMsgs);
    return () => {
      window.removeEventListener('admin-messages-updated', refreshMsgs);
      window.removeEventListener('storage', refreshMsgs);
    };
  }, []);

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
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Staff Management State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Retail Staff' | 'Production Staff'>('All');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Form values for Add Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Retail Staff' | 'Production Staff'>('Retail Staff');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  // Load Staff Users from DB
  const loadStaffFromDB = async () => {
    try {
      const dbUsers = await fetchStaffUsers();
      if (dbUsers && Array.isArray(dbUsers)) {
        const staffOnly = dbUsers.filter((u: any) => {
          const role = u.role || '';
          const email = (u.email || '').toLowerCase();
          const name = (u.name || u.full_name || '').toLowerCase();
          if (email === 'admin@retailsphere.com' || name === 'admin' || role === 'Admin' || role === 'Customer') {
            return false;
          }
          return role === 'Retail Staff' || role === 'Production Staff' || role === 'Staff';
        });
        const mapped: StaffMember[] = staffOnly.map((u: any) => ({
          id: u.id || `staff-${u.user_id}`,
          user_id: u.user_id || (typeof u.id === 'number' ? u.id : parseInt(String(u.id).replace(/\D/g, '')) || 1),
          name: u.name || u.full_name || (u.email ? u.email.split('@')[0].replace('.', ' ').replace(/^./, (str: string) => str.toUpperCase()) : 'Staff Member'),
          email: u.email || 'N/A',
          phone: u.phone || '+91 98765 43210',
          role: u.role === 'Production Staff' ? 'Production Staff' : 'Retail Staff',
          status: u.status === 'Inactive' ? 'Inactive' : 'Active',
          dateAdded: u.dateAdded || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'Recent')
        }));
        setStaffMembers(mapped);
      } else {
        setStaffMembers([]);
      }
    } catch (err) {
      console.warn('Could not fetch DB staff members:', err);
      setStaffMembers([]);
    }
  };

  useEffect(() => {
    loadStaffFromDB();
  }, []);

  // System User Management State
  const [allUsersList, setAllUsersList] = useState<SystemUserItem[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<'All' | 'Customer' | 'Retail Staff' | 'Production Staff'>('All');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<SystemUserItem | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<string>('Customer');
  const [editUserStatus, setEditUserStatus] = useState<boolean>(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Purchased Products Modal State
  const [selectedUserForPurchases, setSelectedUserForPurchases] = useState<SystemUserItem | null>(null);
  const [isPurchasedProductsModalOpen, setIsPurchasedProductsModalOpen] = useState(false);

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
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
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
      
      const formattedCustom: RetailOrder[] = allCustomOrders.map((c) => ({
        orderId: `CUSTOM-${c.custom_order_id}`,
        customerName: c.customer_name || 'Bespoke Customer',
        email: c.customer_email || 'customer@retailsphere.com',
        itemsCount: 1,
        totalAmount: c.estimated_price || 0,
        orderStatus: c.order_status === 'Paid' ? 'Processing' : (c.order_status === 'Completed' ? 'Delivered' : (c.order_status as any || 'Pending')),
        paymentStatus: (c.payment_status === 'Paid' || c.order_status === 'Paid') ? 'Paid' : 'Pending',
        orderDate: c.order_date ? new Date(c.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        createdAt: c.order_date ? new Date(c.order_date).getTime() : Date.now() + c.custom_order_id * 1000,
        items: [{
          id: `item-custom-${c.custom_order_id}`,
          name: `Custom ${c.furniture_type} (${c.material}, ${c.color})`,
          price: c.estimated_price || 0,
          quantity: 1,
          imageUrl: c.reference_image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'
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
  const [couponsList, setCouponsList] = useState<Coupon[]>(() => getStoredCoupons());
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponUserEmail, setNewCouponUserEmail] = useState('');
  const [newCouponAudience, setNewCouponAudience] = useState<CouponAudienceType>('all');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState('10');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(true);
  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>(() => getCouponAllotments());

  const refreshCoupons = () => {
    setCouponsList(getStoredCoupons());
    setAllotmentsList(getCouponAllotments());
  };

  useEffect(() => {
    window.addEventListener('coupons-updated', refreshCoupons);
    window.addEventListener('allotments-updated', refreshCoupons);
    return () => {
      window.removeEventListener('coupons-updated', refreshCoupons);
      window.removeEventListener('allotments-updated', refreshCoupons);
    };
  }, []);

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

  // Handlers for Add Product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;

    const qty = parseInt(newProdStock) || 1;
    const priceVal = parseFloat(newProdPrice) || 0;
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
      });

      const newMember: StaffMember = {
        id: `staff-${created.user_id || Date.now()}`,
        user_id: created.user_id,
        name: created.full_name || newStaffName.trim(),
        email: created.email || newStaffEmail.trim(),
        phone: newStaffPhone.trim() || '+91 98765 43210',
        role: created.role_name === 'Production Staff' ? 'Production Staff' : 'Retail Staff',
        status: 'Active',
        dateAdded: 'Just Now',
      };

      setStaffMembers((prev) => [newMember, ...prev]);
      setSuccessBanner(`Staff user "${newMember.name}" created! Credentials emailed to ${newMember.email}.`);
      setIsAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setStaffFormError(err.message || 'Failed to create staff account. Check if email already exists.');
    } finally {
      setIsSubmittingStaff(false);
      setTimeout(() => setSuccessBanner(null), 7000);
    }
  };

  // Handlers for Add Supplier
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupContact.trim() || !newSupPhone.trim()) return;

    try {
      const created = await createSupplierInDB({
        supplier_name: newSupName.trim(),
        contact_person: newSupContact.trim(),
        phone: newSupPhone.trim(),
        email: newSupEmail.trim() || undefined,
        address: newSupAddress.trim() || 'Industrial Estate, India',
        gst_number: newSupGst.trim() || undefined,
      });

      setSupplierList((prev) => [created, ...prev]);
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
        status: 'Active',
      };
      setSupplierList((prev) => [fallback, ...prev]);
      setSuccessBanner(`Supplier "${fallback.supplier_name}" added successfully!`);
    }

    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setNewSupGst('');
    setIsAddSupplierModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 6000);
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
    const limit = coupon.customerLimit || 10;
    const audience = coupon.audienceType || 'all';
    const result = await sendBulkCouponsToFirstNCustomers(coupon.id, audience, limit);
    if (result.success) {
      refreshCoupons();
      setSuccessBanner(`🎉 ${result.message}`);
      setTimeout(() => setSuccessBanner(null), 8000);
    }
  };

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount) return;

    const discountVal = parseInt(newCouponDiscount, 10) || 10;
    const targetEmail = newCouponUserEmail.trim();
    const limitVal = parseInt(newCouponCustomerLimit, 10) || 10;

    addStoredCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountPercent: discountVal,
      description: newCouponDesc.trim() || `Special ${discountVal}% Discount Coupon`,
      targetUserEmail: targetEmail || undefined,
      customerLimit: limitVal,
      audienceType: newCouponAudience,
    });

    if (newCouponAutoAllot) {
      await sendBulkCouponsToFirstNCustomers(newCouponCode.trim().toUpperCase(), newCouponAudience, limitVal);
    } else if (targetEmail) {
      sendCouponToCustomer(newCouponCode.trim().toUpperCase(), targetEmail);
    }

    setCouponsList(getStoredCoupons());
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDesc('');
    setNewCouponUserEmail('');
    setNewCouponCustomerLimit('10');
    setNewCouponAudience('all');

    const audienceLabel = newCouponAudience === 'retail' ? 'Retail Customers' : newCouponAudience === 'production' ? 'Production Customers' : 'First N Customers';

    setSuccessBanner(`Coupon "${newCouponCode.trim().toUpperCase()}" created for ${audienceLabel} (Limit: ${limitVal})!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleRemoveCoupon = (idOrCode: string, code: string) => {
    const updated = removeStoredCoupon(idOrCode);
    setCouponsList(updated);
    setSuccessBanner(`Coupon "${code}" removed successfully!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleUpdateCouponUserEmail = (couponId: string, newUserEmail: string) => {
    const updated = updateCouponUserEmail(couponId, newUserEmail);
    setCouponsList(updated);
  };

  const handleSendCouponNotification = (couponId: string, currentEmailInput: string) => {
    const email = currentEmailInput.trim();
    if (!email) {
      alert('Please enter a customer email or User ID in the textbox before sending the coupon notification.');
      return;
    }

    const result = sendCouponToCustomer(couponId, email);
    if (result.success) {
      const inputEl = document.getElementById(`coupon-email-${couponId}`) as HTMLInputElement;
      if (inputEl) {
        inputEl.value = '';
      }
      updateCouponUserEmail(couponId, '');
      setCouponsList(getStoredCoupons());
      setAllotmentsList(getCouponAllotments());

      setSuccessBanner(`🎉 ${result.message}`);
      setTimeout(() => setSuccessBanner(null), 7000);
    } else {
      alert(result.message);
    }
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
      targetEmail: (adminMsgRecipientType === 'Specific Staff' || adminMsgRecipientType === 'Specific Supplier') ? adminMsgTargetEmail : undefined,
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
        <nav className="space-y-2.5">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'users'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4.5 h-4.5" />
              <span className="text-sm">User Management</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'staff'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4.5 h-4.5" />
              <span className="text-sm">Staff Accounts</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'products'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4.5 h-4.5" />
              <span className="text-sm">Product Catalog</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4.5 h-4.5" />
              <span className="text-sm">Stock & Inventory</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'suppliers'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4.5 h-4.5" />
              <span className="text-sm">Supplier Directory</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'orders'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4.5 h-4.5" />
              <span className="text-sm">Customer Orders</span>
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

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'coupons'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4.5 h-4.5" />
              <span className="text-sm">Coupons & Discounts</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'broadcast'
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-4.5 h-4.5" />
              <span className="text-sm">Broadcast & Direct Messages</span>
            </div>
          </button>
        </nav>
      </aside>

        {/* MAIN RIGHT CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Mobile Top Header */}
          <div className="md:hidden bg-white border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#2C241D]">Admin Executive Portal</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['staff', 'products', 'orders'].map((tab) => (
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
                    {activeTab === 'users' && 'System User Management'}
                    {activeTab === 'staff' && 'Staff Accounts Management'}
                    {activeTab === 'products' && 'Retail Product Management'}
                    {activeTab === 'inventory' && 'Inventory Stock Control'}
                    {activeTab === 'suppliers' && 'Supplier Network & Vendor Management'}
                    {activeTab === 'orders' && 'Customer Orders'}
                    {activeTab === 'queries' && 'Queries & Request Communications'}
                    {activeTab === 'coupons' && 'Coupons & Customer Discounts Management'}
                    {activeTab === 'broadcast' && 'Admin Broadcast & Direct Messages'}
                  </h1>
                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                    {activeTab === 'users' && 'View, search, edit, create, activate, or deactivate all user accounts (Customers, Staff, Administrators) across RetailSphere.'}
                    {activeTab === 'staff' && 'Create and manage Retail Staff and Production Staff user accounts with credentials dispatch.'}
                    {activeTab === 'inventory' && 'Monitor stock counts across living room, dining, and bedroom collections.'}
                    {activeTab === 'suppliers' && 'Manage ready-made furniture manufacturers, wholesale product vendors, and catalog stock allocations.'}
                    {activeTab === 'queries' && 'Review staff requests, email change applications, and issue official admin responses.'}
                    {activeTab === 'coupons' && 'Create promo codes and dispatch notifications & emails directly to targeted customer accounts.'}
                    {activeTab === 'broadcast' && 'Send official directives and direct messages to Staff members and Supplier partners.'}
                  </p>
                </div>

                {/* Top Right Controls: Notification Bell + Profile Menu Pill */}
                <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">

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

              {/* TAB 0: SYSTEM USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Users</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{allUsersList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">System User Database</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Customer Accounts</span>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => (u.role || u.role_name) === 'Customer').length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Retail & Store Shoppers</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Staff Members</span>
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => ['Retail Staff', 'Production Staff'].includes(u.role || u.role_name)).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Retail & Production Portals</div>
                    </div>
                  </div>

                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                    {/* Role Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {(['All', 'Customer', 'Retail Staff', 'Production Staff'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setUserRoleFilter(r)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            userRoleFilter === r
                              ? 'bg-[#48A63E] text-white shadow-xs'
                              : 'bg-[#F9F6F0] text-[#6B5C4D] hover:bg-[#EFE7DE]'
                          }`}
                        >
                          {r === 'All' ? 'All Roles' : r}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name, email, phone..."
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
                          <th className="py-3 px-4">User Details</th>
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
                            const r = u.role || u.role_name;
                            if (r === 'Admin' || u.email === 'admin@retailsphere.com' || u.name === 'admin') return false;
                            if (userRoleFilter === 'All') return true;
                            return r === userRoleFilter;
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
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                    roleStr === 'Production Staff'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : roleStr === 'Retail Staff'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}>
                                    {roleStr}
                                  </span>
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
                                <td className="py-4 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => handleViewUserPurchases(u)}
                                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                    title="View Products Purchased by User"
                                  >
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>Purchases</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                    title="Edit User Details"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(u.user_id)}
                                    className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer ${
                                      isAct
                                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                                        : 'bg-[#48A63E]/15 text-[#48A63E] hover:bg-[#48A63E] hover:text-white border border-[#48A63E]/30'
                                    }`}
                                    title={isAct ? 'Deactivate Account' : 'Activate Account'}
                                  >
                                    {isAct ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    <span>{isAct ? 'Deactivate' : 'Activate'}</span>
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

              {/* TAB 1: STAFF ACCOUNTS MANAGEMENT (ADMIN FEATURE) */}
              {activeTab === 'staff' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Staff Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Staff Members</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{staffMembers.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Active Staff Accounts</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Staff</span>
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Retail Staff').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Sales & Customer Operations</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Production Staff</span>
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Production Staff').length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Manufacturing & Assembly</div>
                    </div>
                  </div>

                  {/* Header & Create Staff Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                    <button
                      onClick={() => setIsAddStaffModalOpen(true)}
                      className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Staff Member</span>
                    </button>
                  </div>

                  {/* Role Filters & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {['All', 'Retail Staff', 'Production Staff'].map((role) => (
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
                          <th className="py-3 px-4 text-right">Date Added</th>
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
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  staff.role === 'Production Staff'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {staff.role}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E]">
                                  {staff.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-[#7A6C5E]">{staff.dateAdded}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCTS CATALOG MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  {/* Product Catalog Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Products</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{productList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Furniture Store Catalog</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock Items</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter(p => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Available for Purchase</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
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
                                <button
                                  onClick={() => handleOpenEditProduct(prod)}
                                  className="p-1.5 rounded-lg text-[#6B5C4D] hover:bg-[#F2ECE1] transition-colors"
                                  title="Edit product"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteModal(prod)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Items</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{totalProducts}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">{totalInStock} Total Units</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter((p) => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Sufficient Stock (5+ units)</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Low Stock Alert</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-amber-700 mt-2">
                        {productList.filter((p) => p.stockCount > 0 && p.stockCount < 5).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Under 5 Units Left</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
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
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Suppliers</span>
                        <Briefcase className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{supplierList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Ready-Made Product Manufacturers</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
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
                        onClick={() => setIsAddSupplierModalOpen(true)}
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

                            <span className="px-3 py-1 rounded-full bg-[#48A63E]/15 text-[#48A63E] text-xs font-extrabold">
                              {prodsForSup.length} Products Supplied
                            </span>
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
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-[#D97706]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{orderList.length}</div>
                      <div className="text-[10px] text-[#D97706] font-bold mt-1">Customer Purchases</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Pending Orders</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Order Placed').length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Awaiting Processing</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Production / Shipped</span>
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => o.orderStatus === 'Processing' || o.orderStatus === 'Shipped').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Fulfillment Active</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
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
                          <th className="py-3 px-4">Payment Status</th>
                          <th className="py-3 px-4">Order Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
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
                            <td colSpan={7} className="py-8 text-center text-[#7A6C5E]">
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
                                <td className="py-4 px-4">
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Paid</span>
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  {ord.orderStatus === 'Cancelled' || ord.paymentStatus === 'Cancelled' ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                      <X className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Cancelled</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Order Placed</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Permanently remove order ${ord.orderId} from PostgreSQL Database?`)) {
                                        deleteStoredRetailOrder(ord.orderId);
                                      }
                                    }}
                                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center gap-1 font-extrabold text-xs cursor-pointer border border-rose-200"
                                    title="Delete Order from Database"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </td>
                              </tr>
                            )))}
                      </tbody>
                    </table>
                  </div>
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
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Coupons</span>
                        <Tag className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{couponsList.length}</div>
                      <div className="text-[10px] text-[#7C3AED] font-bold mt-1">Promotional Discount Codes</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Store Coupons</span>
                        <Percent className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.filter(c => c.audienceType === 'retail' || c.audienceType === 'all' || !c.audienceType).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Furniture Store Discounts</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
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
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Create & Allot First N Customer Coupon</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = newCouponAudience === 'retail' ? 'RETAIL' : newCouponAudience === 'production' ? 'PROD' : 'VIP';
                          const code = `${prefix}FIRST${newCouponCustomerLimit || '10'}_${Math.floor(Math.random() * 90 + 10)}`;
                          setNewCouponCode(code);
                        }}
                        className="text-xs font-extrabold text-[#48A63E] hover:underline"
                      >
                        ⚡ Auto Generate Code
                      </button>
                    </div>

                    <form onSubmit={handleCreateCouponSubmit} className="space-y-3 text-xs font-semibold">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Coupon Code *</label>
                          <input
                            type="text"
                            placeholder="e.g. FIRST10OFF"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Discount % *</label>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            placeholder="e.g. 20"
                            value={newCouponDiscount}
                            onChange={(e) => setNewCouponDiscount(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">First N Limit (N) *</label>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            placeholder="e.g. 10"
                            value={newCouponCustomerLimit}
                            onChange={(e) => setNewCouponCustomerLimit(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Customer Access Provision *</label>
                          <select
                            value={newCouponAudience}
                            onChange={(e) => setNewCouponAudience(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#48A63E]"
                          >
                            <option value="all">🌐 First N Customers (All Base)</option>
                            <option value="retail">🛍️ First N Retail Customers (Readymade)</option>
                            <option value="production">🏭 First N Production Customers (Bespoke)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Target Email (Optional)</label>
                          <input
                            type="text"
                            placeholder="Target email..."
                            value={newCouponUserEmail}
                            onChange={(e) => setNewCouponUserEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                          />
                        </div>

                        <div>
                          <button
                            type="submit"
                            className="w-full py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create & Dispatch Provision</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Coupons Header with Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <h4 className="font-extrabold text-sm text-[#2C241D]">Active Promo & Discount Codes</h4>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search promo code, email..."
                        value={couponSearchQuery}
                        onChange={(e) => setCouponSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Coupons List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Coupon Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Access Provision</th>
                          <th className="py-3 px-4">Redemptions</th>
                          <th className="py-3 px-4">Assigned Email (Editable)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {couponsList
                          .filter((c) => {
                            if (!couponSearchQuery.trim()) return true;
                            const cq = couponSearchQuery.toLowerCase();
                            return (
                              c.code.toLowerCase().includes(cq) ||
                              (c.targetUserEmail && c.targetUserEmail.toLowerCase().includes(cq)) ||
                              (c.description && c.description.toLowerCase().includes(cq))
                            );
                          })
                          .map((coupon) => {
                            const limitN = coupon.customerLimit || 0;
                            const redeemed = coupon.currentRedemptions || 0;
                            const audience = coupon.audienceType || 'all';

                            let audienceBadge = '🌐 First N Customers';
                            let audienceBg = 'bg-blue-50 text-blue-700 border-blue-200';
                            if (audience === 'retail') {
                              audienceBadge = '🛍️ First N Retail Customers';
                              audienceBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else if (audience === 'production') {
                              audienceBadge = '🏭 First N Production Customers';
                              audienceBg = 'bg-amber-50 text-amber-700 border-amber-200';
                            }

                            return (
                              <tr key={coupon.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                  <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">{coupon.code}</span>
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

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`coupon-email-${coupon.id}`}
                                      type="text"
                                      placeholder="Enter user email or User ID..."
                                      defaultValue={coupon.targetUserEmail || ''}
                                      onBlur={(e) => handleUpdateCouponUserEmail(coupon.id, e.target.value)}
                                      className="w-48 px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs font-bold"
                                    />
                                    <button
                                      onClick={() => handleSendCouponNotification(coupon.id, (document.getElementById(`coupon-email-${coupon.id}`) as HTMLInputElement)?.value || coupon.targetUserEmail || '')}
                                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-1.5 rounded-xl bg-[#48A63E] text-white hover:bg-[#388531] transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Send</span>
                                    </button>
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    coupon.status === 'Active' && (!limitN || redeemed < limitN)
                                      ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {limitN > 0 && redeemed >= limitN ? 'Exhausted' : coupon.status}
                                  </span>
                                </td>

                                <td className="py-4 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => handleBatchDispatchCoupon(coupon)}
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all border border-blue-200 shadow-xs cursor-pointer"
                                    title="Auto-dispatch notification & email to first N targeted customers"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Dispatch N</span>
                                  </button>
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
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of users allotted coupons, usage status (Used / Unused), and single-use enforcement.</p>
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
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                      Unused (Pending)
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

              {/* TAB 8: ADMIN BROADCAST & DIRECT MESSAGES */}
              {activeTab === 'broadcast' && (
                <div className="space-y-5">
                  {/* Broadcast Overview KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Dispatched Messages</span>
                        <Send className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{adminMessagesList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Admin Directives & Announcements</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Staff Messages</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {adminMessagesList.filter(m => m.recipientType.includes('Staff')).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Retail & Production Directives</div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-[#EFE7DE] shadow-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Supplier Notices</span>
                        <Briefcase className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {adminMessagesList.filter(m => m.recipientType.includes('Supplier')).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Furniture Manufacturer Notices</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                    <div className="border-b border-[#EFE7DE] pb-3">
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#48A63E]" />
                        Dispatch Message from Admin
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Send official announcements or direct messages to Staff members and Ready-Made Furniture Suppliers. Messages will appear directly on their dashboards as "Message from Admin".
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
                            <option value="All Suppliers">All Ready-Made Furniture Suppliers</option>
                            <option value="Specific Supplier">Specific Supplier Partner (by Email)</option>
                          </select>
                        </div>

                        {(adminMsgRecipientType === 'Specific Staff' || adminMsgRecipientType === 'Specific Supplier') && (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Account Email *</label>
                            <input
                              type="email"
                              placeholder="e.g. staff@retailsphere.com or supplier@furniturecrafts.com"
                              value={adminMsgTargetEmail}
                              onChange={(e) => setAdminMsgTargetEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                              required
                            />
                          </div>
                        )}

                        <div className={(adminMsgRecipientType === 'Specific Staff' || adminMsgRecipientType === 'Specific Supplier') ? 'sm:col-span-2' : ''}>
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
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE]">
                            {adminMessagesList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-[#7A6C5E]">
                                  No admin messages dispatched yet.
                                </td>
                              </tr>
                            ) : (
                              adminMessagesList.map((msg) => (
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
                                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl shadow-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        Delivered & Read ✓
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shadow-xs">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        Delivered
                                      </span>
                                    )}
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

      {/* MODAL 1: ADD STAFF MEMBER */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Add Staff Member</h3>
                <p className="text-[11px] text-[#7A6C5E]">Account will be created & credentials emailed to staff.</p>
              </div>
              <button onClick={() => setIsAddStaffModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
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
                <label className="block font-extrabold text-[#2C241D] mb-1">Staff Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Verma"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address (Username)</label>
                <input
                  type="email"
                  placeholder="ramesh@retailsphere.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
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
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                >
                  <option value="Retail Staff">Retail Staff (Sales & Orders)</option>
                  <option value="Production Staff">Production Staff (Furniture Studio)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Temporary Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs"
                />
                <p className="text-[10px] text-[#7A6C5E] mt-1">Leave empty to auto-generate a strong password. Credentials will be emailed.</p>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold hover:bg-[#F2ECE1]"
                  disabled={isSubmittingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold shadow-md flex items-center justify-center gap-1.5"
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

      {/* MODAL 4: DELETE PRODUCT CONFIRMATION */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-[#E2D7CB] space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-extrabold text-[#2C241D]">Remove Product?</h3>
            <p className="text-xs text-[#7A6C5E]">Are you sure you want to remove <strong>"{productToDelete.name}"</strong> from catalog?</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md"
              >
                Confirm Delete
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
                <h3 className="text-base font-extrabold text-[#2C241D]">Add Product Supplier</h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Register wholesale vendors and ready-made product manufacturers.</p>
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
                  Save Supplier
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Admin Security & Profile Settings</h3>
              <button onClick={() => setIsAdminProfileModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
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
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Admin Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#EFE7DE] space-y-2">
                <span className="font-extrabold text-[#2C241D] block">Update Password Credentials</span>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs"
                />
                <input
                  type="password"
                  placeholder="New Password (min 6 chars)"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminProfileModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Edit User Profile</h3>
                <p className="text-[11px] text-[#7A6C5E] font-mono">{editingUser.email}</p>
              </div>
              <button onClick={() => setIsEditUserModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Account Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                >
                  <option value="Customer">Customer</option>
                  <option value="Retail Staff">Retail Staff</option>
                  <option value="Production Staff">Production Staff</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Account Status</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2C241D]">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editUserStatus === true}
                      onChange={() => setEditUserStatus(true)}
                      className="accent-[#48A63E]"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editUserStatus === false}
                      onChange={() => setEditUserStatus(false)}
                      className="accent-rose-600"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold hover:bg-[#F5ECE1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: USER PURCHASED PRODUCTS */}
      {isPurchasedProductsModalOpen && selectedUserForPurchases && (() => {
        const userEmail = (selectedUserForPurchases.email || '').toLowerCase().trim();
        const userId = selectedUserForPurchases.user_id;

        const userOrders = orderList.filter((o) => {
          const orderEmail = (o.email || '').toLowerCase().trim();
          if (orderEmail && orderEmail === userEmail) return true;
          if (o.customerId && (o.customerId === userId || String(o.customerId) === String(userId))) return true;
          return false;
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
                  <div className="w-12 h-12 rounded-full bg-[#38A132] text-white font-black flex items-center justify-center text-base shadow-md flex-shrink-0">
                    {(selectedUserForPurchases.full_name || selectedUserForPurchases.name || selectedUserForPurchases.email)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1A140E] tracking-tight flex items-center gap-2">
                      <span>Purchased Products History</span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#38A132]/15 text-[#2C6B27] border border-[#38A132]/40">
                        {selectedUserForPurchases.role || selectedUserForPurchases.role_name || 'Customer'}
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

              {/* Purchase Overview Stats */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">Total Orders</span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">{userOrders.length}</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">Items Purchased</span>
                  <div className="text-xl font-black text-[#2C6B27] mt-0.5">{totalItemsCount} Products</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">Total Amount Spent</span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Products List Body */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
                {purchasedItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingBag className="w-12 h-12 text-[#9E9082] mx-auto" />
                    <h4 className="font-extrabold text-base text-[#1A140E]">No Purchased Products Found</h4>
                    <p className="text-xs text-[#5C4D3E] font-medium">This user has not completed any product orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedItems.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white p-4 rounded-2xl border border-[#E2D7CB] flex items-center justify-between gap-4 shadow-xs hover:border-[#38A132] transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0"
                          />
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
    </div>
  );
};
