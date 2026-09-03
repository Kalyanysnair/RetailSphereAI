import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Heart,
  ShoppingBag,
  Sliders,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Package,
  Award,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  Check,
  Zap,
  CreditCard,
  Lock
} from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems, setDirectCheckoutItem } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';
import { Header } from '../dashboard/Header';
import { HeaderNav } from '../landing/HeaderNav';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';
import { openImageInNewTab } from '../../utils/imageUtils';
import {
  hasUserPurchasedProduct,
  getProductReviews,
  submitProductReview,
  ProductReview
} from '../../utils/reviewStorage';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<RecommendationProduct | null>(null);
  const [cartIds, setCartIds] = useState<string[]>(() => getCartItems().map(i => i.id));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlistItems().map(i => i.id));
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [availableColorsList, setAvailableColorsList] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadProduct = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const match = dbItems.find((p: any) => String(p.id) === String(id) || String(p.product_id) === String(id) || p.sku === id);
          const target = match || dbItems[0];
          const rawId = target.product_id || target.id;
          const code = target.productCode || target.sku || `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;
          
          const rawColors = target.available_colors || target.availableColors || target.color || 'Emerald Green, Warm Beige, Charcoal Black';
          const parsedColors = parseAvailableColors(rawColors);
          const finalColors = parsedColors.length > 0 ? parsedColors : [target.color || 'Natural Wood'];
          
          setAvailableColorsList(finalColors);
          setSelectedColor(finalColors[0]);

          setProduct({
            id: target.id || `inv-${target.product_id}`,
            productCode: code,
            name: target.name || target.product_name,
            category: target.category || 'Living Room',
            subcategory: target.subcategory || 'General',
            price: typeof target.price === 'number' ? target.price : parseFloat(target.price) || 0,
            originalPrice: (typeof target.price === 'number' ? target.price : parseFloat(target.price) || 0) * 1.15,
            stock: target.stockCount || 10,
            salesCount: 45,
            status: (target.status || 'In Stock') as any,
            imageUrl: target.image_url || target.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
            rating: 4.9,
            reviewCount: 38,
            material: target.material || 'Solid Teak Wood',
            color: target.color || 'Natural Wood',
            dimensions: '200cm x 90cm x 75cm',
            isCustomizable: true,
            isTopPick: target.stockCount > 0,
            badge: code
          });
        }
      } catch (err) {
        console.warn('Error loading product detail from DB:', err);
      }
    };
    loadProduct();
  }, [id]);

  useEffect(() => {
    const syncCart = () => setCartIds(getCartItems().map(i => i.id));
    const syncWishlist = () => setWishlistIds(getWishlistItems().map(i => i.id));

    window.addEventListener('cart-updated', syncCart);
    window.addEventListener('wishlist-updated', syncWishlist);
    window.addEventListener('storage', syncCart);
    window.addEventListener('storage', syncWishlist);

    return () => {
      window.removeEventListener('cart-updated', syncCart);
      window.removeEventListener('wishlist-updated', syncWishlist);
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  if (!product) {
    return (
      <div className="relative min-h-screen text-[#2C241D] flex items-center justify-center p-6 overflow-x-hidden">
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
          }}
        />
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 ultra-glass-panel p-8 rounded-3xl">
          <Package className="w-12 h-12 text-[#48A63E] mx-auto animate-bounce" />
          <h2 className="text-xl font-extrabold text-[#2C241D]">Loading Product Details...</h2>
        </div>
      </div>
    );
  }

  const allImages = [
    product.imageUrl,
    ...(product.additionalImages || [])
  ].filter(Boolean);

  const currentCartItems = getCartItems();
  const isInCart = cartIds.includes(product.id) || currentCartItems.some(i => i.id === product.id || i.name === product.name);
  const isWishlisted = wishlistIds.includes(product.id);

  const isLoggedIn = Boolean(
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('access_token') || localStorage.getItem('user'))
  );

  const handleCartToggle = () => {
    if (isInCart) {
      if (!isLoggedIn) {
        navigate(`/login?redirect=/cart`);
        return;
      }
      navigate('/cart');
    } else {
      if (!isLoggedIn) {
        navigate(`/login?redirect=/product/${product.id}`);
        return;
      }
      addToCart({
        id: product.id,
        name: product.name,
        material: product.material,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
  };

  const handleDirectCheckout = () => {
    if (!product) return;
    if (!isLoggedIn) {
      navigate(`/login?redirect=/product/${product.id}`);
      return;
    }
    setDirectCheckoutItem({
      id: product.id,
      name: product.name,
      material: product.material,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    navigate('/cart?direct=true');
  };

  const handleWishlistToggle = () => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      material: product.material,
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory,
      dimensions: product.dimensions,
      rating: product.rating,
      reviewCount: product.reviewCount,
      badge: product.badge,
      isCustomizable: product.isCustomizable,
      stock: product.stock,
    });
  };

  const handleCustomizeClick = () => {
    navigate(`/dashboard#custom-order-form`);
  };

  return (
    <div className="relative min-h-screen text-[#2C241D] flex flex-col selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Background Image Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* Floating Header (Public Navbar for Guests, Dashboard Header for Logged-In Users) */}
      <div className="relative z-20">
        {isLoggedIn ? (
          <Header cartCount={cartIds.length} wishlistCount={wishlistIds.length} />
        ) : (
          <div className="pt-4 px-4 max-w-7xl mx-auto">
            <HeaderNav />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 space-y-3 pt-1">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to={isLoggedIn ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ultra-glass-pill text-[11px] font-black text-[#1A1410] hover:bg-white/90 transition-all shadow-sm group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Furniture Catalog</span>
          </Link>

          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#5C4E42] ultra-glass-pill px-3 py-1.5 rounded-xl">
            <span>Catalog</span>
            <ChevronRight className="w-3 h-3" />
            <span className="capitalize">{product.category.replace('-', ' ')}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#38A132] font-black">{product.name}</span>
          </div>
        </div>

        {/* Product Details Master Glass Card */}
        <div className="ultra-glass-panel rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
          {/* Glossy Top Reflection Sheen */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative z-10">
            
            {/* LEFT COLUMN: Product Image, Inline Guarantees & Description (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-3">
              {/* Single Display Image */}
              <div className="relative h-[320px] sm:h-[360px] w-full rounded-2xl overflow-hidden border border-white/70 bg-gradient-to-b from-[#FAF7F2] via-[#F4ECE1] to-[#EAE1D5] shadow-md group flex items-center justify-center p-3">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                  onClick={() => product.imageUrl && openImageInNewTab(product.imageUrl)}
                  title="Click to view high-resolution image"
                />
                
                {/* Badge Overlay */}
                {product.badge && !product.badge.toLowerCase().includes('custom') && (
                  <span className="absolute top-3 left-3 ultra-glass-pill text-[#38A132] text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#38A132]" />
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Guarantees Inline Strip (Clean single bar without 3 heavy box cards) */}
              <div className="flex items-center justify-between gap-2 py-2 px-3 bg-white/35 backdrop-blur-md rounded-xl border border-white/50 text-[11px] font-black text-[#2C241D]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#38A132]" />
                  <span>100% Solid Wood</span>
                </div>
                <span className="text-[#A5998D]">•</span>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#38A132]" />
                  <span>Free Delivery</span>
                </div>
                <span className="text-[#A5998D]">•</span>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#38A132]" />
                  <span>5 Yr Warranty</span>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-[#1A1410] uppercase tracking-wider">
                  Detailed Description
                </h4>
                <p className="text-[11px] font-extrabold text-[#4A3E31] leading-relaxed bg-white/30 backdrop-blur-xs p-3 rounded-xl border border-white/40">
                  {product.detailedDescription || `${product.name} is meticulously handcrafted using premium grade timber and artisan techniques. Designed for modern luxury spaces, offering superior durability, structural stability, and timeless aesthetic appeal.`}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Header, Price, Color Options, Specs & Actions (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Category Tag & Product Title */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-black text-[#38A132] bg-[#38A132]/15 border border-[#38A132]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                  {product.material}
                </span>

                <h1 className="text-xl sm:text-2xl font-black text-[#1A1410] tracking-tight leading-tight pt-0.5">
                  {product.name}
                </h1>
                
                <p className="text-[11px] font-black text-[#5C4E42]">
                  Dimensions: <span className="text-[#1A1410] font-black">{product.dimensions}</span>
                </p>
              </div>

              {/* Price Row (Clean borderless layout) */}
              <div className="flex items-center justify-between py-2 border-y border-white/50">
                <div>
                  <span className="text-[10px] font-black text-[#5C4E42] block uppercase tracking-wider">Store Price</span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-black text-[#38A132] tracking-tight">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-[#7A6C5E] line-through font-extrabold">
                        MSRP ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {product.originalPrice && (
                  <span className="px-3 py-1 bg-[#38A132] text-white text-[11px] font-black rounded-lg shadow-xs">
                    Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Available Color Swatches Selector */}
              {availableColorsList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#1A1410] uppercase tracking-wider">
                      Finish & Color Options
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {availableColorsList.map((colName) => {
                      const colorStyle = getColorHex(colName);
                      const isSelected = (selectedColor || product.color) === colName;
                      return (
                        <button
                          key={colName}
                          type="button"
                          onClick={() => setSelectedColor(colName)}
                          className={`group/swatch relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/90 border-[#38A132] ring-2 ring-[#38A132]/30 shadow-xs'
                              : 'bg-white/40 border-white/60 hover:border-[#38A132]/50 hover:bg-white/70'
                          }`}
                          title={colName}
                        >
                          <span
                            className="w-4 h-4 rounded-full border shadow-xs transition-transform group-hover/swatch:scale-110 flex items-center justify-center"
                            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                          >
                            {isSelected && (
                              <Check className={`w-2.5 h-2.5 ${colorStyle.isDark ? 'text-white' : 'text-[#1A1410]'}`} />
                            )}
                          </span>
                          <span className={`text-[11px] font-black ${isSelected ? 'text-[#1A1410]' : 'text-[#5C4E42]'}`}>
                            {colName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Craft Specs Grid (Clean 2-column layout) */}
              <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-white/50 text-xs">
                <div>
                  <span className="text-[10px] font-black text-[#5C4E42] block uppercase tracking-wider">Primary Material</span>
                  <span className="font-black text-[#1A1410] text-[11px]">{product.material}</span>
                </div>

                <div>
                  <span className="text-[10px] font-black text-[#5C4E42] block uppercase tracking-wider">Warranty Protection</span>
                  <span className="font-black text-[#38A132] text-[11px]">{product.warrantyInfo || '5 Years Warranty'}</span>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-1">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleCartToggle}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer bg-[#38A132] hover:bg-[#32922D] text-white shadow-[#38A132]/30"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isInCart ? 'View Shopping Cart' : 'Add to Cart'}</span>
                  </button>

                  <button
                    onClick={handleDirectCheckout}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-600/30 border border-amber-500/40"
                    title="Buy now and proceed directly to instant payment checkout"
                  >
                    <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>Direct Checkout</span>
                  </button>

                  {isLoggedIn && (
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 rounded-xl transition-all cursor-pointer shadow-xs ${
                        isWishlisted
                          ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30'
                          : 'ultra-glass-pill text-[#1A1410] hover:bg-white/90'
                      }`}
                      title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews & Feedback Panel (Verified Purchases Only) */}
        <ProductReviewsSection product={product} />
      </main>
    </div>
  );
};

/* Verified Customer Reviews Component */
const ProductReviewsSection: React.FC<{ product: RecommendationProduct }> = ({ product }) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [userPurchased, setUserPurchased] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const userEmail = currentUser?.email || '';
  const userName = currentUser?.full_name || currentUser?.name || 'Verified Customer';

  useEffect(() => {
    const revs = getProductReviews(product.id);
    setReviews(revs);
    const purchased = hasUserPurchasedProduct(product.id, userEmail);
    setUserPurchased(purchased);
  }, [product.id, userEmail]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!feedback.trim()) {
      setErrorMsg('Please write your review feedback before submitting.');
      return;
    }

    if (!userPurchased) {
      setErrorMsg('Reviews and feedback can only be submitted for items you have purchased.');
      return;
    }

    setSubmitting(true);
    try {
      const newRev = await submitProductReview({
        productId: product.id,
        rating,
        feedback,
        userEmail: userEmail || 'customer@retailsphere.ai',
        userName,
      });

      setReviews(getProductReviews(product.id));
      setSuccessMsg('Thank you! Your verified purchase review has been published.');
      setFeedback('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : product.rating || '4.9';

  return (
    <div className="ultra-glass-panel rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Reviews Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-[#1A1410]">Verified Customer Reviews & Feedback</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified Buyers Only
            </span>
          </div>
          <p className="text-xs font-bold text-[#6E6458] mt-0.5">
            Real feedback from customers who have purchased {product.name}
          </p>
        </div>

        {/* Rating Summary Card */}
        <div className="flex items-center gap-3 bg-white/60 p-3 rounded-2xl border border-white/70 shadow-xs">
          <div className="text-2xl font-black text-[#1A1410]">{avgRating}</div>
          <div>
            <div className="flex items-center gap-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-3.5 h-3.5 ${star <= Math.round(Number(avgRating)) ? 'fill-amber-500' : 'text-stone-300'}`} />
              ))}
            </div>
            <span className="text-[10px] font-extrabold text-[#7A6C5E] block">
              Based on {reviews.length} verified review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Review Submission Form / Purchase Restriction Notice */}
      <div className="bg-white/80 rounded-2xl p-4 border border-[#E2D7CB] shadow-xs">
        {userPurchased ? (
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-[#38A132] flex items-center gap-1.5 bg-[#38A132]/10 px-3 py-1 rounded-xl border border-[#38A132]/20">
                <CheckCircle2 className="w-4 h-4 text-[#38A132]" />
                Verified Buyer ({userName}) — You are eligible to review this item
              </span>

              {/* Star Rating Selector */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#6E6458] mr-1">Your Rating:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star className={`w-5 h-5 ${s <= rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={`Write your honest feedback on ${product.name} (comfort, material quality, packaging, delivery)...`}
              rows={3}
              className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#1A1410] placeholder-[#8A7E72] focus:outline-none focus:bg-white focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 transition-all"
            />

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs font-bold text-[#38A132] bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {successMsg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? 'Publishing Review...' : 'Submit Verified Review'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-black text-amber-950 block">Verified Purchase Restriction</span>
              Reviews and ratings can only be submitted for items you have purchased. Buy this item to unlock review submission!
            </div>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black text-[#1A1410] uppercase tracking-wider">
          Customer Feedback ({reviews.length})
        </h4>

        {reviews.length === 0 ? (
          <p className="text-xs font-bold text-[#8A7E72] italic bg-white/40 p-4 rounded-xl border border-white/60 text-center">
            No reviews yet for this product. Be the first verified buyer to leave feedback!
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white/80 rounded-2xl p-4 border border-[#E2D7CB] shadow-xs space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#48A63E] text-white text-xs font-black flex items-center justify-center">
                      {rev.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-[#1A1410] block leading-tight">{rev.userName}</span>
                      <span className="text-[10px] font-black text-[#38A132] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#38A132]" /> Verified Purchase
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-[#8A7E72]">{rev.createdAt}</span>
                  </div>
                </div>

                <p className="text-xs font-bold text-[#4A3E31] leading-relaxed pl-1 pt-1">
                  "{rev.feedback}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
