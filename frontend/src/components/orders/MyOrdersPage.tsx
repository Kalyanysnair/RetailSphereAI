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
  CheckCircle2,
  FileText,
  Download,
  MessageSquare,
  Clock,
  ShieldCheck,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Layers
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { fetchCustomOrders, getFurnitureImageUrl, cancelCustomOrder, payCustomOrder, downloadPaymentReceipt, CustomOrderData, isCustomerOrderMatch } from '../../services/api_production';
import { openRazorpayCheckout } from '../../services/razorpay';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getStoredRetailOrders, cancelStoredRetailOrder, fetchRetailOrdersFromDB } from '../../utils/retailOrdersStorage';
import { parseReferenceImages } from '../../utils/imageUtils';
import { 
  fetchOrderFulfillmentDetails,
  fetchOrderHistoryAPI,
  fetchOrderMessagesAPI,
  sendOrderMessageAPI,
  cancelOrderAPI,
  submitReturnRequestAPI,
  FulfillmentDetails,
  StatusHistoryItem,
  OrderMessageItem
} from '../../services/retailOrdersFulfillmentApi';

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
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
  items: OrderItem[];
  isCustomBuild?: boolean;
  deliveryAddress?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  feedbackGiven?: boolean;
  rating?: number;
  feedbackText?: boolean | string;
  is_locked?: boolean;
  sortTimestamp?: number;
  trackingTimeline?: {
    stage: string;
    timestamp?: string;
    completed: boolean;
    current?: boolean;
  }[];
}

interface MyOrdersPageProps {
  hideHeader?: boolean;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'current' | 'in-progress' | 'delivered' | 'custom'>('all');
  const [glanceQuery, setGlanceQuery] = useState('');

  const scrollToOrder = (orderId: string) => {
    const el = document.getElementById(`order-card-${orderId}`);
    if (el) {
      const yOffset = -80;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-[#48A63E]', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#48A63E]');
      }, 2000);
    }
  };

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
  const [cancelModalOrder, setCancelModalOrder] = useState<{ id: string | number; isCustom: boolean } | null>(null);

  // Tracking & Fulfillment Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState<OrderData | null>(null);
  const [trackingFulfillmentData, setTrackingFulfillmentData] = useState<FulfillmentDetails | null>(null);
  const [loadingFulfillment, setLoadingFulfillment] = useState(false);

  // Order Communication Messaging Drawer State
  const [messagingModalOrder, setMessagingModalOrder] = useState<OrderData | null>(null);
  const [orderMessages, setOrderMessages] = useState<OrderMessageItem[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Return Request Modal State
  const [returnModalOrder, setReturnModalOrder] = useState<OrderData | null>(null);
  const [returnReason, setReturnReason] = useState('Damaged');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnPhotoUrl, setReturnPhotoUrl] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const handleOpenTrackingModal = async (ord: OrderData) => {
    setTrackingModalOrder(ord);
    setLoadingFulfillment(true);
    const details = await fetchOrderFulfillmentDetails(ord.orderId);
    setTrackingFulfillmentData(details);
    setLoadingFulfillment(false);
  };

  const handleOpenMessagingModal = async (ord: OrderData) => {
    setMessagingModalOrder(ord);
    const msgs = await fetchOrderMessagesAPI(ord.orderId);
    setOrderMessages(msgs);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messagingModalOrder || !newMessageText.trim()) return;

    setSendingMessage(true);
    const userId = userObj?.user_id || userObj?.id || userObj?.customer_id;
    const ok = await sendOrderMessageAPI(
      messagingModalOrder.orderId,
      'Customer',
      userName,
      newMessageText.trim(),
      userId
    );
    if (ok) {
      setNewMessageText('');
      const updatedMsgs = await fetchOrderMessagesAPI(messagingModalOrder.orderId);
      setOrderMessages(updatedMsgs);
    }
    setSendingMessage(false);
  };

  const handleSubmitReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder) return;

    const custId = userObj?.customer_id || userObj?.user_id || 1;
    setSubmittingReturn(true);
    const res = await submitReturnRequestAPI(
      returnModalOrder.orderId,
      custId,
      returnReason,
      returnDescription,
      returnPhotoUrl
    );

    setSubmittingReturn(false);
    if (res.success) {
      setReturnModalOrder(null);
      setToastMessage('Return request submitted! Our team will review it shortly.');
      setTimeout(() => setToastMessage(null), 3500);
      loadOrdersFromDB();
    } else {
      alert(res.message || 'Could not submit return request.');
    }
  };

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
      console.log('[MY ORDERS DEBUG] API RESULT COUNT:', allCustomOrders.length, allCustomOrders);

      const userCustomOrders = allCustomOrders.filter((o) => {
        if (!userObj) return true;
        return isCustomerOrderMatch(o, userObj);
      });

      const finalCustomOrders = userCustomOrders;

      const formatted: OrderData[] = finalCustomOrders.map((o) => {
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
          sortTimestamp: o.order_date ? new Date(o.order_date).getTime() : Date.now() + o.custom_order_id * 1000,
          deliveryAddress: 'Ettumanoor, Kottayam, Kerala 686631',
          estimatedDelivery: o.order_status === 'Completed' ? 'Delivered' : '7-10 Business Days',
          trackingNumber: `TRACK-CUST-${o.custom_order_id}`,
          items: [
            {
              id: `item-${o.custom_order_id}`,
              name: o.furniture_type,
              category: 'Custom Studio',
              image: o.reference_image ? parseReferenceImages(o.reference_image)[0] || '' : '',
              price: o.estimated_price || 0,
              quantity: 1,
              specifications: `Material: ${o.material} • Upholstery: ${o.color} • Specs: ${o.dimensions}${o.design_description ? ` • Notes: ${o.design_description}` : ''}`
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

      let formattedRetailOrders: OrderData[] = [];
      try {
        const sessionEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();
        const sessionUserId = userObj?.id || userObj?.customer_id || userObj?.user_id;

        const storedRetailOrders = await fetchRetailOrdersFromDB();

        const userRetailOrders = storedRetailOrders.filter((r) => {
          if (!userObj || (!sessionEmail && !sessionUserId)) return false;
          const oEmail = (r.email || '').toLowerCase().trim();
          const oCustomerId = r.customerId || (r as any).customer_id;

          if (sessionUserId && oCustomerId && Number(oCustomerId) === Number(sessionUserId)) return true;
          if (sessionEmail && oEmail && oEmail === sessionEmail) return true;

          return false;
        });

        const finalRetailOrders = userRetailOrders;

        formattedRetailOrders = finalRetailOrders.map((r, index) => ({
          orderId: r.orderId,
          numericId: 9000 + index,
          type: 'standard',
          date: r.orderDate,
          status: r.orderStatus === 'Cancelled' ? 'Cancelled' : (r.paymentStatus === 'Paid' ? 'Order Placed' : r.orderStatus),
          totalPrice: r.totalAmount,
          originalSubtotal: r.originalSubtotal,
          couponCode: r.couponCode,
          discountType: r.discountType,
          discountDeducted: r.discountDeducted,
          shippingFee: r.shippingFee,
          isCustomBuild: false,
          is_locked: true,
          sortTimestamp: r.createdAt || (r.orderDate ? new Date(r.orderDate).getTime() : Date.now() - index * 1000),
          items: r.items.map((i) => ({
            id: i.id,
            name: i.name,
            category: 'Ready-Made Store Furniture',
            image: i.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
            price: i.price,
            quantity: i.quantity,
            specifications: `${i.quantity} Unit(s) • Ready-Made Store Purchase${r.paymentId ? ` • Payment ID: ${r.paymentId}` : ''}`,
          })),
          trackingTimeline: [
            { stage: 'Order Placed & Paid (Razorpay)', completed: true, current: false },
            { stage: 'Warehouse Processing', completed: true, current: true },
            { stage: 'Dispatched for Delivery', completed: false, current: false },
            { stage: 'Delivered to Customer', completed: false, current: false },
          ],
        }));
      } catch (retailErr) {
        console.warn('Retail orders load error:', retailErr);
      }

      const isExcludedId = (idVal: any) => {
        if (!idVal) return false;
        const str = String(idVal).toLowerCase().replace(/[^a-z0-9]/g, '');
        return str.includes('103') || str.includes('0103') || str.includes('102') || str.includes('13');
      };

      const mergedOrders = [...formatted, ...formattedRetailOrders].filter(o => 
        !isExcludedId(o.orderId) && !isExcludedId(o.numericId)
      );
      mergedOrders.sort((a, b) => (b.sortTimestamp || 0) - (a.sortTimestamp || 0));
      console.log('[MY ORDERS DEBUG] SETTING ORDERS STATE COUNT:', mergedOrders.length, mergedOrders);
      setOrders(mergedOrders);
    } catch (err) {
      console.error('Error fetching DB orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersFromDB();
    const handleUpdate = () => loadOrdersFromDB();
    window.addEventListener('retail-orders-updated', handleUpdate);
    window.addEventListener('custom-orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('retail-orders-updated', handleUpdate);
      window.removeEventListener('custom-orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
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
    if (activeTab === 'current') return o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Quote Provided' || o.status === 'Order Placed' || o.status === 'In Production' || o.status === 'Approved' || o.status === 'Processing' || o.status === 'Shipped' || o.status === 'Warehouse Processing' || o.status === 'Paid';
    if (activeTab === 'in-progress') return o.status === 'In Production' || o.status === 'Approved' || o.status === 'Out for Delivery';
    if (activeTab === 'delivered') return o.status === 'Completed' || o.status === 'Delivered';
    if (activeTab === 'custom') return o.isCustomBuild;
    return true;
  });

  const renderSpecBadges = (specs: string) => {
    if (!specs) return null;
    const parts = specs.split('•').map((s) => s.trim()).filter(Boolean);

    const badges: { icon: string; text: string }[] = [];

    parts.forEach((part) => {
      let lower = part.toLowerCase();

      if (lower.startsWith('material:')) {
        const clean = part.replace(/material:/i, '').trim();
        badges.push({ icon: '🪵', text: clean });
      } else if (lower.startsWith('upholstery:')) {
        const clean = part.replace(/upholstery:/i, '').trim();
        badges.push({ icon: '🧵', text: clean });
      } else if (lower.startsWith('specs:')) {
        const clean = part.replace(/specs:/i, '').trim();
        badges.push({ icon: '📐', text: clean });
      } else if (lower.startsWith('notes:')) {
        const notesRaw = part.replace(/notes:/i, '').trim();

        // Check if notes contains Aspects: [...]
        const aspectsMatch = notesRaw.match(/Aspects:\s*\[(.*?)\]/i);
        if (aspectsMatch && aspectsMatch[1]) {
          const aspectItems = aspectsMatch[1]
            .split(';')
            .map((a) => a.trim())
            .filter(Boolean);
          aspectItems.forEach((asp) => {
            const val = asp.includes(':') ? asp.split(':')[1].trim() : asp;
            if (val) {
              let icon = '✨';
              const aspLower = asp.toLowerCase();
              if (aspLower.includes('size') || aspLower.includes('king') || aspLower.includes('queen') || aspLower.includes('capacity') || aspLower.includes('seater')) {
                icon = '🛏️';
              } else if (aspLower.includes('storage') || aspLower.includes('drawer') || aspLower.includes('lift')) {
                icon = '📦';
              } else if (aspLower.includes('comfort') || aspLower.includes('cushion') || aspLower.includes('firmness')) {
                icon = '🛋️';
              } else if (aspLower.includes('leg') || aspLower.includes('armrest') || aspLower.includes('style')) {
                icon = '🪵';
              }
              badges.push({ icon, text: val });
            }
          });
        }

        // Check if notes contains Special Requirements: ...
        const specialMatch = notesRaw.match(/Special Requirements:\s*(.*)/i);
        if (specialMatch && specialMatch[1]) {
          const reqText = specialMatch[1].trim();
          if (reqText && !['nil', 'none', 'n/a', 'no', 'nil.'].includes(reqText.toLowerCase())) {
            badges.push({ icon: '📌', text: `Special: ${reqText}` });
          }
        } else if (!aspectsMatch) {
          if (notesRaw && !['nil', 'none', 'n/a'].includes(notesRaw.toLowerCase())) {
            badges.push({ icon: '📝', text: notesRaw });
          }
        }
      } else if (lower.includes('unit')) {
        badges.push({ icon: '📦', text: part });
      } else if (lower.includes('ready-made') || lower.includes('store')) {
        badges.push({ icon: '🛒', text: part });
      } else if (lower.includes('payment id:')) {
        const clean = part.replace(/payment id:/i, 'Pay ID:').trim();
        badges.push({ icon: '💳', text: clean });
      } else {
        badges.push({ icon: '⚡', text: part });
      }
    });

    if (badges.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {badges.map((b, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32] shadow-2xs"
          >
            <span className="text-[11px]">{b.icon}</span>
            <span className="truncate max-w-[220px]">{b.text}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen text-[#2C241D] font-sans selection:bg-[#38A132] selection:text-white overflow-x-hidden">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#38A132] text-white px-5 py-3 rounded-2xl shadow-xl font-extrabold text-xs flex items-center gap-2 animate-bounce">
          <ThumbsUp className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ambient Warm Luxury Living Room Background Image Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />

      {/* Lighter Translucent Warm Cream Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/75 via-[#F3EDE5]/65 to-[#EAE1D5]/70 pointer-events-none" />

      {/* ORIGINAL MASTER NAVIGATION HEADER (Rendered only when not embedded inside MyActivityTab) */}
      {!hideHeader && <Header />}

      {/* Main Content Area */}
      <main className={`relative z-10 w-full max-w-[1300px] mx-auto space-y-6 ${hideHeader ? 'p-0' : 'p-3 sm:p-5 lg:p-6'}`}>
        {/* Master Unified Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-[#E2D7CB] shadow-xs space-y-5">
          {/* Integrated Header Heading Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
            <div>
              <button
                onClick={() => {
                  if (hideHeader) {
                    window.dispatchEvent(new CustomEvent('change-customer-tab', { detail: 'shop' }));
                  } else {
                    navigate('/dashboard', { state: { activeTab: 'shop' } });
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#48A63E] hover:text-[#3D9134] mb-2 transition-colors cursor-pointer bg-[#48A63E]/10 hover:bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/20 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Furniture Studio</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
                My Orders & Tracking
              </h2>
              <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                Track your store purchases and custom furniture orders in real-time.
              </p>
            </div>

            <Link
              to="/dashboard#custom-order-section"
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('change-customer-tab', { detail: 'create' }));
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold whitespace-nowrap shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0 text-white" />
              <span className="whitespace-nowrap">Request Custom Order</span>
            </Link>
          </div>

          {/* Tabs Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EFE7DE] scrollbar-none">
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'current', label: 'Current Orders', count: orders.filter(o => o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Quote Provided' || o.status === 'Order Placed' || o.status === 'In Production' || o.status === 'Approved' || o.status === 'Processing' || o.status === 'Shipped' || o.status === 'Warehouse Processing' || o.status === 'Paid').length },
              { id: 'in-progress', label: 'In Progress / Approved', count: orders.filter(o => o.status === 'In Production' || o.status === 'Approved' || o.status === 'Out for Delivery').length },
              { id: 'delivered', label: 'Completed', count: orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length },
              { id: 'custom', label: 'Custom Builds', count: orders.filter(o => o.isCustomBuild).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#48A63E] text-white shadow-2xs font-extrabold'
                    : 'bg-white/90 hover:bg-white text-[#6E6458] hover:text-[#1C1814] border border-[#E2D7CB]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-[#EAE0D4] text-[#5C4E42]'
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: STICKY AT-A-GLANCE ORDERS QUICK INDEX (4 cols) with Brownish Tint */}
              <div className="lg:col-span-4 sticky top-24 bg-[#EFE8DC] border border-[#D6C9B9] rounded-2xl p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#D6C9B9]/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#B89768]/20 flex items-center justify-center text-[#5C4E42]">
                      <Layers className="w-3.5 h-3.5 text-[#5C4E42]" />
                    </div>
                    <h3 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">
                      Orders At A Glance
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold bg-[#B89768] text-white px-2 py-0.5 rounded-full shadow-2xs">
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                </div>

                {/* Quick Search filter inside Brownish Side Panel */}
                {filteredOrders.length > 2 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A6C5E]" />
                    <input
                      type="text"
                      placeholder="Find order or item..."
                      value={glanceQuery}
                      onChange={(e) => setGlanceQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-[#D6C9B9] rounded-xl text-[11px] font-bold text-[#2C241D] focus:outline-none focus:border-[#B89768]"
                    />
                  </div>
                )}

                {/* Scrollable Quick Items List */}
                <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                  {filteredOrders
                    .filter((ord) => {
                      if (!glanceQuery.trim()) return true;
                      const q = glanceQuery.toLowerCase();
                      const matchId = String(ord.orderId).toLowerCase().includes(q);
                      const matchItem = ord.items.some((i) => i.name.toLowerCase().includes(q));
                      return matchId || matchItem;
                    })
                    .map((ord) => {
                      const firstItem = ord.items[0];
                      return (
                        <div
                          key={ord.orderId}
                          onClick={() => scrollToOrder(ord.orderId)}
                          className="p-2.5 bg-[#FAF7F2] hover:bg-white rounded-xl border border-[#D6C9B9] cursor-pointer transition-all hover:border-[#B89768] hover:shadow-2xs group space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-[#2C241D] bg-[#E8DFC8] px-2 py-0.5 rounded-md border border-[#C8BCAC]">
                              Order #{ord.orderId}
                            </span>
                            <span className="text-[9px] font-extrabold text-[#2D6338] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#A6C495] truncate max-w-[100px]">
                              {ord.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {firstItem?.image ? (
                              <img src={firstItem.image} alt={firstItem.name} className="w-9 h-9 rounded-lg object-cover border border-[#D6C9B9] shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#E8DFC8] border border-[#D6C9B9] flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5 text-[#5C4E42]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-bold text-[#1C1814] group-hover:text-[#48A63E] transition-colors truncate">
                                {firstItem?.name || 'Furniture Item'}
                              </h4>
                              {ord.items.length > 1 && (
                                <p className="text-[9px] font-semibold text-[#7A6C5E]">
                                  + {ord.items.length - 1} more item(s)
                                </p>
                              )}
                              <div className="text-[10px] font-extrabold text-[#48A63E] mt-0.5">
                                ₹{ord.totalPrice.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* RIGHT COLUMN: Main Detailed Order Cards List (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {filteredOrders.map((order) => {
                  const isEditable = order.status === 'Pending' || order.status === 'Pending Approval';
                  const firstItem = order.items[0];

                  return (
                    <div
                      id={`order-card-${order.orderId}`}
                      key={order.orderId}
                      className="bg-white rounded-2xl p-4 sm:p-5 transition-all border border-[#E2D7CB] shadow-2xs hover:shadow-xs space-y-4"
                    >
                      {/* TOP ROW: Order Info & Status / Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#1C1814] bg-[#FAF7F2] px-3 py-1 rounded-xl border border-[#D6C9B9]">
                            Order #{order.orderId}
                          </span>
                          <span className="text-xs font-medium text-[#7A6C5E] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#8C7C6D]" /> {formatOrderDate(order.date)}
                          </span>
                        </div>

                        {/* Status Badges & Quick Actions Cluster */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.status === 'Cancelled' ? (
                            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-extrabold flex items-center gap-1">
                              Status: Cancelled
                            </span>
                          ) : (order.status === 'Paid' || order.status === 'Order Placed' || order.status === 'In Production' || order.status === 'Completed' || order.status === 'Delivered') ? (
                            <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2D6338] border border-[#A6C495] text-[11px] font-extrabold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#48A63E]" />
                              Status: Paid & Placed
                            </span>
                          ) : (
                            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                              order.status === 'Approved'
                                ? 'bg-purple-500/15 text-purple-800 border border-purple-500/30'
                                : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                            }`}>
                              Status: {order.status}
                            </span>
                          )}

                          {/* Download Receipt Button */}
                          {(order.status === 'Paid' || order.status === 'Order Placed' || order.status === 'In Production' || order.status === 'Completed' || order.status === 'Delivered') && (
                            <button
                              onClick={() => {
                                const calculatedSubtotal = order.originalSubtotal || order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                const calculatedDiscount = order.discountDeducted || (calculatedSubtotal > order.totalPrice ? calculatedSubtotal - order.totalPrice : 0);
                                const ordObj: CustomOrderData = {
                                  custom_order_id: order.numericId,
                                  customer_id: 1,
                                  customer_name: 'Valued Customer',
                                  customer_email: '',
                                  customer_phone: '',
                                  furniture_type: firstItem?.name || 'Artisan Furniture',
                                  material: firstItem?.specifications || 'Premium Build',
                                  dimensions: 'Standard Specs',
                                  color: 'Custom Finish',
                                  estimated_price: order.totalPrice,
                                  order_status: 'Paid',
                                  payment_status: 'Paid',
                                  order_date: order.date || new Date().toISOString(),
                                  assigned_workers: [],
                                  current_stage: 'Paid',
                                  progress_percentage: 100,
                                  originalSubtotal: calculatedSubtotal,
                                  couponCode: order.couponCode || (calculatedDiscount > 0 ? 'PROMO APPLIED' : undefined),
                                  discountType: order.discountType || (calculatedDiscount > 0 ? 'Discount Deducted' : undefined),
                                  discountDeducted: calculatedDiscount,
                                  shippingFee: order.shippingFee || 0
                                };
                                downloadPaymentReceipt(ordObj);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Download official paid invoice receipt"
                            >
                              <Download className="w-3.5 h-3.5 text-white" />
                              <span>Receipt</span>
                            </button>
                          )}

                          {/* Track Delivery Button */}
                          <button
                            onClick={() => handleOpenTrackingModal(order)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#D6C9B9] hover:bg-[#FAF7F2] text-[#2C241D] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Track delivery status timeline"
                          >
                            <Truck className="w-3.5 h-3.5 text-[#48A63E]" />
                            <span>Track Delivery</span>
                          </button>

                          {/* Order Messaging Button */}
                          <button
                            onClick={() => handleOpenMessagingModal(order)}
                            className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D6C9B9] hover:bg-[#F4ECE1] text-[#2C241D] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Message workshop staff regarding this order"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#48A63E]" />
                            <span>Message Staff</span>
                          </button>

                          {/* Cancel Button */}
                          {order.status !== 'Cancelled' && order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'Dispatched' && order.status !== 'Out for Delivery' && (
                            <button
                              onClick={() => setCancelModalOrder({ id: order.isCustomBuild ? order.numericId : order.orderId, isCustom: !!order.isCustomBuild })}
                              className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                              title="Cancel Order"
                            >
                              <X className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* MAIN CONTENT ROW: Product Items List vs Payment Breakdown Box */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* Left Column: Product Items (Lg: 8 cols) */}
                        <div className="lg:col-span-8 space-y-2.5">
                          {order.items.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-start gap-3 bg-[#FAF7F2]/60 p-3 rounded-xl border border-[#EFE7DE]">
                              {item.image && item.image.trim() !== '' ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-14 h-14 rounded-lg object-cover border border-[#E2D7CB] shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] shrink-0 flex items-center justify-center font-bold text-[#48A63E]">
                                  <FileText className="w-5 h-5 text-[#48A63E]" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-[#1C1814] truncate">
                                    {item.name}
                                  </h4>
                                  <span className="text-xs font-black text-[#48A63E]">
                                    ₹{((item.price || order.totalPrice) * (item.quantity || 1)).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                {item.specifications ? (
                                  <div className="pt-0.5">
                                    {renderSpecBadges(item.specifications)}
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-bold text-[#6E6458] flex items-center gap-2 flex-wrap">
                                    <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE]">
                                      📦 {item.quantity || 1} Unit(s)
                                    </span>
                                    <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE]">
                                      🛒 {order.isCustomBuild ? 'Custom Order Build' : 'Ready-Made Store Purchase'}
                                    </span>
                                    {(order as any).paymentId && (
                                      <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE] font-mono text-[10px]">
                                        💳 Pay ID: {(order as any).paymentId}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Right Column: Pricing & Invoice Breakdown Box (Lg: 4 cols) */}
                        <div className="lg:col-span-4 bg-[#FAF7F2] rounded-xl p-3.5 border border-[#EAE0D4] space-y-2">
                          <div className="text-[11px] font-extrabold text-[#7A6C5E] border-b border-[#E4DCD0] pb-1.5 uppercase tracking-wider">
                            Payment & Invoice Breakdown
                          </div>

                          {(() => {
                            const calculatedSubtotal = order.originalSubtotal || order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                            const calculatedDiscount = order.discountDeducted || (calculatedSubtotal > order.totalPrice ? calculatedSubtotal - order.totalPrice : 0);
                            const hasDiscount = calculatedDiscount > 0 || !!order.couponCode;

                            return (
                              <div className="space-y-1.5 text-xs font-bold text-[#5C4E42]">
                                {hasDiscount && (
                                  <>
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span>Original Subtotal:</span>
                                      <span className="line-through font-extrabold text-[#7A6C5E]">₹{calculatedSubtotal.toLocaleString('en-IN')}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px] text-[#2D6338] font-extrabold bg-[#E8F5E9] px-2.5 py-1 rounded-lg border border-[#A6C495]">
                                      <span>🏷️ {order.couponCode || 'PROMO APPLIED'}:</span>
                                      <span>-₹{calculatedDiscount.toLocaleString('en-IN')}</span>
                                    </div>
                                  </>
                                )}

                                <div className="flex justify-between items-center text-[11px]">
                                  <span>Shipping Fee:</span>
                                  <span className="font-extrabold text-[#48A63E]">
                                    {order.shippingFee === 0 || !order.shippingFee ? 'FREE' : `₹${order.shippingFee}`}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-[#E4DCD0] flex justify-between items-baseline">
                                  <span className="text-[11px] font-extrabold uppercase text-[#1C1814] tracking-wider">Final Amount Paid:</span>
                                  <span className="text-lg font-black text-[#48A63E] tracking-tight">
                                    ₹{order.totalPrice.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#2C241D]">Cancel Order Request</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel this order? This action will update the order status to <span className="font-extrabold text-rose-700">Cancelled</span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-extrabold text-xs transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const target = cancelModalOrder;
                  setCancelModalOrder(null);
                  if (target) {
                    setOrders(prev => prev.map(o => {
                      const isMatch = target.isCustom 
                        ? o.numericId === target.id 
                        : o.orderId === target.id;
                      if (isMatch) {
                        return { ...o, status: 'Cancelled' };
                      }
                      return o;
                    }));

                    if (target.isCustom) {
                      await cancelCustomOrder(target.id as number);
                    } else {
                      const uId = userObj?.user_id || userObj?.id || userObj?.customer_id;
                      await cancelOrderAPI(target.id as string, 'Customer requested cancellation', uId, 'Customer');
                      cancelStoredRetailOrder(target.id as string);
                    }
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

      {/* TRACKING & FULFILLMENT TIMELINE MODAL */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#2C241D] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#38A132] font-black bg-[#38A132]/10 px-2.5 py-1 rounded-md border border-[#38A132]/20">
                  {trackingModalOrder.orderId}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-2">
                  Order Delivery Tracking & Timeline
                </h3>
                <p className="text-xs text-[#7A6C5E]">Live order fulfillment status</p>
              </div>
              <button
                onClick={() => {
                  setTrackingModalOrder(null);
                  setTrackingFulfillmentData(null);
                }}
                className="p-2 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingFulfillment ? (
              <div className="py-12 text-center text-xs font-extrabold text-[#7A6C5E] space-y-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#38A132] mx-auto" />
                <span>Fetching live order status history...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Fulfillment Details Banner */}
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center border-b border-[#E2D7CB]/60 pb-2">
                    <span className="text-[#7A6C5E]">Current Order Status:</span>
                    <span className="font-extrabold text-[#38A132] uppercase">{trackingFulfillmentData?.order_status || trackingModalOrder.status}</span>
                  </div>

                  {trackingFulfillmentData?.fulfillment?.carrier && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Shipping Carrier:</span>
                      <span className="font-extrabold text-[#2C241D]">{trackingFulfillmentData.fulfillment.carrier}</span>
                    </div>
                  )}

                  {trackingFulfillmentData?.fulfillment?.tracking_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Tracking Number:</span>
                      <span className="font-mono font-bold text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded border border-[#38A132]/20">
                        {trackingFulfillmentData.fulfillment.tracking_number}
                      </span>
                    </div>
                  )}

                  {trackingFulfillmentData?.fulfillment?.expected_delivery_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Expected Delivery:</span>
                      <span className="font-bold text-[#2C241D]">{trackingFulfillmentData.fulfillment.expected_delivery_date}</span>
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-3">Order Lifecycle Progress</h4>
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2D7CB]">
                    {[
                      'Order Placed',
                      'Payment Confirmed',
                      'Order Confirmed',
                      'Processing',
                      'Packed',
                      'Dispatched',
                      'Out for Delivery',
                      'Delivered'
                    ].map((stageName, idx) => {
                      const curStatus = (trackingFulfillmentData?.order_status || trackingModalOrder.status).toLowerCase();
                      const isCompleted = curStatus === stageName.toLowerCase() || (
                        (curStatus === 'delivered' || curStatus === 'completed') ||
                        (curStatus === 'out for delivery' && idx <= 6) ||
                        (curStatus === 'dispatched' && idx <= 5) ||
                        (curStatus === 'packed' && idx <= 4) ||
                        (curStatus === 'processing' && idx <= 3) ||
                        (curStatus === 'order confirmed' && idx <= 2) ||
                        (curStatus === 'payment confirmed' && idx <= 1) ||
                        (curStatus === 'order placed' && idx <= 0)
                      );
                      const isCurrent = curStatus === stageName.toLowerCase();

                      return (
                        <div key={stageName} className="flex items-start gap-3 relative z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                            isCompleted ? 'bg-[#38A132] text-white' : 'bg-white border-2 border-[#E2D7CB] text-[#9E9082]'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <div>
                            <span className={`text-xs font-extrabold ${isCurrent ? 'text-[#38A132]' : isCompleted ? 'text-[#2C241D]' : 'text-[#9E9082]'}`}>
                              {stageName}
                            </span>
                            {isCurrent && <span className="ml-2 text-[10px] bg-[#38A132]/10 text-[#38A132] font-black px-2 py-0.5 rounded-full">ACTIVE STAGE</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit History Log */}
                {trackingFulfillmentData?.history && trackingFulfillmentData.history.length > 0 && (
                  <div className="pt-3 border-t border-[#E2D7CB]">
                    <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-2">Audit History Log</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {trackingFulfillmentData.history.map((h) => (
                        <div key={h.history_id} className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-[11px] font-semibold space-y-0.5">
                          <div className="flex justify-between text-[#2C241D]">
                            <span className="font-extrabold text-[#38A132]">{h.new_status}</span>
                            <span className="text-[10px] text-[#7A6C5E]">{h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}</span>
                          </div>
                          {h.note && <p className="text-[#6E6458] text-[10px] italic">{h.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER COMMUNICATION MESSAGING DRAWER */}
      {messagingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-[#2C241D] flex flex-col h-[520px]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#38A132]" />
                  <span>Message Workshop Staff — {messagingModalOrder.orderId}</span>
                </h3>
                <p className="text-xs text-[#7A6C5E]">Direct communication for your order</p>
              </div>
              <button
                onClick={() => setMessagingModalOrder(null)}
                className="p-1.5 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
              {orderMessages.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">
                  No messages yet. Send a message to workshop staff regarding your delivery or specifications.
                </div>
              ) : (
                orderMessages.map((msg) => {
                  const isMe = msg.sender_role === 'Customer';
                  return (
                    <div key={msg.message_id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold shadow-xs ${
                        isMe ? 'bg-[#38A132] text-white rounded-br-none' : 'bg-white text-[#2C241D] border border-[#E2D7CB] rounded-bl-none'
                      }`}>
                        <div className="text-[10px] font-black opacity-80 mb-0.5">{msg.sender_name} ({msg.sender_role})</div>
                        <p>{msg.message}</p>
                      </div>
                      <span className="text-[9px] text-[#9E9082] mt-0.5 font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send Message Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-[#EFE7DE] shrink-0">
              <input
                type="text"
                placeholder="Type a message to workshop staff..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessageText.trim()}
                className="px-4 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RETURN REQUEST MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Request Order Return</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{returnModalOrder.orderId}</p>
              </div>
              <button
                onClick={() => setReturnModalOrder(null)}
                className="p-1 text-[#9E9082] hover:text-[#2C241D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturnRequest} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-bold"
                >
                  <option value="Damaged">Damaged during transit</option>
                  <option value="Wrong Item">Wrong item received</option>
                  <option value="Missing Item">Missing accessories / parts</option>
                  <option value="Defective">Defective / Structural fault</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Describe the issue with the furniture item..."
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Photo URL (Optional)</label>
                <input
                  type="text"
                  value={returnPhotoUrl}
                  onChange={(e) => setReturnPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

