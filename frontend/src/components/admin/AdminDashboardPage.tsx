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
  Trash2
} from 'lucide-react';

import { createStaffUser, fetchStaffUsers, fetchInventoryFromDB, createProductInDB, updateStockInDB, fetchQueriesFromDB, respondToStaffQueryInDB } from '../../services/api';
import { respondToStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';



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
}

import { getStoredCoupons, addStoredCoupon, removeStoredCoupon, updateCouponUserEmail, sendCouponToCustomer, getCouponAllotments, Coupon, CouponAllotment } from '../../utils/couponStorage';

export const INITIAL_STAFF: StaffMember[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'inventory' | 'queries' | 'coupons'>('staff');

  // Staff Queries State
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

    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };



  const pendingQueriesCount = staffQueries.filter(q => q.status === 'Pending' || q.status === 'In Review').length;

  // Staff State

  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Retail Staff' | 'Production Staff'>('All');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Retail Staff' | 'Production Staff'>('Retail Staff');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Inventory State
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [newProdMaterial, setNewProdMaterial] = useState('Teak Wood');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdImage, setNewProdImage] = useState('');

  // Coupon Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>(() => getStoredCoupons());
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
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

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount) return;

    const discountVal = parseInt(newCouponDiscount, 10) || 10;
    const targetEmail = newCouponUserEmail.trim();

    const updated = addStoredCoupon({
      code: newCouponCode,
      discountPercent: discountVal,
      description: `${discountVal}% Off Discount`,
      targetUserEmail: targetEmail || undefined,
    });
    setCouponsList(updated);

    const bannerText = targetEmail
      ? `Coupon "${newCouponCode.toUpperCase()}" (${discountVal}% Off) created and assigned to ${targetEmail}! Notification sent to user dashboard & email.`
      : `Coupon "${newCouponCode.toUpperCase()}" (${discountVal}% Off) created! You can add/edit assigned user email in the table anytime.`;

    setSuccessBanner(bannerText);
    setNewCouponCode('');
    setNewCouponDiscount('');
    setNewCouponDesc('');
    setNewCouponUserEmail('');
    setIsAddCouponModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleRemoveCoupon = (idOrCode: string, code: string) => {
    const updated = removeStoredCoupon(idOrCode);
    setCouponsList(updated);
    setSuccessBanner(`Coupon "${code}" removed successfully!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const [sentMap, setSentMap] = useState<{ [couponId: string]: boolean }>({});

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
      // Clear/Reset input after send
      updateCouponUserEmail(couponId, '');
      const inputEl = document.getElementById(`coupon-email-${couponId}`) as HTMLInputElement;
      if (inputEl) {
        inputEl.value = '';
      }

      setCouponsList(getStoredCoupons());
      setAllotmentsList(getCouponAllotments());

      // Show temporary Sent ✓ state on button
      setSentMap(prev => ({ ...prev, [couponId]: true }));
      setTimeout(() => {
        setSentMap(prev => ({ ...prev, [couponId]: false }));
      }, 2500);

      setSuccessBanner(`🎉 ${result.message}`);
      setTimeout(() => setSuccessBanner(null), 7000);
    } else {
      alert(result.message);
    }
  };


  // Fetch staff & inventory exclusively from PostgreSQL Database on mount
  useEffect(() => {
    const loadDataFromDB = async () => {
      try {
        const staffData = await fetchStaffUsers();
        setStaffList(staffData || []);

        const invData = await fetchInventoryFromDB();
        setInventoryList(invData || []);
      } catch (e) {
        console.warn('Could not fetch DB data:', e);
      }
    };
    loadDataFromDB();
  }, []);

  // Staff Handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);

    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setStaffFormError('Staff name and email address are required.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      // 1. Call Backend API to insert in PostgreSQL and dispatch email
      const res = await createStaffUser({
        full_name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        phone: newStaffPhone.trim() || undefined,
        role_name: newStaffRole,
        password: newStaffPassword.trim() || undefined,
      });

      const addedMember: StaffMember = {
        id: `st-${res.user_id || Date.now()}`,
        user_id: res.user_id,
        name: res.full_name || newStaffName.trim(),
        email: res.email || newStaffEmail.trim(),
        phone: newStaffPhone.trim() || '+91 9999999999',
        role: newStaffRole,
        status: 'Active',
        dateAdded: new Date().toISOString().split('T')[0],
      };

      setStaffList((prev) => [addedMember, ...prev]);
      setSuccessBanner(`Successfully created ${newStaffRole} account for ${addedMember.name}! Credentials (Username: ${addedMember.email}, Password: ${res.generated_password}) have been sent via email to ${addedMember.email}.`);
      
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
      setIsAddStaffModalOpen(false);

      setTimeout(() => {
        setSuccessBanner(null);
      }, 10000);
    } catch (err: any) {
      console.error('Failed to create staff:', err);
      setStaffFormError(typeof err?.message === 'string' ? err.message : 'Failed to create staff member.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleToggleStaffStatus = (id: string) => {
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s
      )
    );
  };

  // Inventory Handlers
  const handleStockCountChange = async (id: string, delta: number) => {
    const targetItem = inventoryList.find((i) => i.id === id);
    if (!targetItem) return;

    const newQty = Math.max(0, targetItem.stockCount + delta);
    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (newQty === 0) newStatus = 'Out of Stock';
    else if (newQty < 5) newStatus = 'Low Stock';

    setInventoryList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stockCount: newQty, status: newStatus } : item))
    );

    if (targetItem.product_id) {
      try {
        await updateStockInDB(targetItem.product_id, newQty);
      } catch (err) {
        console.warn('Could not persist stock update to DB:', err);
      }
    }
  };

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

      setInventoryList((prev) => [created, ...prev]);
    } catch (err) {
      console.warn('Could not save product to DB, adding locally:', err);
      let statusVal: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (qty === 0) statusVal = 'Out of Stock';
      else if (qty < 5) statusVal = 'Low Stock';

      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        name: newProdName.trim(),
        category: newProdCategory,
        material: newProdMaterial,
        price: priceVal,
        stockCount: qty,
        status: statusVal,
        image_url: imgUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
      };
      setInventoryList((prev) => [newItem, ...prev]);
    }

    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdImage('');
    setIsAddProductModalOpen(false);
  };



  // Filtered Lists
  const filteredStaff = staffList.filter((staff) => {
    if (staffRoleFilter !== 'All' && staff.role !== staffRoleFilter) return false;
    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.toLowerCase();
      return (
        staff.name.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        staff.phone.includes(q)
      );
    }
    return true;
  });

  const filteredInventory = inventoryList.filter((item) => {
    if (inventorySearchQuery.trim()) {
      const q = inventorySearchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalRetailStaff = staffList.filter((s) => s.role === 'Retail Staff' && s.status === 'Active').length;
  const totalProdStaff = staffList.filter((s) => s.role === 'Production Staff' && s.status === 'Active').length;
  const totalStockItems = inventoryList.reduce((acc, i) => acc + i.stockCount, 0);

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
      <div className="relative z-10 flex w-full min-h-screen">
        {/* LEFT SIDEBAR (Styled matching Customer Dashboard) */}
        <aside className="w-64 ultra-glass-panel border-r border-[#E2D7CB] hidden md:flex flex-col justify-between p-6 shadow-xl sticky top-0 h-screen z-20">
          <div className="space-y-8">
            {/* Brand Logo */}
            <div className="flex items-center justify-between">
              <div>
                <Link to="/dashboard" className="font-extrabold text-[#2C241D] text-lg tracking-tight block hover:opacity-90 transition-opacity">
                  RetailSphere <span className="text-[#48A63E]">AI</span>
                </Link>
                <span className="text-[10px] font-extrabold text-[#48A63E] uppercase tracking-widest block font-mono -mt-0.5">
                  Admin Portal
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20 font-extrabold'
                    : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>

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
                  <span>Staff Management</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'staff' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {staffList.length}
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
                  <Package className="w-4 h-4" />
                  <span>Stock & Inventory</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                }`}>
                  {inventoryList.length}
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
                  <span>Staff Queries & Requests</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'queries' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {pendingQueriesCount > 0 ? `${pendingQueriesCount} Pending` : staffQueries.length}
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

          {/* Bottom User / Store Navigation */}
          <div className="pt-6 border-t border-[#EFE7DE] space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-3 rounded-xl bg-white/90 border border-[#E2D7CB] hover:bg-[#F5ECE1] text-[#2C241D] text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Customer Store View</span>
              <span className="text-[10px] text-[#48A63E] font-extrabold">→</span>
            </button>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-[#E2D7CB] shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                  AD
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2C241D] truncate">Administrator</p>
                  <p className="text-[10px] text-[#7A6C5E] truncate">admin@retailsphere.com</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/login')}
                title="Logout"
                className="p-1.5 text-[#9E9082] hover:text-rose-600 rounded-lg hover:bg-[#F5ECE1] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>


      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Mobile Top Nav Bar */}
        <div className="md:hidden bg-white border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900">RetailSphere Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'staff' ? 'bg-[#2C4A3E] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'inventory' ? 'bg-[#2C4A3E] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Stock
            </button>
          </div>
        </div>

        <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative overflow-hidden">
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* Success Banner Notice */}
            {successBanner && (
              <div className="p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn relative z-10">
                <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-bold leading-relaxed">
                  {successBanner}
                </div>
                <button
                  onClick={() => setSuccessBanner(null)}
                  className="text-[#48A63E] hover:text-[#3D9134] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Top Page Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {activeTab === 'overview' && 'Store Operations Overview'}
                  {activeTab === 'staff' && 'Staff Management Roster'}
                  {activeTab === 'inventory' && 'Inventory & Stock Count'}
                  {activeTab === 'queries' && 'Staff Email Change Requests & Queries'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'staff' && 'Manage Retail Staff & Production Staff credentials, roles, and SMTP email notifications.'}
                  {activeTab === 'inventory' && 'Monitor product availability, adjust stock quantities, and add new furniture designs.'}
                  {activeTab === 'overview' && 'Track live retail orders, custom studio production tasks, and system performance.'}
                  {activeTab === 'queries' && 'Review messages submitted by retail and production staff, update statuses, and send replies.'}
                </p>
              </div>

              {activeTab === 'staff' && (
                <button
                  onClick={() => setIsAddStaffModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Staff Member</span>
                </button>
              )}

              {activeTab === 'inventory' && (
                <button
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Product</span>
                </button>
              )}
            </div>

            {/* KPI Stat Cards (Only shown for staff/inventory/overview tabs) */}
            {activeTab !== 'queries' && (
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                  <div className="flex items-center justify-between text-[#7A6C5E]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Retail Staff</span>
                    <Briefcase className="w-4 h-4 text-[#48A63E]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{totalRetailStaff} Active</div>
                  <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                    Sales & Store Orders
                  </div>
                </div>

                <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                  <div className="flex items-center justify-between text-[#7A6C5E]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Production Staff</span>
                    <Wrench className="w-4 h-4 text-[#48A63E]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{totalProdStaff} Active</div>
                  <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                    Furniture Studio & Crafting
                  </div>
                </div>

                <div className="ultra-glass-card rounded-2xl p-5 space-y-2 shadow-sm border border-[#E2D7CB]">
                  <div className="flex items-center justify-between text-[#7A6C5E]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C5E]">Total Stock</span>
                    <Package className="w-4 h-4 text-[#48A63E]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{totalStockItems} Units</div>
                  <div className="text-[11px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">
                    Available in Warehouse
                  </div>
                </div>
              </div>
            )}




          {/* TAB: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
              {/* Filter Controls & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" /> Filter Role:
                  </span>
                  {(['All', 'Retail Staff', 'Production Staff'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setStaffRoleFilter(r)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        staffRoleFilter === r
                          ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                          : 'bg-[#F9F6F0] border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff by name or email..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  />
                </div>
              </div>


              {/* Staff Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EBE6DF] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Username / Email</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Date Registered</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA] font-medium">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                          No staff members found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((staff) => (
                        <tr key={staff.id} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs ${
                              staff.role === 'Retail Staff' ? 'bg-blue-600' : 'bg-amber-600'
                            }`}>
                              {staff.name[0]}
                            </div>
                            <span>{staff.name}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-700 font-semibold">{staff.email}</td>
                          <td className="py-4 px-4 text-slate-600">{staff.phone}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full border ${
                              staff.role === 'Retail Staff'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {staff.role === 'Retail Staff' ? <Briefcase className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                              {staff.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                              staff.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {staff.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500">{staff.dateAdded}</td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleToggleStaffStatus(staff.id)}
                              className="text-xs text-slate-600 hover:text-slate-900 font-bold hover:underline"
                            >
                              {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
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

          {/* TAB: INVENTORY & STOCK */}
          {activeTab === 'inventory' && (
            <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                <h2 className="text-base font-extrabold text-[#2C241D]">Furniture Stock Inventory</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search furniture items..."
                    value={inventorySearchQuery}
                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Furniture Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Material Finish</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Stock Quantity</th>
                      <th className="py-3 px-4">Availability</th>
                      <th className="py-3 px-4 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DE] font-medium">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover border border-[#E2D7CB] shadow-xs flex-shrink-0 bg-white"
                            />
                            <span>{item.name}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                        <td className="py-4 px-4 text-[#6B5C4D]">{item.material}</td>
                        <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{item.price.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-4">
                          <span className="font-extrabold text-sm text-[#2C241D]">{item.stockCount}</span> units
                        </td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
              <h2 className="text-base font-extrabold text-[#2C241D] border-b border-[#EFE7DE] pb-3">
                Live Store Workflows
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-3">
                  <div className="flex items-center gap-2 text-[#48A63E] font-bold text-xs uppercase tracking-wider">
                    <Briefcase className="w-4 h-4" /> Retail Staff Portal
                  </div>
                  <p className="text-xs text-[#6B5C4D] leading-relaxed">
                    Retail staff manage incoming store orders, customer inquiries, and sales dispatches.
                  </p>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="text-xs font-extrabold text-[#48A63E] hover:underline"
                  >
                    Manage Retail Staff ({totalRetailStaff}) →
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-3">
                  <div className="flex items-center gap-2 text-[#48A63E] font-bold text-xs uppercase tracking-wider">
                    <Wrench className="w-4 h-4" /> Production Studio Staff
                  </div>
                  <p className="text-xs text-[#6B5C4D] leading-relaxed">
                    Production staff manage teak woodworking, bouclé upholstering, and bespoke custom furniture builds.
                  </p>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="text-xs font-extrabold text-[#48A63E] hover:underline"
                  >
                    Manage Production Staff ({totalProdStaff}) →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STAFF QUERIES & EMAIL REQUESTS */}
          {activeTab === 'queries' && (
            <div className="space-y-6">
              {/* Header & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2D7CB] pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#2C241D]">Staff Email Change Requests & Queries</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">Review messages submitted by retail and production staff, update statuses, and send replies.</p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  {(['All', 'Pending', 'Resolved'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setQueryFilter(filter)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                        queryFilter === filter
                          ? 'bg-[#48A63E] text-white shadow-xs'
                          : 'bg-[#F3EDE5] border border-[#E2D7CB] text-[#2C241D] hover:bg-[#EAE0D4]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Queries Table */}
              <div className="ultra-glass-card rounded-2xl border border-[#E2D7CB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF7F2] text-[#2C241D] font-extrabold border-b border-[#E2D7CB] text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Staff Member</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Subject & Message</th>
                        <th className="py-3.5 px-4">Submitted Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D7CB]/60">
                      {staffQueries
                        .filter(q => {
                          if (queryFilter === 'Pending') return q.status === 'Pending' || q.status === 'In Review';
                          if (queryFilter === 'Resolved') return q.status === 'Resolved' || q.status === 'Approved';
                          return true;
                        })
                        .map((q) => (
                          <tr key={q.id} className="hover:bg-[#F5ECE1]/40 transition-colors">
                            <td className="py-4 px-4 font-bold text-[#2C241D]">
                              <p className="font-extrabold text-sm">{q.staffName}</p>
                              <p className="text-[11px] text-[#6B5C4D] font-mono">{q.staffEmail}</p>
                            </td>

                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[11px] font-extrabold inline-block">
                                {q.category}
                              </span>
                            </td>

                            <td className="py-4 px-4 space-y-1 max-w-xs sm:max-w-md">
                              <p className="font-extrabold text-xs text-[#2C241D]">{q.subject}</p>
                              <p className="text-[11px] text-[#5C4E42] line-clamp-2 leading-relaxed bg-[#F3EDE5] p-2 rounded-lg border border-[#E2D7CB]">
                                {q.message}
                              </p>
                              {q.adminResponse && (
                                <p className="text-[11px] font-bold text-[#48A63E]">
                                  ✓ Reply: "{q.adminResponse}"
                                </p>
                              )}
                            </td>

                            <td className="py-4 px-4 font-bold text-[#7A6C5E] text-[11px]">
                              {q.createdAt}
                            </td>

                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block ${
                                q.status === 'Resolved' || q.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {q.status}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleOpenQueryModal(q)}
                                className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Respond</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS & DISCOUNTS MANAGEMENT (ADMIN) */}
          {activeTab === 'coupons' && (
            <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
              {/* Top Coupon KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                  <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Active Discounts</span>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{couponsList.filter(c => c.status === 'Active').length} Coupons</div>
                  <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Live Checkout Coupons</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                  <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Total Coupons Issued</span>
                  <div className="text-2xl font-extrabold text-[#2C241D]">{couponsList.length} Total</div>
                  <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Active In Catalog</span>
                </div>
              </div>

              {/* Search Bar & Create Coupon Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4 pt-2">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search promo code or description..."
                    value={couponSearchQuery}
                    onChange={(e) => setCouponSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  />
                </div>

                <button
                  onClick={() => setIsAddCouponModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Dispatch Coupon</span>
                </button>
              </div>

              {/* Coupon Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Promo Code</th>
                      <th className="py-3 px-4">Discount %</th>
                      <th className="py-3 px-4">Assigned User / Email (Editable)</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DE] font-medium">
                    {couponsList
                      .filter(c => !couponSearchQuery.trim() || c.code.toLowerCase().includes(couponSearchQuery.toLowerCase()) || (c.targetUserEmail && c.targetUserEmail.toLowerCase().includes(couponSearchQuery.toLowerCase())))
                      .map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-[#48A63E]" />
                              <span className="bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">{coupon.code}</span>
                            </div>
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
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateCouponUserEmail(coupon.id, (e.target as HTMLInputElement).value);
                                  }
                                }}
                                className="w-56 px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs font-bold shadow-xs transition-colors"
                                title="Type customer email or User ID"
                              />
                              <button
                                onClick={() => handleSendCouponNotification(coupon.id, (document.getElementById(`coupon-email-${coupon.id}`) as HTMLInputElement)?.value || coupon.targetUserEmail || '')}
                                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95 ${
                                  sentMap[coupon.id]
                                    ? 'bg-[#38A132] text-white'
                                    : 'bg-[#48A63E] text-white hover:bg-[#388531]'
                                }`}
                                title="Send coupon to customer dashboard notification & dispatch email"
                              >
                                {sentMap[coupon.id] ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Sent ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send Email</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[#7A6C5E]">{coupon.createdDate}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                              coupon.status === 'Active'
                                ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {coupon.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleRemoveCoupon(coupon.id, coupon.code)}
                              className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-xs cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Coupon</span>
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



      {/* MODAL 1: ADD STAFF MEMBER & SEND EMAIL */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Add Staff Member</h3>
                <p className="text-[11px] text-[#7A6C5E]">Account will be created & credentials emailed to staff.</p>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1.5 text-[#9E9082] hover:text-[#2C241D] rounded-full"
              >
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
                <p className="text-[10px] text-[#7A6C5E] mt-1">Leave empty to auto-generate a strong 12-character password. Credentials will be emailed to staff.</p>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold hover:bg-[#F2ECE1] transition-colors"
                  disabled={isSubmittingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold transition-all shadow-md shadow-[#48A63E]/20 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingStaff ? (
                    <span>Creating Staff...</span>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Create & Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD INVENTORY PRODUCT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Add Inventory Product</h3>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 text-[#9E9082] hover:text-[#2C241D] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Velvet Ottoman"
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
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
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
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Stock Count</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs"
                />
              </div>


              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold hover:bg-[#F2ECE1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Add Product
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: ADMIN RESPOND TO STAFF QUERY */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border-2 border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#2C241D]">Respond to Staff Request</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">From {selectedQuery.staffName} ({selectedQuery.staffEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-xl bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Query Summary Box */}
            <div className="p-4 rounded-xl bg-[#F3EDE5] border border-[#E2D7CB] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#48A63E] bg-[#48A63E]/15 px-2.5 py-0.5 rounded-md">
                  {selectedQuery.category}
                </span>
                <span className="text-[#8C7C6D] font-bold">{selectedQuery.createdAt}</span>
              </div>
              <h4 className="font-extrabold text-sm text-[#2C241D]">{selectedQuery.subject}</h4>
              <p className="text-[#5C4E42] font-semibold leading-relaxed">
                "{selectedQuery.message}"
              </p>
            </div>

            {/* Response Form */}
            <form onSubmit={handleSendAdminResponse} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Admin Response Message</label>
                <textarea
                  rows={4}
                  placeholder="Type your official Admin reply to the staff member..."
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] placeholder-[#8C7C6D] focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Update Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Approved', 'Resolved', 'In Review'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAdminResponseStatus(st)}
                      className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all border ${
                        adminResponseStatus === st
                          ? 'bg-[#48A63E] text-white border-[#48A63E] shadow-xs'
                          : 'bg-[#EAE0D4] border-[#E2D7CB] text-[#2C241D] hover:bg-[#DED2C2]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuery(null)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Submit Response to Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New Coupon (ADMIN) */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Create Dearest Customer Coupon</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Add a custom discount promo code for VIP customers</p>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Coupon Promo Code *</label>
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] font-mono font-bold uppercase text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Discount Percentage (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  placeholder="e.g. 15 or 25"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Target User Email or User ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. customer@retailsphere.com or USER-102"
                  value={newCouponUserEmail}
                  onChange={(e) => setNewCouponUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs font-bold"
                />
                <p className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Leave empty or type email ID. You can also add/edit the customer email directly in the table textbox anytime.</p>
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
                  Create & Activate Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

