import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, X, Sliders, Zap, Scissors, Layers, Wrench, Ruler, MapPin } from 'lucide-react';
import { Header } from '../dashboard/Header';
import {
  CartItem,
  getCartItems,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getDirectCheckoutItem,
  setDirectCheckoutItem,
  clearDirectCheckoutItem
} from '../../utils/cartStorage';
import { getWishlistItems } from '../../utils/wishlistStorage';
import { openRazorpayCheckout } from '../../services/razorpay';
import { saveStoredRetailOrder } from '../../utils/retailOrdersStorage';
import { payCustomOrder } from '../../services/api_production';
import { validateCouponApi, redeemCouponApi, getCouponsApi, Coupon } from '../../services/api_coupons';
import { calculateOrderPricing } from '../../utils/pricingUtils';
import { getCurrentUser } from '../../services/api';

import { parseReferenceImages } from '../../utils/imageUtils';

const renderCategoryTag = (isFab?: boolean, isCus?: boolean, isSrv?: boolean) => {
  if (isFab) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-extrabold tracking-wide uppercase border border-amber-300 mb-1 shadow-2xs">
        <Scissors className="w-3 h-3 text-amber-700" />
        <span>Wood Fabrication Service</span>
      </span>
    );
  }
  if (isCus) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#2B7A24] text-[10px] font-extrabold tracking-wide uppercase border border-[#38A132]/30 mb-1 shadow-2xs">
        <Layers className="w-3 h-3 text-[#2E8B29]" />
        <span>Custom Workshop Build</span>
      </span>
    );
  }
  if (isSrv) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 text-[10px] font-extrabold tracking-wide uppercase border border-blue-300 mb-1 shadow-2xs">
        <Wrench className="w-3 h-3 text-blue-700" />
        <span>On-Site Skilled Service</span>
      </span>
    );
  }
  return null;
};

const renderSpecBadges = (materialStr?: string) => {
  if (!materialStr || !materialStr.trim()) return null;

  let cleanStr = materialStr
    .replace(/NOTES:.*$/i, '')
    .replace(/SPECIAL REQUIREMENTS:.*$/i, '')
    .trim();

  const parts = cleanStr
    .split(/[•;|\n]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const badges: { icon: string; label?: string; text: string }[] = [];

  parts.forEach((part) => {
    const uppercase = part.toUpperCase();
    if (
      uppercase.includes('ASPECTS') ||
      uppercase.includes('REQUIREMENTS') ||
      uppercase.includes('NONE') ||
      uppercase === 'CUSTOM' ||
      uppercase.includes('QTY') ||
      uppercase.includes('QUANTITY') ||
      uppercase.includes('PRECISION') ||
      uppercase.includes('SANDING') ||
      uppercase.includes('TRIMMING') ||
      uppercase.includes('REQUIRED') ||
      part.length > 35
    ) return;

    let label = '';
    let textVal = part;
    if (part.includes(':')) {
      const splitColon = part.split(':');
      label = splitColon[0].trim();
      textVal = splitColon.slice(1).join(':').trim();
    } else {
      textVal = part.trim();
    }

    if (textVal && textVal.length < 40 && !badges.some(b => b.text.toLowerCase() === textVal.toLowerCase())) {
      let icon = '✨';
      const upperVal = (label + ' ' + textVal).toUpperCase();
      if (upperVal.includes('STEEL') || upperVal.includes('METAL') || upperVal.includes('IRON') || upperVal.includes('BRASS') || upperVal.includes('ALUMINUM')) icon = '🔩';
      else if (upperVal.includes('TEAK') || upperVal.includes('WOOD') || upperVal.includes('TIMBER') || upperVal.includes('OAK') || upperVal.includes('WALNUT') || upperVal.includes('PLY') || upperVal.includes('MDF') || upperVal.includes('SHEET') || upperVal.includes('LUMBER')) icon = '🪵';
      else if (upperVal.includes('UPHOLSTERY') || upperVal.includes('FABRIC') || upperVal.includes('LEATHER') || upperVal.includes('COTTON') || upperVal.includes('VELVET') || upperVal.includes('LINEN')) icon = '🛋️';
      else if (upperVal.includes('COLOR') || upperVal.includes('FINISH') || upperVal.includes('GREEN') || upperVal.includes('BLACK') || upperVal.includes('WHITE') || upperVal.includes('BROWN') || upperVal.includes('POLISH') || upperVal.includes('GOLD')) icon = '🎨';
      else if (/\b(CM|INCH|INCHES|MM|FT|FEET|SPECS|DIMENSIONS|SIZE)\b/i.test(upperVal) || /\d+\s*[xX*]\s*\d+/.test(upperVal)) icon = '📐';
      else if (upperVal.includes('ROAD') || upperVal.includes('STREET') || upperVal.includes('NAGAR') || upperVal.includes('JUNCTION') || upperVal.includes('APTS') || upperVal.includes('HOUSE') || upperVal.includes('KOTTAYAM') || upperVal.includes('ERNAKULAM') || upperVal.includes('KOCHI')) icon = '📍';
      else if (upperVal.includes('202') || upperVal.includes('DATE') || upperVal.includes('APPOINTMENT') || upperVal.includes('MORNING') || upperVal.includes('AFTERNOON') || upperVal.includes('EVENING')) icon = '📅';

      badges.push({ icon, label: label ? label : undefined, text: textVal });
    }
  });

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {badges.map((b, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] bg-[#FAF6F0] text-[#3D3126] border border-[#E8DEC8] shadow-2xs"
        >
          <span className="text-[11px]">{b.icon}</span>
          {b.label && <span className="font-extrabold text-[#2C241D]">{b.label}:</span>}
          <span className="text-[#5C4D3E] font-medium">{b.text}</span>
        </span>
      ))}
    </div>
  );
};

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [directCheckoutItem, setDirectCheckoutItemState] = useState<CartItem | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('direct') === 'true' ? getDirectCheckoutItem() : null;
  });
  const [isDirectCheckoutMode, setIsDirectCheckoutMode] = useState<boolean>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('direct') === 'true' && Boolean(getDirectCheckoutItem());
  });

  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Auto-redirect to My Orders & Tracking upon successful payment
  useEffect(() => {
    if (isOrderPlaced) {
      const timer = setTimeout(() => {
        setIsOrderPlaced(false);
        navigate('/orders');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOrderPlaced, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isDirect = searchParams.get('direct') === 'true';
    if (!isDirect) {
      clearDirectCheckoutItem();
      setDirectCheckoutItemState(null);
      setIsDirectCheckoutMode(false);
    } else if (getDirectCheckoutItem()) {
      setDirectCheckoutItemState(getDirectCheckoutItem());
      setIsDirectCheckoutMode(true);
    }

    const handleCartUpdate = () => {
      setItems(getCartItems());
      const currentSearchParams = new URLSearchParams(window.location.search);
      if (currentSearchParams.get('direct') === 'true') {
        setDirectCheckoutItemState(getDirectCheckoutItem());
      }
    };
    setWishlistCount(getWishlistItems().length);

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  const fullCartItems = items;
  const activeItems = (isDirectCheckoutMode && directCheckoutItem) ? [directCheckoutItem] : fullCartItems;

  const handleUpdateQuantity = (id: string, delta: number) => {
    if (isDirectCheckoutMode && directCheckoutItem) {
      const newQty = directCheckoutItem.quantity + delta;
      if (newQty > 0) {
        const updated = { ...directCheckoutItem, quantity: newQty };
        setDirectCheckoutItem(updated);
        setDirectCheckoutItemState(updated);
      }
    } else {
      const updated = updateCartQuantity(id, delta);
      setItems(updated);
    }
  };

  const handleRemoveItem = (id: string) => {
    if (isDirectCheckoutMode && directCheckoutItem && (directCheckoutItem.id === id || directCheckoutItem.name === id)) {
      clearDirectCheckoutItem();
      setDirectCheckoutItemState(null);
      setIsDirectCheckoutMode(false);
    } else {
      const updated = removeFromCart(id);
      setItems(updated);
    }
  };

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent?: number; flatAmount?: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Auto-apply active First N Customers coupon for payment
    const checkFirstN = async () => {
      try {
        const res = await getCouponsApi();
        const activeFirstN = res.coupons.find((c: Coupon) => 
          c.status === 'Active' && 
          (c.type === 'first_n_customers' || (c.customerLimit && c.customerLimit > 0 && !c.targetUserEmail)) && 
          c.customerLimit && 
          c.customerLimit > 0 && 
          (c.currentRedemptions || 0) < c.customerLimit
        );

        if (activeFirstN) {
          setAppliedDiscount({
            code: activeFirstN.code,
            percent: activeFirstN.discountPercent || 0,
            flatAmount: activeFirstN.flatDiscountAmount || 0,
          });
          setPromoMessage({
            type: 'success',
            text: `🎉 Exclusive First ${activeFirstN.customerLimit} Customers Offer (${activeFirstN.discountPercent}% Off) automatically applied for your payment!`,
          });
        }
      } catch (e) {}
    };
    checkFirstN();
  }, []);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    const res = await validateCouponApi(code);
    if (res.valid && res.coupon) {
      setAppliedDiscount({
        code: res.coupon.code,
        percent: res.coupon.discountPercent || 0,
        flatAmount: res.coupon.flatDiscountAmount || 0,
      });
      setPromoMessage({ type: 'success', text: res.message || 'Discount Applied!' });
    } else {
      setPromoMessage({ type: 'error', text: res.message || 'Invalid promo code or not assigned to your user account.' });
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setPromoCodeInput('');
    setPromoMessage(null);
  };

  const subtotal = activeItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const rawShipping = (subtotal > 50000 || subtotal === 0) ? 0 : 2500;
  const pricing = calculateOrderPricing(subtotal, appliedDiscount, rawShipping);
  const discountAmount = pricing.discountAmount;
  const shippingFee = pricing.shippingFee;
  const grandTotal = pricing.grandTotal;
  const totalItemCount = activeItems.reduce((acc, item) => acc + item.quantity, 0);

  const processOrderCompletion = async (paymentId: string) => {
    setLastPaymentId(paymentId);
    setPaymentError(null);

    // Update custom orders status in PostgreSQL database
    for (const item of activeItems) {
      if (item.id.startsWith('custom-')) {
        const numericId = parseInt(item.id.replace('custom-', ''), 10);
        if (!isNaN(numericId)) {
          await payCustomOrder(numericId);
        }
      }
    }

    if (appliedDiscount) {
      try {
        await redeemCouponApi(appliedDiscount.code, paymentId);
      } catch (err) {
        console.warn('Coupon redemption recorded on backend:', err);
      }
    }

    const rawUser = localStorage.getItem('user');
    const userObj = rawUser ? JSON.parse(rawUser) : null;
    const currentUserEmail = userObj?.email || userObj?.user_id || userObj?.id || '';

    const userEmail = (userObj?.email || userObj?.customer_email || currentUserEmail || '').toLowerCase().trim();
    const userName = userObj?.full_name || userObj?.name || userObj?.username || 'Valued Customer';
    const userId = userObj?.id || userObj?.user_id || userObj?.customer_id;

    saveStoredRetailOrder({
      customerId: userId,
      customerName: userName,
      email: userEmail || 'customer@retailsphere.com',
      itemsCount: totalItemCount,
      totalAmount: pricing.grandTotal,
      originalSubtotal: pricing.originalSubtotal,
      couponCode: pricing.couponCode || undefined,
      discountType: pricing.discountType || undefined,
      discountDeducted: pricing.discountAmount,
      shippingFee: pricing.shippingFee,
      orderStatus: 'Order Placed',
      paymentStatus: 'Paid',
      paymentId: paymentId,
      items: activeItems.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl
      }))
    });

    if (isDirectCheckoutMode && directCheckoutItem) {
      removeFromCart(directCheckoutItem.id);
      removeFromCart(directCheckoutItem.name);
      clearDirectCheckoutItem();
      setDirectCheckoutItemState(null);
      setIsDirectCheckoutMode(false);
    } else {
      clearCart();
    }

    setIsProcessingPayment(false);

    // Check whether the authenticated customer already has a saved delivery address in PostgreSQL
    const latestUser = await getCurrentUser();
    const hasAddress = Boolean(
      latestUser?.customer?.address && latestUser.customer.address.trim()
    );

    if (!hasAddress) {
      // SCENARIO B: Redirect new customer without delivery address to Profile -> Delivery Address section
      navigate('/profile?address_required=true');
    } else {
      setIsOrderPlaced(true);
    }
  };

  const handleCheckout = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);
    const rawUser = localStorage.getItem('user');
    const userObj = rawUser ? JSON.parse(rawUser) : null;

    const success = await openRazorpayCheckout({
      amount: Math.round(pricing.grandTotal * 100), // amount in paise
      name: 'RetailSphere Furniture Store',
      description: pricing.descriptionText,
      prefill: {
        name: userObj?.full_name || 'Valued Customer',
        email: userObj?.email || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        await processOrderCompletion(paymentId || `pay_${Date.now().toString().slice(-8)}`);
      },
      onFailure: (reason) => {
        console.warn('Razorpay payment cancelled or failed:', reason);
        setIsProcessingPayment(false);
        setPaymentError(reason || 'Payment was cancelled. Order has not been placed.');
      }
    });

    if (!success) {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[#1C1814] flex flex-col selection:bg-[#387A46] selection:text-white bg-[#FAF8F5] overflow-x-hidden font-sans">
      {/* Ambient Luxury Living Room Background with Enhanced Visibility */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-45 pointer-events-none scale-105 transition-all duration-700"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      {/* Warm Linen & Silk Ivory Translucent Studio Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5]/60 via-[#F1EDE6]/50 to-[#E6E0D5]/55 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.5),_transparent_70%)] pointer-events-none" />

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <Header cartCount={totalItemCount} wishlistCount={wishlistCount} />

        {/* Main Central Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pt-3">
          {/* Breadcrumb & Navigation Pill */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <Link
              to="/dashboard#shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 border border-[#E2D7CB] text-xs font-black text-[#1C1814] hover:bg-white hover:border-[#38A132]/40 transition-all shadow-xs group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Store Catalog</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#5C4E42] bg-white/90 border border-[#E2D7CB] px-4 py-2 rounded-xl shadow-xs">
              <span>Store</span>
              <span className="text-[#A5998D]">/</span>
              <span className="text-[#38A132] font-black">Shopping Cart</span>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 lg:p-8 space-y-6 relative overflow-hidden shadow-sm border border-[#E2D7CB]">
            {/* Top Header Banner */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#38A132]/10 border border-[#38A132]/25 flex items-center justify-center shadow-xs">
                  <ShoppingBag className="w-5 h-5 text-[#38A132]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1C1814] tracking-tight flex items-center gap-3">
                    <span>{isDirectCheckoutMode && directCheckoutItem ? 'Direct Product Checkout' : 'Shopping Cart'}</span>
                    <span className="text-xs font-black text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/25 px-3 py-1 rounded-full shadow-2xs">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  </h1>
                  <p className="text-xs text-[#6B5C4D] font-bold mt-0.5">
                    Review your order items, select customizations, or apply exclusive discounts
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard#shop"
                className="inline-flex items-center gap-1 text-xs font-black text-[#38A132] hover:text-[#32922D] hover:underline self-start sm:self-auto py-1"
              >
                <span>+ Add more furniture</span>
              </Link>
            </div>

            {/* Direct Checkout Active Banner */}
            {isDirectCheckoutMode && directCheckoutItem && (
              <div className="relative z-10 bg-gradient-to-r from-[#2B6E25] via-[#38A132] to-[#2B6E25] text-white p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-emerald-400/40 animate-fadeIn my-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 text-amber-300 flex items-center justify-center font-black text-lg shadow-xs backdrop-blur-xs">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
                      <span>Direct Product Checkout Active</span>
                    </h4>
                    <p className="text-xs text-white/95 font-medium mt-0.5">
                      Purchasing <strong className="text-white font-black underline underline-offset-2 decoration-amber-300/60">{directCheckoutItem.name}</strong> only. Other items in your cart remain safely saved.
                    </p>
                  </div>
                </div>
                {fullCartItems.length > 0 && (
                  <button
                    onClick={() => {
                      clearDirectCheckoutItem();
                      setDirectCheckoutItemState(null);
                      setIsDirectCheckoutMode(false);
                    }}
                    className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-black border border-white/30 transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-95"
                  >
                    View Full Cart ({fullCartItems.reduce((acc, i) => acc + i.quantity, 0)} items) →
                  </button>
                )}
              </div>
            )}

            {/* Payment Failure / Cancellation Alert */}
            {paymentError && (
              <div className="relative z-10 bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn my-2">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{paymentError}</span>
                </div>
                <button
                  onClick={() => setPaymentError(null)}
                  className="text-rose-600 hover:text-rose-900 font-extrabold text-sm px-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success Notification after Checkout */}
            {isOrderPlaced ? (
              <div className="relative z-10 ultra-glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl animate-fadeIn my-8 max-w-lg mx-auto border border-white/80">
                <div className="w-16 h-16 bg-[#38A132]/15 text-[#38A132] rounded-full flex items-center justify-center mx-auto border border-[#38A132]/30 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-[#1A1410]">Razorpay Payment Complete!</h2>
                <p className="text-xs text-[#6B5C4D] leading-relaxed font-bold">
                  Thank you for your payment. Your order has been registered, paid via Razorpay, and logged in your tracking portal. Redirecting to My Orders & Tracking in 3 seconds...
                </p>
                {lastPaymentId && (
                  <div className="inline-block bg-[#FAF7F2] border border-[#E2D7CB] px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#38A132]">
                    Razorpay Payment ID: <span className="font-mono text-[#1A1410] font-black">{lastPaymentId}</span>
                  </div>
                )}
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setIsOrderPlaced(false);
                      navigate('/orders');
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white font-black text-xs transition-all shadow-lg shadow-[#38A132]/25 cursor-pointer active:scale-95"
                  >
                    View Orders & Tracking →
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderPlaced(false);
                      navigate('/dashboard');
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#FAF7F2] hover:bg-[#F3EDE5] text-[#1A1410] border border-[#E2D7CB] font-black text-xs transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : activeItems.length === 0 ? (
              /* Empty Cart State */
              <div className="relative z-10 ultra-glass-card rounded-[2rem] p-10 sm:p-16 text-center space-y-4 shadow-md my-4 border border-white/70">
                <div className="w-20 h-20 bg-gradient-to-br from-[#FAF7F2] to-[#EAE1D5] text-[#38A132] rounded-3xl flex items-center justify-center mx-auto border border-[#E2D7CB] shadow-sm">
                  <ShoppingBag className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-black text-[#1A1410] tracking-tight">Your cart is empty</h2>
                <p className="text-xs sm:text-sm text-[#6B5C4D] max-w-md mx-auto font-bold leading-relaxed">
                  You haven't added any items to your cart yet. Explore our luxury collection and click "Add to Cart" on any product.
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => navigate('/dashboard#shop')}
                    className="py-3 px-7 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white font-black text-xs transition-all shadow-lg shadow-[#38A132]/30 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Browse Furniture Collection</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Cart Grid */
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                {/* Cart Items List (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                  {activeItems.map((item) => {
                    const isFabrication = String(item.id).startsWith('fab_');
                    const isCustom = String(item.id).startsWith('custom_');
                    const isService = String(item.id).startsWith('srv_') || String(item.id).startsWith('ons_');

                    const parsedImgs = parseReferenceImages(item.imageUrl || '');
                    const thumbUrl = parsedImgs.length > 0
                      ? parsedImgs[0]
                      : "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs transition-all border border-[#E2D7CB] hover:border-[#38A132]/60 hover:shadow-md"
                      >
                        {/* Product Visual & Specification Breakdown */}
                        <div className="flex items-start sm:items-center gap-4 w-full sm:flex-1 min-w-0">
                          {isFabrication ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/80 border-2 border-amber-300 flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-xs">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800 mb-1">
                                <Scissors className="w-4 h-4 text-amber-700" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Wood Cut</span>
                              <span className="text-[9px] font-bold text-amber-700">Sizing Spec</span>
                            </div>
                          ) : isCustom ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100/80 border-2 border-emerald-300 flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-xs">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-800 mb-1">
                                <Layers className="w-4 h-4 text-[#38A132]" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Custom Build</span>
                              <span className="text-[9px] font-bold text-emerald-700">Workshop</span>
                            </div>
                          ) : isService ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100/80 border-2 border-blue-300 flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-xs">
                              <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-800 mb-1">
                                <Wrench className="w-4 h-4 text-blue-700" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">On-Site</span>
                              <span className="text-[9px] font-bold text-blue-700">Service</span>
                            </div>
                          ) : (
                            <img
                              src={thumbUrl}
                              alt={item.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain p-1 rounded-2xl bg-[#FAF8F5] flex-shrink-0 border border-[#E2D7CB] shadow-2xs"
                              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; }}
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            {renderCategoryTag(isFabrication, isCustom, isService)}

                            <h3 className="text-sm sm:text-base font-black text-[#1C1814] line-clamp-1">
                              {item.name}
                            </h3>

                            {renderSpecBadges(item.material)}
                          </div>
                        </div>

                        {/* Quantity Controls & Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EFE7DE]">
                          {/* Qty Counter */}
                          <div className="flex items-center gap-1.5 bg-[#FAF8F5] rounded-full p-1 border border-[#E2D7CB] shadow-inner">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-full bg-white hover:bg-[#F4ECE1] flex items-center justify-center text-[#1C1814] transition-colors shadow-xs active:scale-90 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-[#1C1814]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-full bg-white hover:bg-[#F4ECE1] flex items-center justify-center text-[#1C1814] transition-colors shadow-xs active:scale-90 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Total Price & Delete */}
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-black text-[#38A132] tracking-tight">
                              ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 mt-0.5 font-bold transition-colors ml-auto cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary Box (1 col) */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-3xl p-6 space-y-5 shadow-sm border border-[#E2D7CB] sticky top-24">
                    <h2 className="text-lg font-black text-[#1C1814] border-b border-[#EFE7DE] pb-3 flex items-center justify-between">
                      <span>Order Summary</span>
                      <span className="text-xs font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded-full">
                        Secure
                      </span>
                    </h2>

                    <div className="space-y-3 text-xs font-bold text-[#6B5C4D]">
                      <div className="flex justify-between">
                        <span>Subtotal ({totalItemCount} items)</span>
                        <span className="font-black text-[#1A1410]">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>

                      {appliedDiscount && (
                        <div className="bg-[#38A132]/10 p-3.5 rounded-2xl border border-[#38A132]/25 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-[#1A1410] flex items-center gap-1">
                                🏷️ Promo ({appliedDiscount.code})
                              </span>
                              <span className="text-[10px] font-black bg-[#38A132] text-white px-2 py-0.5 rounded-md shadow-2xs">
                                {appliedDiscount.flatAmount && appliedDiscount.flatAmount > 0 ? `₹${appliedDiscount.flatAmount} OFF` : `${appliedDiscount.percent}% OFF`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveDiscount}
                              className="text-[11px] font-extrabold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black text-[#38A132] border-t border-[#38A132]/20 pt-1.5">
                            <span>Discount Deducted</span>
                            <span className="text-sm font-black">-₹{discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span>Standard Shipping</span>
                        <span className="font-black text-[#38A132]">
                          {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-[#E2D7CB]/70 flex justify-between text-base font-black text-[#1A1410]">
                        <span>Total Amount</span>
                        <span className="text-xl font-black text-[#38A132]">₹{grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Promo Code Input */}
                    <div className="pt-2 border-t border-[#E2D7CB]/70 space-y-2">
                      <label className="block text-[11px] font-black text-[#1A1410] uppercase tracking-wider">
                        Promo Code / Coupon
                      </label>
                      <form onSubmit={handleApplyPromo} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs bg-white/80 border border-[#E2D7CB] rounded-full focus:outline-none focus:border-[#38A132] focus:ring-1 focus:ring-[#38A132] font-mono font-bold uppercase text-[#1A1410] placeholder-[#9E9082]"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#38A132] hover:bg-[#32922D] text-white font-black text-xs rounded-full shadow-md shadow-[#38A132]/25 transition-all cursor-pointer active:scale-95"
                        >
                          Apply
                        </button>
                      </form>

                      {promoMessage && (
                        <div className={`text-[11px] font-bold px-3 py-1.5 rounded-xl ${promoMessage.type === 'success' ? 'bg-[#38A132]/15 text-[#2E8B29] border border-[#38A132]/20' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                          {promoMessage.text}
                        </div>
                      )}
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessingPayment}
                      className="w-full py-4 px-4 rounded-full bg-[#38A132] hover:bg-[#32922D] disabled:opacity-70 text-white font-black text-sm transition-all shadow-xl shadow-[#38A132]/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isProcessingPayment ? 'Connecting Razorpay...' : 'Proceed to Checkout'}</span>
                    </button>

                    <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#6B5C4D] font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#38A132]" />
                      <span>Secure 256-bit SSL Razorpay Checkout</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
