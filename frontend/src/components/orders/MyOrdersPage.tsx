import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  Star, 
  ArrowLeft, 
  Calendar, 
  X, 
  Send,
  ThumbsUp,
  Loader2,
  Plus,
  Pencil,
  Lock,
  ShoppingBag,
  AlertCircle,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { fetchCustomOrders, getFurnitureImageUrl, cancelCustomOrder, payCustomOrder } from '../../services/api_production';
import { openRazorpayCheckout } from '../../services/razorpay';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getStoredRetailOrders } from '../../utils/retailOrdersStorage';

interface OrderItem {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  quantity: number;
  specifications?: string;
}

interface OrderData {
  orderId: string;
  numericId: number;
  type?: 'standard' | 'custom';
  date: string;
  status: string;
  totalPrice: number;
  items: OrderItem[];
  isCustomBuild?: boolean;
  deliveryAddress?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  feedbackGiven?: boolean;
  rating?: number;
  feedbackText?: boolean | string;
  is_locked?: boolean;
  trackingTimeline?: {
    stage: string;
    timestamp?: string;
    completed: boolean;
    current?: boolean;
  }[];
}

export const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'delivered' | 'custom'>('all');

  const [cartItemIds, setCartItemIds] = useState<string[]>(() => 
    getCartItems().map((item) => item.id)
  );

  useEffect(() => {
    const syncCart = () => {
      setCartItemIds(getCartItems().map((item) => item.id));
    };
    window.addEventListener('cart-updated', syncCart);
    return () => window.removeEventListener('cart-updated', syncCart);
  }, []);

  // Feedback Modal State
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<OrderData | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Excellent Craftsmanship', 'Fast Delivery']);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);

  const userObj = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const userName = userObj?.full_name || userObj?.username || 'Customer';

  const formatOrderDate = (rawDate: string) => {
    if (!rawDate) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return rawDate;
    }
  };

  // Load orders strictly fetched from Database API for the active logged-in user session
  const loadOrdersFromDB = async () => {
    setLoading(true);
    try {
      const allCustomOrders = await fetchCustomOrders();

      const currentUserEmail = (userObj?.email || userObj?.customer_email || '').toLowerCase().trim();
      const currentUserName = (userObj?.full_name || userObj?.username || userObj?.name || '').toLowerCase().trim();
      const currentUserId = userObj?.id || userObj?.customer_id;

      const userCustomOrders = allCustomOrders.filter((o) => {
        if (!userObj) return false;
        
        const oEmail = (o.customer_email || '').toLowerCase().trim();
        const oName = (o.customer_name || '').toLowerCase().trim();
        const oId = o.customer_id;

        if (currentUserEmail && oEmail && oEmail === currentUserEmail) return true;
        if (currentUserId && oId && oId === currentUserId) return true;
        if (currentUserName && oName && oName === currentUserName) return true;
        
        return false;
      });

      const formatted: OrderData[] = userCustomOrders.map((o) => {
        const stages = [
          'Material Sourcing',
          'Cutting & Joinery',
          'Assembly & Upholstery',
          'Quality Control & Finishing',
          'Ready for Dispatch'
        ];
        const currentStageIdx = stages.findIndex(s => s.toLowerCase() === (o.current_stage || '').toLowerCase());
        const activeIdx = currentStageIdx >= 0 ? currentStageIdx : 0;

        return {
          orderId: `CUSTOM-${o.custom_order_id}`,
          numericId: o.custom_order_id,
          date: o.order_date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: o.order_status || 'Pending Approval',
          totalPrice: o.estimated_price || 0,
          isCustomBuild: true,
          is_locked: o.is_locked,
          deliveryAddress: 'Ettumanoor, Kottayam, Kerala 686631',
          estimatedDelivery: o.order_status === 'Completed' ? 'Delivered' : '7-10 Business Days',
          trackingNumber: `TRACK-CUST-${o.custom_order_id}`,
          items: [
            {
              id: `item-${o.custom_order_id}`,
              name: o.furniture_type,
              category: 'Custom Studio',
              image: getFurnitureImageUrl(o.furniture_type, o.reference_image),
              price: o.estimated_price || 0,
              quantity: 1,
              specifications: `Material: ${o.material} • Upholstery: ${o.color} • Specs: ${o.dimensions}`
            }
          ],
          trackingTimeline: stages.map((stg, idx) => ({
            stage: stg,
            timestamp: idx <= activeIdx ? 'Completed' : 'Pending',
            completed: idx <= activeIdx,
            current: idx === activeIdx
          }))
        };
      });

      const storedRetailOrders = getStoredRetailOrders();
      const formattedRetailOrders: OrderData[] = storedRetailOrders.map((r, index) => ({
        orderId: r.orderId,
        numericId: 9000 + index,
        type: 'standard',
        date: r.orderDate,
        status: r.paymentStatus === 'Paid' ? 'Paid' : r.orderStatus,
        totalPrice: r.totalAmount,
        isCustomBuild: false,
        is_locked: true,
        items: r.items.map((i) => ({
          id: i.id,
          name: i.name,
          category: 'Ready-Made Store Furniture',
          image: i.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
          price: i.price,
          quantity: i.quantity,
          specifications: `${i.quantity} Unit(s) • Ready-Made Store Purchase`,
        })),
        trackingTimeline: [
          { stage: 'Order Placed & Paid', completed: true, current: false },
          { stage: 'Warehouse Processing', completed: true, current: true },
          { stage: 'Dispatched for Delivery', completed: false, current: false },
          { stage: 'Delivered to Customer', completed: false, current: false },
        ],
      }));

      setOrders([...formatted, ...formattedRetailOrders]);
    } catch (err) {
      console.error('Error fetching DB orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersFromDB();
  }, []);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalOrder) return;

    setSubmittingFeedback(true);
    setTimeout(() => {
      setOrders(prev => prev.map(o => {
        if (o.orderId === feedbackModalOrder.orderId) {
          return {
            ...o,
            feedbackGiven: true,
            rating,
            feedbackText: `${feedbackText} [Tags: ${selectedTags.join(', ')}]`
          };
        }
        return o;
      }));

      setSubmittingFeedback(false);
      setFeedbackModalOrder(null);
      setToastMessage(`Thank you! Your feedback has been saved.`);
      setTimeout(() => setToastMessage(null), 3500);
    }, 800);
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'in-progress') return o.status === 'In Production' || o.status === 'Approved' || o.status === 'Out for Delivery';
    if (activeTab === 'delivered') return o.status === 'Completed' || o.status === 'Delivered';
    if (activeTab === 'custom') return o.isCustomBuild;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5ECE1] relative text-[#2C241D] font-sans selection:bg-[#38A132]/20 selection:text-[#2C241D]">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#38A132] text-white px-5 py-3 rounded-2xl shadow-xl font-extrabold text-xs flex items-center gap-2 animate-bounce">
          <ThumbsUp className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Background Decorative Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/60 via-[#F3EDE5]/40 to-[#EAE1D5]/60 pointer-events-none" />

      {/* ORIGINAL MASTER NAVIGATION HEADER */}
      <Header />

      {/* Main Content Area */}
      <main className="relative z-10 p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        {/* Back Link & Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A6C5E] hover:text-[#2C241D] mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Furniture Studio</span>
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2C241D] tracking-tight">
              My Orders & Tracking
            </h1>
            <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
              Real-time records for logged user ({userName}).
            </p>
          </div>

          <Link
            to="/dashboard#custom-order-section"
            className="py-2.5 px-5 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-[#38A132]/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Request Custom Order</span>
          </Link>
        </div>

        {/* Master Glass Panel */}
        <div className="ultra-glass-panel rounded-[2.5rem] p-6 sm:p-8 space-y-6">
          {/* Tabs Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EFE7DE] scrollbar-none">
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'in-progress', label: 'In Progress / Approved', count: orders.filter(o => o.status === 'In Production' || o.status === 'Approved' || o.status === 'Out for Delivery').length },
              { id: 'delivered', label: 'Completed', count: orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length },
              { id: 'custom', label: 'Custom Builds', count: orders.filter(o => o.isCustomBuild).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25'
                    : 'ultra-glass-card text-[#5C4E42] hover:text-[#2C241D]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#EAE0D4] text-[#7A6C5E]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#38A132] mx-auto" />
              <p className="text-xs font-extrabold text-[#2C241D]">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#38A132]/10 border border-[#38A132]/30 text-[#38A132] mx-auto flex items-center justify-center">
                <Package className="w-8 h-8 text-[#38A132]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">No Orders Recorded Yet</h3>
                <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto mt-1 font-medium">
                  You haven&apos;t created any custom furniture orders yet. Click below to launch the Customization Studio and submit your bespoke furniture specs!
                </p>
              </div>
              <Link
                to="/dashboard#custom-order-section"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold shadow-lg shadow-[#38A132]/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Build & Submit Custom Order</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isEditable = order.status === 'Pending' || order.status === 'Pending Approval';
                const firstItem = order.items[0];

                return (
                  <div
                    key={order.orderId}
                    className="ultra-glass-card rounded-2xl p-4 transition-all border border-[#E2D7CB] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left side: Image, Title, Date & Specs */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {firstItem && (
                        <img
                          src={firstItem.image}
                          alt={firstItem.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-[#2C241D] truncate">
                            {firstItem?.name || 'Custom Build Order'}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#7A6C5E] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#8C7C6D]" /> {formatOrderDate(order.date)}
                          </span>
                        </div>
                        {firstItem?.specifications && (
                          <p className="text-[11px] font-bold text-[#38A132] truncate mt-0.5">
                            {firstItem.specifications}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Price, Single Status Badge & Action Button */}
                    <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-[#EFE7DE]">
                      {order.totalPrice > 0 && (
                        <span className="text-sm font-extrabold text-[#38A132]">
                          ₹{order.totalPrice.toLocaleString('en-IN')}
                        </span>
                      )}

                      {/* SINGLE STATUS BADGE */}
                      {order.status === 'Cancelled' ? (
                        <span className="px-3.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-xs font-extrabold flex items-center gap-1">
                          <span>Status: Cancelled</span>
                        </span>
                      ) : order.status === 'Paid' || order.status === 'In Production' || order.status === 'Completed' || order.status === 'Delivered' ? (
                        <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Payment Completed</span>
                        </span>
                      ) : (
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                          order.status === 'Approved'
                            ? 'bg-purple-500/15 text-purple-800 border border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                        }`}>
                          Status: {order.status}
                        </span>
                      )}

                      {/* CANCEL REQUEST BUTTON FOR UNPAID / PENDING ORDERS */}
                      {order.status !== 'Cancelled' && order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'In Production' && order.status !== 'Paid' && (
                        <button
                          onClick={() => setCancelModalOrderId(order.numericId)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="Cancel this custom furniture request"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          <span>Cancel Request</span>
                        </button>
                      )}

                      {/* ACTION BUTTON: EDIT SPECS OR ADD TO CART */}
                      {isEditable ? (
                        <Link
                          to="/dashboard#custom-order-form"
                          className="px-3.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#2C241D] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="Edit specifications before approval"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>Edit Specs</span>
                        </Link>
                      ) : (order.status === 'Approved' || order.status === 'Quote Updated') && (
                        <button
                          onClick={() => {
                            addToCart({
                              id: `custom-${order.numericId}`,
                              name: firstItem?.name || 'Custom Furniture Build',
                              material: firstItem?.specifications || 'Custom Specs',
                              price: order.totalPrice > 0 ? order.totalPrice : 50000,
                              imageUrl: firstItem?.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'
                            });
                            navigate('/cart');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#38A132]/25 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-white" />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                    {/* Display Submitted Feedback if available */}
                    {order.feedbackGiven && (
                      <div className="mt-2 p-3 bg-[#38A132]/10 rounded-xl border border-[#38A132]/30 text-xs">
                        <div className="flex items-center justify-between font-extrabold text-[#2C241D]">
                          <span className="flex items-center gap-1 text-amber-600">
                            {'★'.repeat(order.rating || 5)} <span className="text-[#2C241D] font-bold">({order.rating || 5}/5 Stars)</span>
                          </span>
                          <span className="text-[10px] text-[#38A132] font-mono font-bold uppercase">Feedback Submitted</span>
                        </div>
                        <p className="text-[#5C4E42] font-medium mt-0.5">&ldquo;{order.feedbackText}&rdquo;</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* FEEDBACK & RATING MODAL */}
      {feedbackModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Customer Experience Feedback
                </div>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-2">
                  Rate Custom Furniture Order
                </h3>
                <p className="text-xs text-[#7A6C5E]">Share your thoughts on craftsmanship & delivery.</p>
              </div>
              <button
                onClick={() => setFeedbackModalOrder(null)}
                className="p-2 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-5 text-xs">
              {/* Star Selector */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">Overall Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#E2D7CB]'}`} />
                    </button>
                  ))}
                  <span className="ml-2 font-extrabold text-sm text-[#2C241D]">{rating} out of 5</span>
                </div>
              </div>

              {/* Tag Chips */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">What did you like most?</label>
                <div className="flex flex-wrap gap-2">
                  {['Excellent Craftsmanship', 'Timber Quality', 'Fast Delivery', 'Polite Staff', 'Safe Packaging'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-[#38A132] text-white border-[#38A132]'
                          : 'bg-[#FAF7F2] text-[#5C4E42] border-[#E2D7CB]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">Detailed Comments / Review</label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us about your experience with the furniture, wood polish, comfort, or delivery speed..."
                  className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-xs sm:text-sm font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOrder(null)}
                  className="py-2.5 px-5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="py-2.5 px-6 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingFeedback ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#2C241D]">Cancel Custom Order</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel this custom order request? This action will update your request status to Cancelled.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-extrabold text-xs transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const targetId = cancelModalOrderId;
                  setCancelModalOrderId(null);
                  if (targetId) {
                    await cancelCustomOrder(targetId);
                    loadOrdersFromDB();
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
