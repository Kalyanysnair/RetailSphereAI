import React, { useState, useEffect } from 'react';

import { useNavigate, Link } from 'react-router-dom';
import {
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
  DollarSign,
  ShoppingBag,
  Clock,
  Truck,
  Edit,
  Eye,
  Check,
  RotateCcw,
  User,
  ShieldCheck,
  ChevronDown,
  Lock,
  Key,
  MessageSquare,
  Send,
  HelpCircle,
  Bell
} from 'lucide-react';







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
}

export interface RetailSupplier {
  id: string;
  supplier_id?: number;
  supplier_name: string;
  contact_person: string;
  phone: string;
  address: string;
  assigned_products_count?: number;
  status: 'Active' | 'Inactive';
}

import {
  fetchInventoryFromDB,
  createProductInDB,
  updateStockInDB,
  fetchQueriesFromDB,
  createStaffQueryInDB,
  fetchNotificationsFromDB,
  fetchSuppliersFromDB,
  createSupplierInDB
} from '../../services/api';
import { addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import { getStoredRetailOrders } from '../../utils/retailOrdersStorage';

export const INITIAL_PRODUCTS: RetailProduct[] = [];
export const INITIAL_ORDERS: RetailOrder[] = [];

export const RetailStaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: inventory | products | orders | queries | suppliers
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'orders' | 'queries' | 'suppliers'>('products');

  // Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [newQueryCategory, setNewQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('Email Change Request');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');

  // Notifications & User Menu State
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



  const loadQueriesFromDB = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      if (dbQueries && Array.isArray(dbQueries)) {
        setStaffQueries(dbQueries);
      } else {
        setStaffQueries([]);
      }
    } catch (err) {
      console.warn('Error loading DB queries:', err);
      setStaffQueries([]);
    }
  };

  useEffect(() => {
    loadQueriesFromDB();
  }, []);

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuerySubject.trim() || !newQueryMessage.trim()) return;

    const payload = {
      staff_name: currentUser.name || 'Retail Staff Member',
      staff_email: currentUser.email || 'retail.staff@retailsphere.com',
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
    setSuccessNotice('Your request has been submitted to Admin! You can track Admin responses here.');

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };


  // Products & Inventory State

  const [productList, setProductList] = useState<RetailProduct[]>(INITIAL_PRODUCTS);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');


  // Orders State
  const [orderList, setOrderList] = useState<RetailOrder[]>(() => getStoredRetailOrders() as any);

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

  // Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState<RetailProduct | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('10');

  const [successNotice, setSuccessNotice] = useState<string | null>(null);






  // User Info from localStorage (No hardcoded demo data)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; initials: string }>({
    name: '',
    email: '',
    initials: 'RS'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.full_name || parsed.fullName || parsed.name || parsed.email || 'Staff User';
        const email = parsed.email || '';

        let initials = 'RS';
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
      console.warn('Error reading user from localStorage:', err);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Staff Profile Modal State
  const [isStaffProfileModalOpen, setIsStaffProfileModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '+91 98765 43210',
    department: 'Retail Furniture Catalog & Sales',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser.name || currentUser.email) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: currentUser.name || '',
        email: currentUser.email || '',
        phone: '+91 98765 43210',
        department: 'Retail Furniture Catalog & Sales'
      }));
    }
  }, [currentUser]);

  const handleSaveStaffProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validate Password Update Provision if any password field is filled
    if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        setPasswordError('Please enter your current password to confirm account security updates.');
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
    let parsed = stored ? JSON.parse(stored) : {};
    parsed = { ...parsed, full_name: profileForm.full_name, email: profileForm.email };
    localStorage.setItem('user', JSON.stringify(parsed));

    let initials = 'RS';
    if (profileForm.full_name) {
      const parts = profileForm.full_name.trim().split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts[0].length >= 2) {
        initials = parts[0].substring(0, 2).toUpperCase();
      } else {
        initials = parts[0][0].toUpperCase();
      }
    }

    setCurrentUser({
      name: profileForm.full_name,
      email: profileForm.email,
      initials
    });

    setIsStaffProfileModalOpen(false);
    const noticeMsg = profileForm.newPassword
      ? `Staff profile and security password for "${profileForm.full_name}" updated successfully!`
      : `Staff profile for "${profileForm.full_name}" updated successfully!`;

    setSuccessNotice(noticeMsg);

    // Reset password fields
    setProfileForm((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  // New Product Form State


  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [newProdMaterial, setNewProdMaterial] = useState('Teak Wood');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDimensions, setNewProdDimensions] = useState('');
  const [newProdWarranty, setNewProdWarranty] = useState('5 Years Solid Wood Warranty');
  const [newProdDescription, setNewProdDescription] = useState('');

  // Supplier Management State
  const [supplierList, setSupplierList] = useState<RetailSupplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  // New Supplier Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const loadSuppliersFromDB = async () => {
    setIsLoadingSuppliers(true);
    try {
      const dbSuppliers = await fetchSuppliersFromDB();
      if (Array.isArray(dbSuppliers) && dbSuppliers.length > 0) {
        setSupplierList(dbSuppliers);
      }
    } catch (err) {
      console.warn('Could not fetch suppliers from DB:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    loadSuppliersFromDB();
  }, []);

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
      setSuccessNotice(`Supplier "${created.supplier_name}" added successfully!`);
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
      setSuccessNotice(`Supplier "${fallback.supplier_name}" added successfully!`);
    }

    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setNewSupGst('');
    setIsAddSupplierModalOpen(false);

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  const filteredSuppliers = supplierList.filter((s) => {
    if (!supplierSearchQuery.trim()) return true;
    const q = supplierSearchQuery.toLowerCase();
    return (
      s.supplier_name.toLowerCase().includes(q) ||
      s.contact_person.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q)
    );
  });


  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Load products live from PostgreSQL DB on mount
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
      console.warn('Could not fetch DB inventory for retail staff:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProductsFromDB();
  }, []);



  // Add Product Handler
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
      setSuccessNotice(`Product "${newItem.name}" added to PostgreSQL Database successfully!`);
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
      setSuccessNotice(`Product "${newItem.name}" added to catalog successfully!`);
    }

    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdSku('');
    setNewProdImage('');
    setIsAddProductModalOpen(false);

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };


  // Confirm Restock Quantity Handler
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const addQty = parseInt(restockAmount) || 0;
    if (addQty <= 0) return;

    const newTotal = restockProduct.stockCount + addQty;
    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (newTotal === 0) newStatus = 'Out of Stock';
    else if (newTotal < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((item) => (item.id === restockProduct.id ? { ...item, stockCount: newTotal, status: newStatus } : item))
    );

    // Persist to PostgreSQL DB
    const dbId = parseInt(restockProduct.id.replace('inv-', '').replace('prod-', '')) || undefined;
    if (dbId) {
      try {
        await updateStockInDB(dbId, newTotal);
      } catch (err) {
        console.warn('Could not persist restock to DB:', err);
      }
    }

    setSuccessNotice(`Successfully restocked +${addQty} units for "${restockProduct.name}"! Total stock: ${newTotal} units.`);
    setRestockProduct(null);
    setRestockAmount('10');

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  // Adjust Stock Count
  const handleStockCountChange = (id: string, delta: number) => {
    setProductList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, item.stockCount + delta);
          let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
          if (newQty === 0) newStatus = 'Out of Stock';
          else if (newQty < 5) newStatus = 'Low Stock';

          const dbId = parseInt(id.replace('inv-', '').replace('prod-', '')) || undefined;
          if (dbId) {
            updateStockInDB(dbId, newQty).catch((err) => console.warn('DB stock update error:', err));
          }

          return { ...item, stockCount: newQty, status: newStatus };
        }
        return item;
      })
    );
  };


  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered') => {
    setOrderList((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, orderStatus: newStatus } : ord))
    );
  };

  // Calculate map of ordered items count across all customer orders
  const orderedQtyMap: Record<string, number> = {};
  orderList.forEach((ord: any) => {
    if (ord.items && Array.isArray(ord.items)) {
      ord.items.forEach((item: any) => {
        const nameKey = (item.name || '').toLowerCase().trim();
        const idKey = (item.id || '').toLowerCase().trim();
        if (nameKey) orderedQtyMap[nameKey] = (orderedQtyMap[nameKey] || 0) + (item.quantity || 1);
        if (idKey) orderedQtyMap[idKey] = (orderedQtyMap[idKey] || 0) + (item.quantity || 1);
      });
    }
  });

  // Display products with stock automatically updated corresponding to customer orders done
  const displayProducts = productList.map((p) => {
    const nameKey = p.name.toLowerCase().trim();
    const idKey = p.id.toLowerCase().trim();
    const orderedQty = orderedQtyMap[nameKey] || orderedQtyMap[idKey] || 0;
    const currentStock = Math.max(0, p.stockCount - orderedQty);
    let currentStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (currentStock === 0) currentStatus = 'Out of Stock';
    else if (currentStock < 5) currentStatus = 'Low Stock';

    return {
      ...p,
      stockCount: currentStock,
      status: currentStatus,
    };
  });

  // Filtered Products for both Products and Inventory tabs
  const filteredProducts = displayProducts.filter((item) => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

    if (priceRangeFilter === 'under30k' && item.price >= 30000) return false;
    if (priceRangeFilter === '30k-75k' && (item.price < 30000 || item.price > 75000)) return false;
    if (priceRangeFilter === '75k-150k' && (item.price < 75000 || item.price > 150000)) return false;
    if (priceRangeFilter === 'above150k' && item.price <= 150000) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalInStock = displayProducts.reduce((acc, i) => acc + i.stockCount, 0);
  const lowStockCount = displayProducts.filter((i) => i.stockCount < 5).length;
  const activeOrdersCount = orderList.length;

  return (
    <div className="relative min-h-screen text-[#2C241D] flex selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Ambient Warm Luxury Living Room Background Image Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />

      {/* Lighter Translucent Warm Cream Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-10 flex w-full min-h-screen items-stretch">
        {/* LEFT SIDEBAR (Matching Customer Dashboard Aesthetics) */}
        <aside className="w-72 ultra-glass-panel border-r border-[#E2D7CB] hidden md:flex flex-col justify-between p-6 shadow-xl sticky top-0 h-screen min-h-screen z-20 flex-shrink-0">

          <div className="space-y-8">
            {/* Brand Logo */}
            <div className="flex items-center justify-between">
              <div>
                <Link to="/dashboard" className="font-extrabold text-[#2C241D] text-lg tracking-tight block hover:opacity-90 transition-opacity">
                  RetailSphere <span className="text-[#48A63E]">AI</span>
                </Link>
                <span className="text-[10px] font-extrabold text-[#48A63E] uppercase tracking-widest block font-mono -mt-0.5">
                  Retail Staff Portal
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'products'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span>Product Management</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                  }`}>
                  {productList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'inventory'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Stock & Inventory</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                  }`}>
                  {totalInStock}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'orders'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Customer Orders</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-[#48A63E]/15 text-[#48A63E]'
                  }`}>
                  {activeOrdersCount} Active
                </span>
              </button>

              <button
                onClick={() => setActiveTab('queries')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'queries'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Queries & Admin Requests</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'queries' ? 'bg-white/20 text-white' : 'bg-[#48A63E]/15 text-[#48A63E]'
                  }`}>
                  {staffQueries.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('suppliers')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'suppliers'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4" />
                  <span>Supplier Management</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'suppliers' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                  }`}>
                  {supplierList.length}
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
              <span className="font-extrabold text-sm text-slate-900">Retail Staff Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === 'products' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === 'orders' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
              >
                Orders
              </button>
            </div>
          </div>

          <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
            <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative">
              {/* Glossy Top Reflection Sheen */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

              {/* Success Notice */}
              {successNotice && (
                <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs font-extrabold leading-relaxed">
                    {successNotice}
                  </div>
                  <button
                    onClick={() => setSuccessNotice(null)}
                    className="text-[#48A63E] hover:text-[#3D9134] p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Page Top Header with Staff Profile & Sign Out in Top Right */}
              <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                    {activeTab === 'products' && 'Retail Product Management'}
                    {activeTab === 'inventory' && 'Inventory Stock Control'}
                    {activeTab === 'orders' && 'Customer Ready-Made Orders'}
                    {activeTab === 'queries' && 'Staff Queries & Admin Request Center'}
                    {activeTab === 'suppliers' && 'Supplier Network & Vendor Management'}
                  </h1>
                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                    {activeTab === 'products' && 'Add new furniture products, update product pricing, materials, and catalog specifications.'}
                    {activeTab === 'inventory' && 'Monitor stock counts across living room, dining, and bedroom collections.'}
                    {activeTab === 'orders' && 'Fulfill customer ready-made orders and update shipping statuses.'}
                    {activeTab === 'queries' && 'Submit email change requests or system queries directly to system Admin.'}
                    {activeTab === 'suppliers' && 'Manage raw material suppliers, timber mills, and product vendor allocations.'}
                  </p>
                </div>

                {/* Top Right Corner Controls: Add Product / Supplier + Staff Profile & Sign Out */}
                <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                  {activeTab === 'products' && (
                    <button
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  )}

                  {activeTab === 'suppliers' && (
                    <button
                      onClick={() => setIsAddSupplierModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Supplier</span>
                    </button>
                  )}

                  {/* Notification Bell Button & Dropdown */}
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
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                          <span className="font-extrabold text-xs text-[#2C241D]">System Notifications</span>
                          {unreadCount > 0 && (
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


                  {/* Staff Name Dropdown Pill (Profile & Sign Out inside) */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs"
                      title="Click for profile and sign out options"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                        {currentUser.initials}
                      </div>
                      <span className="text-xs font-extrabold text-[#2C241D]">
                        {currentUser.name || 'Staff Member'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                    </button>

                    {/* Dropdown Menu on Click */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                        <button
                          onClick={() => {
                            setIsStaffProfileModalOpen(true);
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

              {/* KPI Stat Cards (Only visible on product/inventory/order tabs) */}
              {activeTab !== 'queries' && (
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Total Products</span>
                      <Package className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{productList.length} Items</div>
                    <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                      Active Catalog Items
                    </div>
                  </div>

                  <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Total Stock</span>
                      <SlidersHorizontal className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{totalInStock} Units</div>
                    <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                      Warehouse Availability
                    </div>
                  </div>

                  {/* Clickable Low Stock Alert Card */}
                  <div
                    onClick={() => setShowLowStockModal(true)}
                    className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB] cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
                    title="Click to view detailed low stock report"
                  >
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E] group-hover:text-amber-800">Low Stock Alert</span>
                      <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{lowStockCount} Products</div>
                    <div className="text-[11px] font-bold text-amber-800 bg-amber-50 group-hover:bg-amber-100 px-2 py-0.5 rounded-md inline-block transition-colors">
                      Click for Inventory Details →
                    </div>
                  </div>

                  <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Active Orders</span>
                      <ShoppingBag className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{activeOrdersCount} Orders</div>
                    <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                      Pending Fulfillment
                    </div>
                  </div>
                </div>
              )}


              {/* TAB 1: PRODUCT MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Category & Price Filters & Search */}
                  <div className="space-y-3 border-b border-[#EFE7DE] pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Category Filter */}
                      <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" /> Category:
                        </span>
                        {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${categoryFilter === cat
                                ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                                : 'bg-[#F9F6F0] border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full lg:w-64 flex-shrink-0">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product title, material..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                        />
                      </div>
                    </div>

                    {/* Price Range Filter (Green Active Color) */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                        <DollarSign className="w-3.5 h-3.5 text-[#48A63E]" /> Price Range:
                      </span>
                      {[
                        { label: 'All Prices', value: 'All' },
                        { label: 'Under ₹30k', value: 'under30k' },
                        { label: '₹30k - ₹75k', value: '30k-75k' },
                        { label: '₹75k - ₹1.5L', value: '75k-150k' },
                        { label: 'Above ₹1.5L', value: 'above150k' },
                      ].map((pr) => (
                        <button
                          key={pr.value}
                          onClick={() => setPriceRangeFilter(pr.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${priceRangeFilter === pr.value
                              ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                              : 'bg-white/80 border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                            }`}
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                  </div>



                  {/* Product List Table */}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product Title</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Material</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Stock Count</th>
                          <th className="py-3 px-4 text-right">Inventory Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[#7A6C5E]">
                              <Package className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                              <p className="font-extrabold text-sm text-[#2C241D]">No Products Available</p>
                              <p className="text-xs text-[#7A6C5E] mt-1">
                                {isLoadingProducts
                                  ? 'Fetching live catalog from PostgreSQL database...'
                                  : 'No products matched your current filter criteria.'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                                    alt={item.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                                    }}
                                    className="w-10 h-10 rounded-xl object-cover border border-[#E2D7CB] shadow-xs flex-shrink-0 bg-white"
                                  />
                                  <span>{item.name}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                              <td className="py-4 px-4 text-[#6B5C4D]">{item.material}</td>
                              <td className="py-4 px-4 font-extrabold text-[#48A63E]">₹{item.price.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${item.status === 'In Stock'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                    : item.status === 'Low Stock'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                  {item.stockCount} ({item.status})
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="inline-flex items-center gap-1 bg-[#F9F6F0] p-1 rounded-xl border border-[#E2D7CB]">
                                  <button
                                    onClick={() => handleStockCountChange(item.id, -1)}
                                    className="w-6 h-6 rounded-lg bg-white hover:bg-[#F2ECE1] text-[#2C241D] font-extrabold flex items-center justify-center shadow-xs"
                                    title="Decrease stock"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => handleStockCountChange(item.id, 1)}
                                    className="w-6 h-6 rounded-lg bg-white hover:bg-[#F2ECE1] text-[#2C241D] font-extrabold flex items-center justify-center shadow-xs"
                                    title="Increase stock"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {/* TAB 2: INVENTORY STOCK */}
              {activeTab === 'inventory' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Category & Price Filters & Search Bar at the Top */}
                  <div className="space-y-3 border-b border-[#EFE7DE] pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Category Filter */}
                      <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" /> Category:
                        </span>
                        {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${categoryFilter === cat
                                ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                                : 'bg-[#F9F6F0] border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full lg:w-64 flex-shrink-0">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search title, SKU, material..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-base font-extrabold text-[#2C241D]">
                    Live Inventory Stock Monitoring ({filteredProducts.length} Items Displayed)
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-[#7A6C5E]">
                        <Package className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                        <p className="font-extrabold text-sm text-[#2C241D]">No Inventory Products Found</p>
                        <p className="text-xs text-[#7A6C5E] mt-1">No stock items matched your search query or category filter.</p>
                      </div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div key={prod.id} className="p-4 rounded-2xl border border-[#E2D7CB] bg-[#F9F6F0] space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[#7A6C5E]">{prod.sku}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${prod.status === 'In Stock'
                                ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                : prod.status === 'Low Stock'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                              {prod.status}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-extrabold text-[#2C241D] text-sm">{prod.name}</h3>
                            <p className="text-xs text-[#6B5C4D]">{prod.category} • {prod.material}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#E2D7CB]">
                            <div>
                              <span className="text-[11px] text-[#7A6C5E] block font-medium">Available Units</span>
                              <span className="text-lg font-extrabold text-[#2C241D]">{prod.stockCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStockCountChange(prod.id, -1)}
                                className="w-7 h-7 rounded-xl bg-white border border-[#E2D7CB] font-bold hover:bg-[#F2ECE1] flex items-center justify-center text-xs text-[#2C241D]"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleStockCountChange(prod.id, 1)}
                                className="w-7 h-7 rounded-xl bg-white border border-[#E2D7CB] font-bold hover:bg-[#F2ECE1] flex items-center justify-center text-xs text-[#2C241D]"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOMER ORDERS */}
              {activeTab === 'orders' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <h2 className="text-base font-extrabold text-[#2C241D] border-b border-[#EFE7DE] pb-3">
                    Customer Ready-Made Orders
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Customer Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Items</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Payment Status</th>
                          <th className="py-3 px-4">Order Status</th>
                          <th className="py-3 px-4 text-right">Update Order Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {orderList.map((ord) => (
                          <tr key={ord.orderId} className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-4 px-4 font-mono font-extrabold text-[#48A63E]">{ord.orderId}</td>
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">{ord.customerName}</td>
                            <td className="py-4 px-4 text-[#6B5C4D]">{ord.email}</td>
                            <td className="py-4 px-4 text-[#6B5C4D]">{ord.itemsCount} Items</td>
                            <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{ord.totalAmount.toLocaleString('en-IN')}</td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${ord.orderStatus === 'Delivered'
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STAFF QUERIES & ADMIN RESPONSES */}
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
                            className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] placeholder-[#8C7C6D] focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Message / Description</label>
                          <textarea
                            rows={4}
                            placeholder="Provide details about your request for the Admin..."
                            value={newQueryMessage}
                            onChange={(e) => setNewQueryMessage(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] placeholder-[#8C7C6D] focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit Request to Admin</span>
                        </button>
                      </form>
                    </div>

                    {/* Submitted Queries & Admin Responses Feed */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                        <span>Submitted Requests & Admin Responses</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#48A63E]/15 text-[#48A63E] text-xs font-extrabold">
                          {staffQueries.length} Total
                        </span>
                      </h4>

                      {staffQueries.length === 0 ? (
                        <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-[#6B5C4D]">
                          <HelpCircle className="w-10 h-10 mx-auto text-[#8C7C6D] mb-2 opacity-50" />
                          <p className="font-extrabold text-sm">No queries submitted yet</p>
                          <p className="text-xs">Use the form to send an email change request or query to Admin.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {staffQueries.map((q) => (
                            <div key={q.id} className="p-5 rounded-2xl bg-[#FAF7F2] border-2 border-[#E2D7CB] shadow-xs space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[11px] font-extrabold">
                                      {q.category}
                                    </span>
                                    <span className="text-[11px] font-bold text-[#8C7C6D]">{q.createdAt}</span>
                                  </div>
                                  <h5 className="font-extrabold text-base text-[#2C241D] mt-1">{q.subject}</h5>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                                  q.status === 'Resolved' || q.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {q.status}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-[#5C4E42] bg-[#F3EDE5] p-3 rounded-xl border border-[#E2D7CB]">
                                {q.message}
                              </p>

                              {/* Admin Response Box */}
                              {q.adminResponse ? (
                                <div className="p-3.5 rounded-xl bg-[#48A63E]/10 border border-[#48A63E]/40 text-[#2C241D] space-y-1 animate-fadeIn">
                                  <div className="flex items-center gap-2 text-[#48A63E] font-extrabold text-xs">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Admin Response & Feedback ({q.updatedAt || 'Recent'}):</span>
                                  </div>
                                  <p className="text-xs font-extrabold text-[#2C241D] pl-6 leading-relaxed">
                                    "{q.adminResponse}"
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-[#8C7C6D] italic pl-1">
                                  ⏳ Waiting for Admin review and response...
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SUPPLIER MANAGEMENT */}
              {activeTab === 'suppliers' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Top Supplier KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Total Suppliers</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">{supplierList.length} Suppliers</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Registered Vendors</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Active Suppliers</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">{supplierList.filter(s => s.status === 'Active').length} Active</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Fulfilling Material Orders</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Product Allocations</span>
                      <div className="text-lg font-extrabold text-[#2C241D]">13 Items Assigned</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">6 ARUN RAJ • 7 Rahul Dev</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Supplier Directory</span>
                      <div className="text-lg font-extrabold text-[#2C241D]">Live Catalog System</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Directory Sync Active</span>
                    </div>
                  </div>

                  {/* Search Bar & Add Supplier Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4 pt-2">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search supplier name, contact, phone..."
                        value={supplierSearchQuery}
                        onChange={(e) => setSupplierSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddSupplierModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Supplier</span>
                    </button>
                  </div>

                  {/* Supplier Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Supplier Name</th>
                          <th className="py-3 px-4">Contact Person</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Location / Address</th>
                          <th className="py-3 px-4">Assigned Products</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {filteredSuppliers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[#7A6C5E]">
                              <Truck className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                              <p className="font-extrabold text-sm text-[#2C241D]">No Suppliers Available</p>
                              <p className="text-xs text-[#7A6C5E] mt-1">
                                {isLoadingSuppliers
                                  ? 'Loading supplier records...'
                                  : 'No supplier records matched your search query.'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredSuppliers.map((sup) => (
                            <tr key={sup.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[#48A63E]/15 text-[#48A63E] font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                                    {sup.supplier_name.charAt(0)}
                                  </div>
                                  <span>{sup.supplier_name}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-[#2C241D] font-bold">{sup.contact_person}</td>
                              <td className="py-4 px-4 font-mono font-bold text-[#48A63E]">{sup.phone}</td>
                              <td className="py-4 px-4 text-[#6B5C4D] max-w-xs truncate" title={sup.address}>
                                {sup.address}
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E]">
                                  {sup.assigned_products_count || 0} Products
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  sup.status === 'Active'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                    : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {sup.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* MODAL 1: Add New Product (High Contrast Vibrant Theme) */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Add New Furniture Product</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Retail Staff Product Catalog Manager</p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Bouclé Armchair"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Dining Room">Dining Room</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Home Office">Home Office</option>
                    <option value="Custom Studio">Custom Studio</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Material Finish</label>
                  <input
                    type="text"
                    placeholder="Teak Wood"
                    value={newProdMaterial}
                    onChange={(e) => setNewProdMaterial(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Initial Stock Count</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Dimensions (Length x Width x Height)</label>
                  <input
                    type="text"
                    placeholder="e.g. 220cm x 95cm x 78cm"
                    value={newProdDimensions}
                    onChange={(e) => setNewProdDimensions(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Warranty Protection</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Years Solid Wood Warranty"
                    value={newProdWarranty}
                    onChange={(e) => setNewProdWarranty(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Furniture Description & Features</label>
                <textarea
                  rows={2}
                  placeholder="Enter comprehensive description, timber quality, joinery details, upholstery comfort, and care instructions..."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-medium text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Low Stock Alert Details (High Contrast Vibrant Theme) */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#B45309] shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#2C241D]">Low Stock Inventory Alert Details</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">Products requiring immediate restock (stock &lt; 5 units).</p>
                </div>
              </div>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="p-2 rounded-xl bg-[#EAE0D4] hover:bg-[#DED2C2] text-[#2C241D] font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Cards Container */}
            <div className="space-y-3">
              {productList.filter((p) => p.stockCount < 5).length === 0 ? (
                <div className="py-10 text-center bg-[#F3EDE5] rounded-2xl border border-[#E2D7CB]">
                  <CheckCircle2 className="w-10 h-10 text-[#48A63E] mx-auto mb-2" />
                  <p className="font-extrabold text-base text-[#2C241D]">All Stock Levels Healthy!</p>
                  <p className="text-xs font-semibold text-[#6B5C4D] mt-1">No products are currently under low stock threshold.</p>
                </div>
              ) : (
                productList.filter((p) => p.stockCount < 5).map((prod) => (
                  <div key={prod.id} className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#48A63E] transition-all">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={prod.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                        alt={prod.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; }}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#E2D7CB] bg-white flex-shrink-0 shadow-xs"
                      />
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-[#2C241D] tracking-tight">{prod.name}</h4>
                        <p className="text-xs font-bold text-[#6B5C4D]">{prod.category} • <span className="text-[#3D3126]">{prod.material}</span></p>
                        <div className="text-sm font-extrabold text-[#48A63E]">₹{prod.price.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-[#78350F] bg-[#FEF3C7] border border-[#FCD34D] px-3 py-1 rounded-xl inline-block shadow-xs">
                          {prod.stockCount} {prod.stockCount === 1 ? 'unit' : 'units'} left
                        </span>
                        <span className="text-[11px] font-extrabold text-[#5C4A3A] block mt-0.5">Artisan Crafts & Timber Co.</span>
                      </div>

                      <button
                        onClick={() => {
                          setRestockProduct(prod);
                          setRestockAmount('10');
                        }}
                        className="px-4 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock...</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#E2D7CB] flex justify-end">
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#2C241D] text-white font-bold text-xs hover:bg-[#1A1410] shadow-md transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Restock Quantity Dialog */}
      {restockProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#2C241D]">Restock Inventory Quantity</h3>
                  <p className="text-[11px] font-bold text-[#6B5C4D]">Specify restock units to add to database</p>
                </div>
              </div>
              <button
                onClick={() => setRestockProduct(null)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-3">
              <img
                src={restockProduct.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                alt={restockProduct.name}
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; }}
                className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] bg-white flex-shrink-0"
              />
              <div>
                <h4 className="font-extrabold text-xs text-[#2C241D]">{restockProduct.name}</h4>
                <p className="text-[11px] font-semibold text-[#6B5C4D]">Current Stock: <span className="font-extrabold text-[#78350F]">{restockProduct.stockCount} units</span></p>
              </div>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Quantity of Units to Add</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-extrabold text-sm"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block font-extrabold text-[11px] text-[#6B5C4D] mb-1.5">Quick Presets:</span>
                <div className="flex items-center gap-2">
                  {['5', '10', '25', '50'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRestockAmount(preset)}
                      className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition-all ${restockAmount === preset
                          ? 'bg-[#48A63E] text-white shadow-xs'
                          : 'bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] hover:bg-[#DED2C2]'
                        }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Confirm & Save Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Staff Profile Details & Edit */}

      {isStaffProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#2C241D]">Staff Member Profile</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">RetailSphere System Credentials & Contact Information</p>
                </div>
              </div>
              <button
                onClick={() => setIsStaffProfileModalOpen(false)}
                className="p-2 rounded-xl bg-[#EAE0D4] hover:bg-[#DED2C2] text-[#2C241D] font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xl flex items-center justify-center shadow-md flex-shrink-0">
                {currentUser.initials}
              </div>
              <div>
                <h4 className="font-extrabold text-base text-[#2C241D]">{currentUser.name || 'Staff User'}</h4>
                <p className="text-xs font-bold text-[#6B5C4D]">{currentUser.email || 'retail.staff@retailsphere.com'}</p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[11px] font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Retail Staff</span>
                </div>
              </div>
            </div>

            {/* Profile Details Form */}
            <form onSubmit={handleSaveStaffProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-extrabold text-[#2C241D]">Email Address (Managed by Admin)</label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    🔒 Read Only
                  </span>
                </div>
                <input
                  type="email"
                  value={profileForm.email}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-[#EAE0D4] border border-[#E2D7CB] rounded-xl text-[#6B5C4D] font-bold cursor-not-allowed"
                />
                <p className="text-[11px] font-bold text-[#8C7C6D] mt-1 flex items-center gap-1 flex-wrap">
                  <span>To request an email change, submit a message to Admin in the</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStaffProfileModalOpen(false);
                      setActiveTab('queries');
                    }}
                    className="text-[#48A63E] underline font-extrabold hover:text-[#3D9134]"
                  >
                    Queries Section →
                  </button>
                </p>
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Phone Contact</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Work Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-[#EAE0D4] border border-[#E2D7CB] rounded-xl text-[#6B5C4D] font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password Update Provision */}
              <div className="pt-3 border-t border-[#E2D7CB] space-y-3">
                <div className="flex items-center gap-2 text-[#2C241D]">
                  <Lock className="w-4 h-4 text-[#48A63E]" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#2C241D]">Update Password Provision</h4>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold flex items-center gap-2 shadow-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs placeholder-[#8C7C6D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs placeholder-[#8C7C6D]"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs placeholder-[#8C7C6D]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2D7CB] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffProfileModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Save Profile Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Supplier */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Add New Supplier</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Register new raw material vendor</p>
              </div>
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ARUN RAJ or Rahul Dev"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    placeholder="e.g. Contact Name"
                    value={newSupContact}
                    onChange={(e) => setNewSupContact(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9778237180"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Warehouse / Office Address *</label>
                <textarea
                  rows={2}
                  placeholder="Address or Logistics Hub Location"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs placeholder-[#8C7C6D]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


