import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, X } from 'lucide-react';
import { Header } from '../dashboard/Header';
import {
  CartItem,
  getCartItems,
  updateCartQuantity,
  removeFromCart,
  clearCart
} from '../../utils/cartStorage';
import { getWishlistItems } from '../../utils/wishlistStorage';
import { openRazorpayCheckout } from '../../services/razorpay';
import { saveStoredRetailOrder } from '../../utils/retailOrdersStorage';
import { payCustomOrder } from '../../services/api_production';
import { validateStoredCoupon, markCouponAsUsed } from '../../utils/couponStorage';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const handleCartUpdate = () => {
      setItems(getCartItems());
    };
    setWishlistCount(getWishlistItems().length);

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = updateCartQuantity(id, delta);
    setItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    const updated = removeFromCart(id);
    setItems(updated);
  };

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    const rawUser = localStorage.getItem('user');
    const userObj = rawUser ? JSON.parse(rawUser) : null;
    const currentUserEmail = userObj?.email || userObj?.user_id || userObj?.id || '';

    const res = validateStoredCoupon(code, currentUserEmail);
    if (res.valid && res.coupon) {
      setAppliedDiscount({ code: res.coupon.code, percent: res.coupon.discountPercent });
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

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount ? Math.round((subtotal * appliedDiscount.percent) / 100) : 0;
  const shippingFee = (subtotal - discountAmount) > 50000 || subtotal === 0 ? 0 : 2500;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const processOrderCompletion = async (paymentId: string) => {
    const rawUser = localStorage.getItem('user');
    const userObj = rawUser ? JSON.parse(rawUser) : null;
    const currentUserEmail = userObj?.email || userObj?.user_id || userObj?.id || '';

    setLastPaymentId(paymentId);
    setPaymentError(null);

    // Update custom orders status in PostgreSQL database
    for (const item of items) {
      if (item.id.startsWith('custom-')) {
        const numericId = parseInt(item.id.replace('custom-', ''), 10);
        if (!isNaN(numericId)) {
          await payCustomOrder(numericId);
        }
      }
    }

    if (appliedDiscount && currentUserEmail) {
      markCouponAsUsed(appliedDiscount.code, currentUserEmail);
    }

    const userEmail = (userObj?.email || userObj?.customer_email || currentUserEmail || '').toLowerCase().trim();
    const userName = userObj?.full_name || userObj?.name || userObj?.username || 'Valued Customer';
    const userId = userObj?.id || userObj?.user_id || userObj?.customer_id;

    await saveStoredRetailOrder({
      customerId: userId,
      customerName: userName,
      email: userEmail || 'customer@retailsphere.com',
      itemsCount: totalItemCount,
      totalAmount: grandTotal,
      orderStatus: 'Order Placed',
      paymentStatus: 'Paid',
      paymentId: paymentId,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl
      }))
    });
    clearCart();
    setIsProcessingPayment(false);
    setIsOrderPlaced(true);
  };

  const handleCheckout = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);
    const rawUser = localStorage.getItem('user');
    const userObj = rawUser ? JSON.parse(rawUser) : null;

    const success = await openRazorpayCheckout({
      amount: Math.round(grandTotal * 100), // amount in paise
      name: 'RetailSphere Furniture Store',
      description: `Payment for ${totalItemCount} furniture items`,
      prefill: {
        name: userObj?.full_name || 'Valued Customer',
        email: userObj?.email || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        await processOrderCompletion(paymentId);
      },
      onFailure: (reason) => {
        console.warn('Razorpay payment failed or cancelled:', reason);
        setIsProcessingPayment(false);
        setPaymentError(`Razorpay payment was not completed: ${reason}`);
      }
    });

    if (!success) {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[#2C241D] flex flex-col selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Ambient Warm Luxury Living Room Background Image Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />

      {/* Lighter Translucent Warm Cream Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <Header cartCount={totalItemCount} wishlistCount={wishlistCount} />

        {/* Main Central Semi-Transparent Glass Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pt-3">


          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-5 lg:p-6 pt-3 sm:pt-4 space-y-4 relative overflow-hidden">
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* Top Back Navigation & Title */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">

              <div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A6C5E] hover:text-[#2C241D] transition-colors mb-1"
                >
                  <ArrowLeft className="w-4 h-4 text-[#48A63E]" />
                  <span>Back to Store Catalog</span>
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-3">
                  <span>Shopping Cart</span>
                  <span className="text-xs font-extrabold text-[#2C241D] bg-white/90 border border-[#E6DDD3] px-3 py-1 rounded-full shadow-xs">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                  </span>
                </h1>
              </div>

              <Link
                to="/dashboard"
                className="text-xs font-bold text-[#48A63E] hover:underline self-start sm:self-auto"
              >
                + Add more furniture
              </Link>
            </div>

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
              <div className="relative z-10 ultra-glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl animate-fadeIn my-8 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-[#48A63E]/15 text-[#48A63E] rounded-full flex items-center justify-center mx-auto border border-[#48A63E]/30 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#2C241D]">Razorpay Payment Complete!</h2>
                <p className="text-xs text-[#6B5C4D] leading-relaxed font-medium">
                  Thank you for your payment. Your order has been registered, paid via Razorpay, and logged in your order tracking dashboard.
                </p>
                {lastPaymentId && (
                  <div className="inline-block bg-[#FAF7F2] border border-[#E2D7CB] px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#48A63E]">
                    Razorpay Payment ID: <span className="font-mono text-[#2C241D]">{lastPaymentId}</span>
                  </div>
                )}
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setIsOrderPlaced(false);
                      navigate('/orders');
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-xs transition-colors shadow-md shadow-[#48A63E]/20"
                  >
                    View Orders & Tracking
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderPlaced(false);
                      navigate('/dashboard');
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#FAF7F2] hover:bg-[#F3EDE5] text-[#2C241D] border border-[#E2D7CB] font-bold text-xs transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              /* Empty Cart State */
              <div className="relative z-10 ultra-glass-card rounded-3xl p-12 text-center space-y-4 shadow-md my-6">
                <div className="w-16 h-16 bg-[#F5ECE1] text-[#9E9082] rounded-full flex items-center justify-center mx-auto border border-[#E2D7CB]">
                  <ShoppingBag className="w-8 h-8 text-[#48A63E]" />
                </div>
                <h2 className="text-xl font-extrabold text-[#2C241D]">Your cart is empty</h2>
                <p className="text-xs text-[#6B5C4D] max-w-sm mx-auto font-medium">
                  You haven't added any items to your cart yet. Explore our luxury collection and click "Add to Cart" on any product.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="py-3 px-6 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-xs transition-colors shadow-md shadow-[#48A63E]/20"
                  >
                    Browse Furniture Collection
                  </button>
                </div>
              </div>
            ) : (
              /* Active Cart Grid */
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items List (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="ultra-glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md transition-all hover:border-[#48A63E]/60"
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl bg-[#F4ECE1] flex-shrink-0 border border-[#E6DDD3]"
                        />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#48A63E]">
                            {item.material}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-[#2C241D] line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-xs font-semibold text-[#6B5C4D] mt-1">
                            ₹{item.price.toLocaleString('en-IN')} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls & Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EFE7DE]">
                        {/* Qty Counter */}
                        <div className="flex items-center gap-2 bg-[#F9F6F0] rounded-xl p-1 border border-[#E2D7CB]">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-[#F4ECE1] flex items-center justify-center text-[#2C241D] transition-colors shadow-xs"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-extrabold text-[#2C241D]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-[#F4ECE1] flex items-center justify-center text-[#2C241D] transition-colors shadow-xs"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Total Price & Delete */}
                        <div className="text-right">
                          <div className="text-base font-extrabold text-[#48A63E]">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 mt-0.5 font-bold transition-colors ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary Box (1 col) */}
                <div className="lg:col-span-1">
                  <div className="ultra-glass-card rounded-3xl p-6 space-y-5 shadow-xl sticky top-24">
                    <h2 className="text-lg font-extrabold text-[#2C241D] border-b border-[#EFE7DE] pb-3">
                      Order Summary
                    </h2>

                    <div className="space-y-3 text-xs font-medium text-[#6B5C4D]">
                      <div className="flex justify-between">
                        <span>Subtotal ({totalItemCount} items)</span>
                        <span className="font-bold text-[#2C241D]">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>

                      {appliedDiscount && (
                        <div className="flex justify-between text-[#48A63E] font-bold bg-[#48A63E]/10 p-2 rounded-xl border border-[#48A63E]/20">
                          <div className="flex items-center gap-1.5">
                            <span>Dearest Discount ({appliedDiscount.code} - {appliedDiscount.percent}%)</span>
                            <button
                              onClick={handleRemoveDiscount}
                              className="text-[10px] text-rose-600 underline ml-1 hover:text-rose-800"
                            >
                              Remove
                            </button>
                          </div>
                          <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span>Standard Shipping</span>
                        <span className="font-bold text-[#48A63E]">
                          {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-[#EFE7DE] flex justify-between text-base font-extrabold text-[#2C241D]">
                        <span>Total Amount</span>
                        <span className="text-[#48A63E]">₹{grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Dearest Customer Discount & Promo Code Input */}
                    <div className="pt-2 border-t border-[#EFE7DE] space-y-2">
                      <label className="block text-[11px] font-extrabold text-[#2C241D] uppercase tracking-wider">
                        Promo Code
                      </label>
                      <form onSubmit={handleApplyPromo} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] font-mono font-bold uppercase text-[#2C241D]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          Apply
                        </button>
                      </form>

                      {promoMessage && (
                        <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${promoMessage.type === 'success' ? 'bg-[#48A63E]/15 text-[#48A63E]' : 'bg-rose-100 text-rose-700'
                          }`}>
                          {promoMessage.text}
                        </div>
                      )}
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={handleCheckout}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-sm transition-all shadow-md shadow-[#48A63E]/20"
                    >
                      Proceed to Checkout
                    </button>

                    <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#7A6C5E]">
                      <ShieldCheck className="w-4 h-4 text-[#48A63E]" />
                      <span>Secure 256-bit SSL Checkout</span>
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
