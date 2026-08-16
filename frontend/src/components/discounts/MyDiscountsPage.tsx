import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Sparkles, 
  Gift, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ShoppingBag, 
  Crown, 
  Zap, 
  ArrowLeft, 
  ShieldCheck
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../dashboard/Header';
import { Sidebar } from '../dashboard/Sidebar';
import { 
  getCouponsApi, 
  getCustomerNotificationsApi, 
  Coupon, 
  CouponAllotment, 
  CustomerNotification 
} from '../../services/api_coupons';

export const MyDiscountsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'vip' | 'group' | 'history'>('vip');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
  const [allotments, setAllotments] = useState<CouponAllotment[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const loadData = async () => {
    try {
      const rawUser = localStorage.getItem('user');
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      setUserProfile(userObj);
      const email = (userObj?.email || userObj?.user_id || userObj?.id || userObj?.username || '').toLowerCase().trim();
      setCurrentUserEmail(email);

      const res = await getCouponsApi();
      setAllCoupons(res.coupons);
      setAllotments(res.allotments);

      const notifs = await getCustomerNotificationsApi();
      setNotifications(notifs);
    } catch (err) {
      console.warn('Error loading discounts data:', err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('coupons-updated', loadData);
    window.addEventListener('allotments-updated', loadData);
    window.addEventListener('customer-notifications-updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('coupons-updated', loadData);
      window.removeEventListener('allotments-updated', loadData);
      window.removeEventListener('customer-notifications-updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApplyAndGoToCart = (code: string) => {
    handleCopyCode(code);
    navigate('/cart');
  };

  // Filter VIP / Personal Coupons for this customer
  const vipCoupons = allCoupons.filter(c => {
    if (!c.targetUserEmail || !c.targetUserEmail.trim()) return false;
    const target = c.targetUserEmail.trim().toLowerCase();
    return currentUserEmail && (target === currentUserEmail || currentUserEmail.includes(target));
  });

  // Filter Notifications for VIP discount offers
  const vipNotifs = notifications.filter(n => {
    if (!n.targetUserEmail || !n.targetUserEmail.trim()) return false;
    const target = n.targetUserEmail.trim().toLowerCase();
    return currentUserEmail && (target === currentUserEmail || currentUserEmail.includes(target));
  });

  // Filter First N Group Coupons
  const groupCoupons = allCoupons.filter(c => {
    return c.status === 'Active' && (!c.targetUserEmail || !c.targetUserEmail.trim());
  });

  // Filter User's Claimed Allotments History
  const userClaimedAllotments = allotments.filter(a => {
    const target = (a.targetUserEmail || '').toLowerCase().trim();
    return currentUserEmail && (target === currentUserEmail || currentUserEmail.includes(target)) && a.used;
  });

  return (
    <div className="relative min-h-screen text-[#2C241D] font-sans antialiased flex flex-col selection:bg-[#48A63E]/20 overflow-x-hidden">
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
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header />

        {/* Sidebar Navigation Drawer */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 mt-16">
        
        {/* Back Link & Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EAE0D4] pb-6">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#7A6C5E] hover:text-[#2C241D] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Furniture Store</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2C241D] flex items-center gap-3">
              <Gift className="w-7 h-7 text-[#48A63E]" />
              <span>My Discounts & Exclusive Offers</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#6B5C4D] font-medium">
              View special VIP discounts gifted to your account and claim First N customer group deals at checkout.
            </p>
          </div>

          <Link
            to="/cart"
            className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#48A63E]/20 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Checkout Cart</span>
          </Link>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => setActiveTab('vip')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'vip' 
                ? 'bg-amber-500/10 border-amber-500/40 shadow-md ring-2 ring-amber-500/30' 
                : 'bg-white border-[#E2D7CB] hover:border-amber-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-600" /> Exclusive VIP Discounts
              </span>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {vipCoupons.length + vipNotifs.length} Total
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#2C241D]">
              {vipCoupons.length > 0 ? `${vipCoupons.length} VIP Gift Code(s)` : 'Special Rewards'}
            </div>
            <p className="text-[11px] text-[#7A6C5E] mt-1 font-medium">Personal discounts gifted directly by store management</p>
          </div>

          <div 
            onClick={() => setActiveTab('group')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'group' 
                ? 'bg-[#48A63E]/10 border-[#48A63E]/40 shadow-md ring-2 ring-[#48A63E]/30' 
                : 'bg-white border-[#E2D7CB] hover:border-[#48A63E]/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#48A63E] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#48A63E]" /> First N Group Deals
              </span>
              <span className="text-xs font-mono font-bold text-[#48A63E] bg-[#48A63E]/15 px-2 py-0.5 rounded-full">
                {groupCoupons.length} Live
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#2C241D]">
              {groupCoupons.length} Open Group Offer(s)
            </div>
            <p className="text-[11px] text-[#7A6C5E] mt-1 font-medium">Claimable by first N customers completing successful payment</p>
          </div>

          <div 
            onClick={() => setActiveTab('history')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-blue-500/10 border-blue-500/40 shadow-md ring-2 ring-blue-500/30' 
                : 'bg-white border-[#E2D7CB] hover:border-blue-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Redeemed History
              </span>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {userClaimedAllotments.length} Used
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#2C241D]">
              {userClaimedAllotments.length} Savings Claimed
            </div>
            <p className="text-[11px] text-[#7A6C5E] mt-1 font-medium">Coupons successfully redeemed on past paid orders</p>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex items-center gap-2 border-b border-[#EAE0D4] pb-2">
          <button
            onClick={() => setActiveTab('vip')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'vip'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white text-[#6B5C4D] hover:bg-[#EAE0D4] border border-[#E2D7CB]'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>VIP Personal Gifts ({vipCoupons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('group')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                : 'bg-white text-[#6B5C4D] hover:bg-[#EAE0D4] border border-[#E2D7CB]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>First N Group Promotions ({groupCoupons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-[#6B5C4D] hover:bg-[#EAE0D4] border border-[#E2D7CB]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Redemption History ({userClaimedAllotments.length})</span>
          </button>
        </div>

        {/* TAB 1: VIP PERSONAL DISCOUNTS */}
        {activeTab === 'vip' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 font-medium space-y-0.5">
                <h4 className="font-extrabold text-sm text-amber-950">Exclusive Personal & VIP Coupons</h4>
                <p>These discount promo codes have been specially issued and assigned exclusively to your customer account by store management. They cannot be used by other users.</p>
              </div>
            </div>

            {vipCoupons.length === 0 && vipNotifs.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#E2D7CB] rounded-3xl p-12 text-center space-y-3">
                <Crown className="w-12 h-12 text-amber-300 mx-auto" />
                <h3 className="text-base font-extrabold text-[#2C241D]">No Exclusive Personal VIP Coupons Currently</h3>
                <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
                  When store owners or staff issue an exclusive personal discount to your account, it will appear here and in your top notification bell!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('group')}
                    className="px-4 py-2 rounded-xl bg-[#48A63E] text-white text-xs font-extrabold shadow-md hover:bg-[#3D9134]"
                  >
                    View First N Group Promotions Available
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vipCoupons.map((c) => (
                  <div key={c.id} className="bg-white border-2 border-amber-300/80 rounded-3xl p-5 shadow-lg relative overflow-hidden space-y-4 hover:shadow-xl transition-all">
                    {/* VIP Ribbon */}
                    <div className="absolute top-0 right-0 bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl flex items-center gap-1 shadow-xs">
                      <Crown className="w-3 h-3" /> VIP Gift
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-extrabold text-lg">
                        {c.discountPercent}%
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Personal Discount
                        </span>
                        <h4 className="text-base font-extrabold text-[#2C241D] mt-0.5">{c.description || `${c.discountPercent}% Off Exclusive Discount`}</h4>
                      </div>
                    </div>

                    <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE0D4] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7A6C5E] tracking-wider block">Promo Code</span>
                        <span className="font-mono font-extrabold text-base text-[#48A63E] tracking-wider">{c.code}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#E2D7CB] hover:bg-[#F5ECE1] text-[#2C241D] font-extrabold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-[#48A63E]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode === c.code ? 'Copied!' : 'Copy Code'}</span>
                        </button>

                        <button
                          onClick={() => handleApplyAndGoToCart(c.code)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-1 shadow-md shadow-[#48A63E]/20 cursor-pointer active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Shop & Apply</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7A6C5E] pt-1">
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#48A63E]" /> Single-Use Restricted to Your Account</span>
                      <span className="font-mono">{c.createdDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FIRST N GROUP PROMOTIONS */}
        {activeTab === 'group' && (
          <div className="space-y-4">
            <div className="bg-[#48A63E]/10 border border-[#48A63E]/30 rounded-2xl p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#48A63E] shrink-0 mt-0.5" />
              <div className="text-xs text-[#2C241D] font-medium space-y-0.5">
                <h4 className="font-extrabold text-sm text-[#2C241D]">First N Paid Customers Group Promotions</h4>
                <p>These promo codes are valid for the first N customers who successfully complete payment at checkout. Slots are claimed on a first-come, first-paid basis!</p>
              </div>
            </div>

            {groupCoupons.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#E2D7CB] rounded-3xl p-12 text-center space-y-3">
                <Zap className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-extrabold text-[#2C241D]">No Group Promotions Active Right Now</h3>
                <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">Check back soon for upcoming storewide discount events!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupCoupons.map((c) => {
                  const limitN = c.customerLimit || 10;
                  const redeemed = c.currentRedemptions || 0;
                  const slotsRemaining = Math.max(0, limitN - redeemed);
                  const isExhausted = limitN > 0 && redeemed >= limitN;

                  return (
                    <div key={c.id} className="bg-white border border-[#E2D7CB] rounded-3xl p-5 shadow-sm relative overflow-hidden space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">
                            {c.code}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {c.audienceType === 'retail' ? '🛍️ Retail Buyers' : c.audienceType === 'production' ? '🏭 Custom Furniture' : '🌐 All Customers'}
                          </span>
                        </div>
                        <span className="text-lg font-extrabold text-[#48A63E]">
                          {c.flatDiscountAmount && c.flatDiscountAmount > 0 ? `₹${c.flatDiscountAmount.toLocaleString('en-IN')} OFF` : `${c.discountPercent}% OFF`}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-[#2C241D]">{c.description || `${c.discountPercent}% Off Group Deal`}</h4>
                        <p className="text-[11px] text-[#7A6C5E] mt-0.5">First {limitN} customers who complete paid checkout claim this discount.</p>
                      </div>

                      {/* Slots Remaining Bar */}
                      <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE0D4]">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span className="text-[#2C241D]">Slots Claimed (Paid)</span>
                          <span className={isExhausted ? 'text-rose-600 font-extrabold' : 'text-[#48A63E]'}>
                            {isExhausted ? 'All Slots Claimed' : `${slotsRemaining} of ${limitN} Slots Left!`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#EAE0D4] rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isExhausted ? 'bg-rose-500' : 'bg-[#48A63E]'}`} 
                            style={{ width: `${Math.min(100, Math.round((redeemed / limitN) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          disabled={isExhausted}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2D7CB] hover:bg-[#F5ECE1] text-[#2C241D] font-extrabold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-[#48A63E]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode === c.code ? 'Copied!' : 'Copy Promo Code'}</span>
                        </button>

                        <button
                          onClick={() => handleApplyAndGoToCart(c.code)}
                          disabled={isExhausted}
                          className="px-4 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-1 shadow-md shadow-[#48A63E]/20 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Apply at Checkout</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REDEMPTION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-950 font-medium space-y-0.5">
                <h4 className="font-extrabold text-sm text-blue-950">Your Redeemed Discount History</h4>
                <p>History of all promo codes and discounts you have successfully redeemed on past paid furniture orders.</p>
              </div>
            </div>

            {userClaimedAllotments.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#E2D7CB] rounded-3xl p-12 text-center space-y-3">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-extrabold text-[#2C241D]">No Redeemed Discounts Yet</h3>
                <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">When you use a promo code during checkout, your savings record will be tracked here.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E2D7CB] rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px] bg-[#FAF7F2]">
                      <th className="py-3.5 px-5">Promo Code</th>
                      <th className="py-3.5 px-5">Discount %</th>
                      <th className="py-3.5 px-5">Claimed Status</th>
                      <th className="py-3.5 px-5 text-right">Redeemed Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DE] font-medium">
                    {userClaimedAllotments.map((alt) => (
                      <tr key={alt.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                        <td className="py-4 px-5 font-mono font-extrabold text-[#48A63E]">
                          <span className="bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">{alt.couponCode}</span>
                        </td>
                        <td className="py-4 px-5 font-extrabold text-[#2C241D]">{alt.discountPercent}% OFF</td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-700" /> Redeemed & Paid
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-mono text-[#7A6C5E]">{alt.usedDate || alt.allottedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
      </div>
    </div>
  );
};
