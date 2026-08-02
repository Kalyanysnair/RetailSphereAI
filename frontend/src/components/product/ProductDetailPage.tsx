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
  Sparkles
} from 'lucide-react';
import { RECOMMENDATIONS_DATA } from '../dashboard/RecommendationSection';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';
import { Header } from '../dashboard/Header';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<RecommendationProduct | null>(null);
  const [cartIds, setCartIds] = useState<string[]>(() => getCartItems().map(i => i.id));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlistItems().map(i => i.id));
  const [dbReviews, setDbReviews] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const found = RECOMMENDATIONS_DATA.find(p => p.id === id) || RECOMMENDATIONS_DATA[0];
    setProduct(found);
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
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
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

  const isInCart = cartIds.includes(product.id);
  const isWishlisted = wishlistIds.includes(product.id);

  const handleCartToggle = () => {
    if (isInCart) {
      navigate('/cart');
    } else {
      addToCart({
        id: product.id,
        name: product.name,
        material: product.material,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
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
    <div className="relative min-h-screen text-[#2C241D] flex flex-col selection:bg-[#48A63E] selection:text-white bg-[#FAF7F2]">
      {/* Background Image Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105 opacity-15"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/60 via-[#F3EDE5]/40 to-[#EAE1D5]/60 pointer-events-none" />

      {/* Floating Header */}
      <div className="relative z-20">
        <Header cartCount={cartIds.length} wishlistCount={wishlistIds.length} />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pt-4">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 border border-[#E2D7CB] text-xs font-extrabold text-[#2C241D] hover:bg-[#F3EDE5] hover:border-[#48A63E] transition-all shadow-sm group"
          >
            <ArrowLeft className="w-4 h-4 text-[#48A63E] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Furniture Catalog</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-[#7A6C5E] bg-white/70 px-3.5 py-1.5 rounded-xl border border-[#EFE7DE]">
            <span>Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="capitalize">{product.category.replace('-', ' ')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#38A132] font-extrabold">{product.name}</span>
          </div>
        </div>

        {/* Product Details Section Card */}
        <div className="ultra-glass-panel rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-[#E2D7CB] shadow-xl bg-white/85 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Single High-Res Product Image (Lg: 7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Single Large Display Image */}
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border-2 border-[#E2D7CB] bg-[#F4ECE1] shadow-lg group">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Badge Overlay */}
                {product.badge && !product.badge.toLowerCase().includes('custom') && (
                  <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#38A132] text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-md border border-[#38A132]/30 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#38A132]" />
                    {product.badge}
                  </span>
                )}

                {/* Stock Status Badge */}
                <span className="absolute top-4 right-4 bg-[#38A132] text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {product.status}
                </span>
              </div>

              {/* Guarantees Strip */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#EFE7DE]">
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-center space-y-1">
                  <ShieldCheck className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-extrabold text-[#2C241D]">100% Solid Wood</span>
                  <span className="block text-[10px] font-medium text-[#7A6C5E]">Authentic Timber</span>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-center space-y-1">
                  <Truck className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-extrabold text-[#2C241D]">Free Delivery</span>
                  <span className="block text-[10px] font-medium text-[#7A6C5E]">Orders above ₹50,000</span>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-center space-y-1">
                  <Award className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-extrabold text-[#2C241D]">Certified Quality</span>
                  <span className="block text-[10px] font-medium text-[#7A6C5E]">Artisan Inspected</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Specs, Price, Description & Actions (Lg: 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Category Tag & Rating */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono font-extrabold text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    {product.material}
                  </span>

                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-extrabold text-[#2C241D]">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{product.rating}</span>
                    <span className="text-[#7A6C5E] font-bold">({product.reviewCount} Reviews)</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight leading-tight">
                  {product.name}
                </h1>
                
                <p className="text-xs font-bold text-[#6B5C4D]">
                  Dimensions: <span className="text-[#2C241D] font-extrabold">{product.dimensions}</span>
                </p>
              </div>

              {/* Price Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#FAF7F2] to-[#F3EDE5] border-2 border-[#E2D7CB] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-[#7A6C5E] block uppercase tracking-wider">Store Price</span>
                  <div className="text-3xl font-extrabold text-[#38A132] tracking-tight">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                  {product.originalPrice && (
                    <div className="text-xs text-[#9E9082] line-through font-semibold">
                      MSRP: ₹{product.originalPrice.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {product.originalPrice && (
                  <span className="px-3.5 py-1.5 bg-[#38A132] text-white text-xs font-extrabold rounded-2xl shadow-sm">
                    Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Quick Specs Grid */}
              <div className="bg-white p-5 rounded-3xl border border-[#E2D7CB] space-y-3 shadow-xs">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider border-b border-[#EFE7DE] pb-2">
                  Furniture Specs & Craft Details
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-[#7A6C5E] block">Primary Material</span>
                    <span className="font-extrabold text-[#2C241D]">{product.material}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#7A6C5E] block">Warranty Protection</span>
                    <span className="font-extrabold text-[#38A132]">{product.warrantyInfo || '5 Years Warranty'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#7A6C5E] block">Product Type</span>
                    <span className="font-extrabold text-[#2C241D]">Premium Readymade</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#7A6C5E] block">In-Stock Availability</span>
                    <span className="font-extrabold text-[#2C241D]">{product.stock} Units Ready</span>
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">
                  Detailed Description
                </h4>
                <p className="text-xs font-medium text-[#5C4A3A] leading-relaxed bg-white/70 p-4 rounded-2xl border border-[#E2D7CB]">
                  {product.detailedDescription || `${product.name} is meticulously handcrafted using premium grade timber and artisan techniques. Designed for modern luxury spaces, offering superior durability, structural stability, and timeless aesthetic appeal.`}
                </p>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCartToggle}
                    className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                      isInCart
                        ? 'bg-[#38A132] hover:bg-[#32922D] text-white shadow-[#38A132]/30'
                        : 'bg-[#38A132] hover:bg-[#32922D] text-white shadow-[#38A132]/30'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isInCart ? 'Go to Shopping Cart' : 'Add to Cart'}</span>
                  </button>

                  <button
                    onClick={handleWishlistToggle}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                      isWishlisted
                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30'
                        : 'bg-white border-[#E2D7CB] text-[#2C241D] hover:bg-[#FAF7F2]'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section - SHOWN ONLY IF FETCHED FROM DB */}
          {dbReviews.length > 0 && (
            <div className="border-t border-[#E2D7CB] pt-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-[#2C241D]">Verified Buyer Reviews & Feedback</h3>
                  <p className="text-xs text-[#7A6C5E]">Authentic customer reviews for {product.name}</p>
                </div>

                <div className="flex items-center gap-2 bg-[#38A132]/10 border border-[#38A132]/30 px-3.5 py-1.5 rounded-2xl">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="text-xs font-extrabold text-[#2C241D]">{product.rating} / 5.0 Rating</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dbReviews.map((rev: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-[#E2D7CB] space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-500">{"★".repeat(rev.rating || 5)}</div>
                      <span className="text-[10px] font-bold text-[#7A6C5E]">{rev.date || 'Recent'}</span>
                    </div>
                    <h5 className="font-extrabold text-xs text-[#2C241D]">{rev.title || 'Customer Feedback'}</h5>
                    <p className="text-xs text-[#5C4A3A]">"{rev.comment || rev.feedback}"</p>
                    <span className="text-[11px] font-bold text-[#38A132] block">— {rev.customerName || 'Verified Buyer'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;
