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
  Sliders
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
  createSupplierInDB 
} from '../../services/api';

import { respondToStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import { getStoredCoupons, addStoredCoupon, removeStoredCoupon, updateCouponUserEmail, sendCouponToCustomer, getCouponAllotments, Coupon, CouponAllotment } from '../../utils/couponStorage';
import { getStoredRetailOrders } from '../../utils/retailOrdersStorage';

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
  product_id?: number;
  name: string;
  category: string;
  material: string;
  price: number;
  stockCount: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image_url?: string;
  sku?: string;
}

export interface RetailProduct {
  id: string;
  name: string;
  category: string;
  material: string;
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
  customerName: string;
  email: string;
  itemsCount: number;
  totalAmount: number;
  orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  orderDate: string;
  items?: Array<{
    id: string;
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

  // Active View Tab: staff | products | inventory | suppliers | orders | queries | coupons
  const [activeTab, setActiveTab] = useState<'staff' | 'products' | 'inventory' | 'suppliers' | 'orders' | 'queries' | 'coupons'>('staff');

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
        const mapped: StaffMember[] = dbUsers.map((u: any) => ({
          id: `staff-${u.id}`,
          user_id: u.id,
          name: u.full_name || 'Staff Member',
          email: u.email,
          phone: u.phone || 'N/A',
          role: u.role === 'Production Staff' ? 'Production Staff' : 'Retail Staff',
          status: u.is_active ? 'Active' : 'Inactive',
          dateAdded: u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'Recent'
        }));
        setStaffMembers(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch DB staff members:', err);
    }
  };

  useEffect(() => {
    loadStaffFromDB();
  }, []);

  // Products Catalog Management State
  const [productList, setProductList] = useState<RetailProduct[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('All');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [newProdMaterial, setNewProdMaterial] = useState('Teak Wood');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdImage, setNewProdImage] = useState('');

  // Edit Product Modal State
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Living Room');
  const [editProdMaterial, setEditProdMaterial] = useState('Teak Wood');
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
        const mapped: RetailProduct[] = dbItems.map((p: any) => ({
          id: p.id || `inv-${p.product_id}`,
          sku: `SKU-RS-${p.product_id || p.id}`,
          name: p.name || 'Untitled Product',
          category: p.category || 'Living Room',
          material: p.material || 'Standard',
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
          stockCount: typeof p.stockCount === 'number' ? p.stockCount : parseInt(p.stockCount) || 0,
          status: p.status || 'In Stock',
          image_url: p.image_url,
        }));
        setProductList(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch DB inventory for admin:', err);
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
      if (dbSups && Array.isArray(dbSups) && dbSups.length > 0) {
        setSupplierList(dbSups);
      } else {
        setSupplierList([
          {
            id: 'sup-101',
            supplier_id: 101,
            supplier_name: 'Arun Raj',
            contact_person: 'Arun Raj (Senior Logistics Vendor)',
            phone: '9778237180',
            address: 'Kerala Furniture Hub, India',
            assigned_products_count: 6,
            status: 'Active',
          },
          {
            id: 'sup-102',
            supplier_id: 102,
            supplier_name: 'Rahul Dev',
            contact_person: 'Rahul Dev (Supply Partner)',
            phone: '7736783189',
            address: 'Kochi Timber & Decor, Kerala, India',
            assigned_products_count: 7,
            status: 'Active',
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not load suppliers from DB:', err);
    }
  };

  useEffect(() => {
    loadSuppliersFromDB();
  }, []);

  // Order Fulfillment Studio State
  const [orderList, setOrderList] = useState<RetailOrder[]>(() => getStoredRetailOrders() as any);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

  useEffect(() => {
    const handleRetailOrdersUpdate = () => {
      setOrderList(getStoredRetailOrders() as any);
    };
    window.addEventListener('retail-orders-updated', handleRetailOrdersUpdate);
    window.addEventListener('storage', handleRetailOrdersUpdate);
    return () => {
      window.removeEventListener('retail-orders-updated', handleRetailOrdersUpdate);
      window.removeEventListener('storage', handleRetailOrdersUpdate);
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
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponUserEmail, setNewCouponUserEmail] = useState('');
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

    try {
      const created = await createProductInDB({
        name: newProdName.trim(),
        category: newProdCategory,
        material: newProdMaterial.trim(),
        price: priceVal,
        stock_count: qty,
        image_url: imgUrl,
      });

      const newItem: RetailProduct = {
        id: created.id || `prod-${Date.now()}`,
        sku: newProdSku.trim() || `SKU-RS-${created.product_id || Math.floor(100 + Math.random() * 900)}`,
        name: created.name || newProdName.trim(),
        category: created.category || newProdCategory,
        material: created.material || newProdMaterial,
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
        category: newProdCategory,
        material: newProdMaterial,
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
  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount) return;

    const discountVal = parseInt(newCouponDiscount, 10) || 10;
    const targetEmail = newCouponUserEmail.trim();

    addStoredCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountPercent: discountVal,
      description: newCouponDesc.trim() || `Special ${discountVal}% Discount Coupon`,
      targetUserEmail: targetEmail || undefined
    });

    if (targetEmail) {
      sendCouponToCustomer(newCouponCode.trim().toUpperCase(), targetEmail);
    }

    setCouponsList(getStoredCoupons());
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDesc('');
    setNewCouponUserEmail('');

    setSuccessBanner(`Coupon "${newCouponCode.trim().toUpperCase()}" created successfully!`);
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

  const handleSaveAdminProfile = (e: React.FormEvent) => {
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
    setIsAdminProfileModalOpen(false);
    setSuccessBanner('Admin profile & security credentials updated successfully!');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Calculations for KPI summary cards
  const totalProducts = productList.length;
  const totalInStock = productList.reduce((acc, item) => acc + item.stockCount, 0);
  const lowStockCount = productList.filter((item) => item.stockCount < 5).length;
  const activeOrdersCount = orderList.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const lowStockProductsList = productList.filter(item => item.stockCount < 5);

  const displayProducts = productList.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    let matchesPrice = true;
    if (priceRangeFilter === '<10k') matchesPrice = item.price < 10000;
    else if (priceRangeFilter === '10k-25k') matchesPrice = item.price >= 10000 && item.price <= 25000;
    else if (priceRangeFilter === '25k-50k') matchesPrice = item.price > 25000 && item.price <= 50000;
    else if (priceRangeFilter === '50k+') matchesPrice = item.price > 50000;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.material.toLowerCase().includes(q);

    return matchesCategory && matchesPrice && matchesSearch;
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
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C241D] font-sans antialiased selection:bg-[#48A63E]/20 selection:text-[#48A63E] relative overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#48A63E]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* SIDE NAVIGATION BAR (STAFF PROFILE STYLE) */}
        <aside className="w-64 bg-[#FAF7F2] border-r border-[#EFE7DE] flex-shrink-0 hidden md:block relative z-20">
          <div className="p-6 space-y-6 sticky top-0 max-h-screen overflow-y-auto">
            {/* Brand Logo */}
            <div className="flex items-center justify-between">
              <div>
                <Link to="/dashboard" className="font-extrabold text-[#2C241D] text-lg tracking-tight block hover:opacity-90 transition-opacity">
                  RetailSphere <span className="text-[#48A63E]">AI</span>
                </Link>
                <span className="text-[10px] font-extrabold text-[#48A63E] uppercase tracking-widest block font-mono -mt-0.5">
                  Admin Executive Portal
                </span>
              </div>
            </div>

            {/* Side Navigation Links */}
            <nav className="space-y-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('staff')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'staff'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Staff Accounts</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'staff' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {staffMembers.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'products'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span>Product Management</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {productList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Stock & Inventory</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {totalInStock}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('suppliers')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'suppliers'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4" />
                  <span>Supplier Directory</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'suppliers' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {supplierList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'orders'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Customer Orders</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-[#48A63E]/15 text-[#48A63E]'
                }`}>
                  {activeOrdersCount} Active
                </span>
              </button>

              <button
                onClick={() => setActiveTab('queries')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'queries'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Queries & Requests</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'queries' ? 'bg-white/20 text-white' : 'bg-[#48A63E]/15 text-[#48A63E]'
                }`}>
                  {staffQueries.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('coupons')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'coupons'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4" />
                  <span>Coupons & Discounts</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'coupons' ? 'bg-white/20 text-white' : 'bg-[#48A63E]/15 text-[#48A63E]'
                }`}>
                  {couponsList.length}
                </span>
              </button>
            </nav>
          </div>
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
                    {activeTab === 'staff' && 'Staff Accounts Management'}
                    {activeTab === 'products' && 'Retail Product Management'}
                    {activeTab === 'inventory' && 'Inventory Stock Control'}
                    {activeTab === 'suppliers' && 'Supplier Network & Vendor Management'}
                    {activeTab === 'orders' && 'Customer Ready-Made Orders'}
                    {activeTab === 'queries' && 'Queries & Request Communications'}
                    {activeTab === 'coupons' && 'Coupons & Customer Discounts'}
                  </h1>
                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                    {activeTab === 'staff' && 'Create and manage Retail Staff and Production Staff user accounts with credentials dispatch.'}
                    {activeTab === 'products' && 'Add new furniture products, update product pricing, materials, and catalog specifications.'}
                    {activeTab === 'inventory' && 'Monitor stock counts across living room, dining, and bedroom collections.'}
                    {activeTab === 'suppliers' && 'Manage raw material suppliers, timber mills, and product vendor allocations.'}
                    {activeTab === 'orders' && 'Fulfill customer ready-made orders and update shipping statuses.'}
                    {activeTab === 'queries' && 'Review staff requests, email change applications, and issue official admin responses.'}
                    {activeTab === 'coupons' && 'Create promo codes and dispatch notifications & emails directly to targeted customer accounts.'}
                  </p>
                </div>

                {/* Top Right Controls: Action Button + Notification Bell + Profile Menu Pill */}
                <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                  {activeTab === 'products' && (
                    <button
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  )}

                  {activeTab === 'suppliers' && (
                    <button
                      onClick={() => setIsAddSupplierModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Supplier</span>
                    </button>
                  )}

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

              {/* TAB 1: STAFF ACCOUNTS MANAGEMENT (ADMIN FEATURE) */}
              {activeTab === 'staff' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Header & Create Staff Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Staff Member Accounts</h3>
                      <p className="text-xs text-[#7A6C5E]">Create and manage Retail Staff and Production Staff accounts.</p>
                    </div>

                    <button
                      onClick={() => setIsAddStaffModalOpen(true)}
                      className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Staff Member</span>
                    </button>
                  </div>

                  {/* Role Filters */}
                  <div className="flex items-center gap-2">
                    {['All', 'Retail Staff', 'Production Staff'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setStaffRoleFilter(role as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                          staffRoleFilter === role
                            ? 'bg-[#48A63E] text-white'
                            : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
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

              {/* TAB 2: PRODUCTS CATALOG MANAGEMENT (FROM STAFF DASHBOARD) */}
              {activeTab === 'products' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Furniture Products Catalog</h3>
                      <p className="text-xs text-[#7A6C5E]">Full inventory control, price edits, and SKU product code manager.</p>
                    </div>

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
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#7A6C5E]">Category:</span>
                      {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors ${
                            categoryFilter === cat
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

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
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Product Code (SKU)</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Material</th>
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
                            <td className="py-3.5 px-4 font-mono text-[#48A63E] font-extrabold">{prod.sku}</td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">{prod.category}</td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">{prod.material}</td>
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
              )}

              {/* TAB 3: STOCK CONTROL & WAREHOUSE (FROM STAFF DASHBOARD) */}
              {activeTab === 'inventory' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Stock Control & Warehouse Availability</h3>
                      <p className="text-xs text-[#7A6C5E]">Adjust unit quantities, monitor low-stock thresholds, and reorder stock.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search stock by name, SKU, category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        onClick={() => setShowLowStockModal(true)}
                        className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Low Stock Alert ({lowStockCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Available Units</th>
                          <th className="py-3 px-4">Warehouse Status</th>
                          <th className="py-3 px-4 text-right">Stock Adjustments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {displayProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                              <SlidersHorizontal className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No stock inventory items found</p>
                              <p className="text-[11px] text-[#8C7C6D]">Try searching for another product name or clearing filters.</p>
                            </td>
                          </tr>
                        ) : (
                          displayProducts.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">{item.name}</td>
                            <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{item.price.toLocaleString('en-IN')}</td>
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">{item.stockCount} Units</td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                item.status === 'In Stock'
                                  ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                  : item.status === 'Low Stock'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
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

              {/* TAB 4: SUPPLIER DIRECTORY (FROM STAFF DASHBOARD) */}
              {activeTab === 'suppliers' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Supplier Directory & Vendor Partners</h3>
                      <p className="text-xs text-[#7A6C5E]">Logistics partners, assigned product codes, and vendor contact info.</p>
                    </div>

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
              )}

              {/* TAB 5: ORDER FULFILLMENT STUDIO (FROM STAFF DASHBOARD) */}
              {activeTab === 'orders' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Order Fulfillment Studio</h3>
                      <p className="text-xs text-[#7A6C5E]">Track retail customer orders and update shipment statuses.</p>
                    </div>

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
                  </div>

                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Customer Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Items</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Order Status</th>
                          <th className="py-3 px-4 text-right">Update Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {orderList.filter((o) => orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-[#7A6C5E]">
                              <ShoppingBag className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No customer orders found</p>
                              <p className="text-[11px] text-[#8C7C6D]">When customers place ready-made furniture orders, they will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          orderList
                            .filter((o) => orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter)
                            .map((ord) => (
                              <tr key={ord.orderId} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4 font-mono font-extrabold text-[#48A63E]">{ord.orderId}</td>
                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">{ord.customerName}</td>
                                <td className="py-4 px-4 text-[#6B5C4D]">{ord.email}</td>
                                <td className="py-4 px-4 text-[#6B5C4D]">{ord.itemsCount} Items</td>
                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{ord.totalAmount.toLocaleString('en-IN')}</td>
                                <td className="py-4 px-4">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid</span>
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    ord.orderStatus === 'Delivered'
                                      ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                      : ord.orderStatus === 'Shipped'
                                        ? 'bg-blue-100 text-blue-700'
                                        : ord.orderStatus === 'Processing'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {ord.orderStatus}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <select
                                    value={ord.orderStatus}
                                    onChange={(e) => handleUpdateOrderStatus(ord.orderId, e.target.value as any)}
                                    className="px-2.5 py-1 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                  </select>
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
                    <div>
                      <h3 className="text-lg font-extrabold text-[#2C241D]">Staff & Customer Queries Inbox</h3>
                      <p className="text-xs text-[#7A6C5E]">Review requests from staff & customers and send official responses.</p>
                    </div>

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
                        {staffQueries.filter((q) => queryFilter === 'All' || (queryFilter === 'Pending' ? q.status === 'Pending' : q.status !== 'Pending')).length === 0 ? (
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
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Create Coupon Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] space-y-3">
                    <h4 className="font-extrabold text-sm text-[#2C241D]">Create New Promo Code</h4>
                    <form onSubmit={handleCreateCouponSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-[#7A6C5E] mb-1">Coupon Code</label>
                        <input
                          type="text"
                          placeholder="e.g. VIP25"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-[#48A63E]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#7A6C5E] mb-1">Discount %</label>
                        <input
                          type="number"
                          placeholder="e.g. 25"
                          value={newCouponDiscount}
                          onChange={(e) => setNewCouponDiscount(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#7A6C5E] mb-1">Assigned User / Email (Optional)</label>
                        <input
                          type="text"
                          placeholder="Target customer email..."
                          value={newCouponUserEmail}
                          onChange={(e) => setNewCouponUserEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Coupon</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Coupons List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Coupon Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Assigned Customer Email / User ID</th>
                          <th className="py-3 px-4">Created Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {couponsList.map((coupon) => (
                          <tr key={coupon.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                              <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">{coupon.code}</span>
                            </td>
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">{coupon.discountPercent}% OFF</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <input
                                  id={`coupon-email-${coupon.id}`}
                                  type="text"
                                  placeholder="Enter user email or User ID..."
                                  defaultValue={coupon.targetUserEmail || ''}
                                  onBlur={(e) => handleUpdateCouponUserEmail(coupon.id, e.target.value)}
                                  className="w-56 px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs font-bold"
                                />
                                <button
                                  onClick={() => handleSendCouponNotification(coupon.id, (document.getElementById(`coupon-email-${coupon.id}`) as HTMLInputElement)?.value || coupon.targetUserEmail || '')}
                                  className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl bg-[#48A63E] text-white hover:bg-[#388531] transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Send Email</span>
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-[#7A6C5E]">{coupon.createdDate}</td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E]">
                                {coupon.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleRemoveCoupon(coupon.id, coupon.code)}
                                className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))}
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
              )}
            </div>
          </main>
        </div>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Dining Room">Dining Room</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Home Office">Home Office</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Material</label>
                  <input
                    type="text"
                    placeholder="Teak / Fabric"
                    value={newProdMaterial}
                    onChange={(e) => setNewProdMaterial(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                  />
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
              <h3 className="text-base font-extrabold text-[#2C241D]">Add New Supplier</h3>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Supplier / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Arun Raj Logistics"
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
    </div>
  );
};
