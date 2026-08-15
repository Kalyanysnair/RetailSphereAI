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
  Check
} from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';
import { Header } from '../dashboard/Header';
import { HeaderNav } from '../landing/HeaderNav';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';

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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pt-4">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            to={isLoggedIn ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl ultra-glass-pill text-xs font-black text-[#1A1410] hover:bg-white/90 transition-all shadow-md group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Furniture Catalog</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-black text-[#5C4E42] ultra-glass-pill px-4 py-2 rounded-2xl">
            <span>Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="capitalize">{product.category.replace('-', ' ')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#38A132] font-black">{product.name}</span>
          </div>
        </div>

        {/* Product Details Master Glass Card */}
        <div className="ultra-glass-panel rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Product Image, Guarantees, Specs & Detailed Description (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {/* Single Large Display Image */}
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border-2 border-white/80 bg-[#EAE1D5] shadow-xl group">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Badge Overlay */}
                {product.badge && !product.badge.toLowerCase().includes('custom') && (
                  <span className="absolute top-4 left-4 ultra-glass-pill text-[#38A132] text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#38A132]" />
                    {product.badge}
                  </span>
                )}

                {/* Stock Status Badge */}
                <span className="absolute top-4 right-4 bg-[#38A132] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {product.status}
                </span>
              </div>

              {/* Guarantees Strip */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 ultra-glass-card rounded-2xl text-center space-y-1 border border-white/80 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-black text-[#1A1410]">100% Solid Wood</span>
                  <span className="block text-[10px] font-extrabold text-[#5C4E42]">Authentic Timber</span>
                </div>

                <div className="p-3.5 ultra-glass-card rounded-2xl text-center space-y-1 border border-white/80 shadow-sm">
                  <Truck className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-black text-[#1A1410]">Free Delivery</span>
                  <span className="block text-[10px] font-extrabold text-[#5C4E42]">Orders above ₹50,000</span>
                </div>

                <div className="p-3.5 ultra-glass-card rounded-2xl text-center space-y-1 border border-white/80 shadow-sm">
                  <Award className="w-5 h-5 text-[#38A132] mx-auto" />
                  <span className="block text-[11px] font-black text-[#1A1410]">Certified Quality</span>
                  <span className="block text-[10px] font-extrabold text-[#5C4E42]">Artisan Inspected</span>
                </div>
              </div>

              {/* Detailed Description (Moved to Left Column to eliminate empty space) */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-[#1A1410] uppercase tracking-wider">
                  Detailed Description
                </h4>
                <p className="text-xs font-extrabold text-[#4A3E31] leading-relaxed ultra-glass-card p-5 rounded-2xl border-2 border-white/80 shadow-sm">
                  {product.detailedDescription || `${product.name} is meticulously handcrafted using premium grade timber and artisan techniques. Designed for modern luxury spaces, offering superior durability, structural stability, and timeless aesthetic appeal.`}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Info, Price, Color Selector, Specs & Actions (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Category Tag */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono font-black text-[#38A132] bg-[#38A132]/15 border border-[#38A132]/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    {product.material}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-[#1A1410] tracking-tight leading-tight">
                  {product.name}
                </h1>
                
                <p className="text-xs font-black text-[#5C4E42]">
                  Dimensions: <span className="text-[#1A1410] font-black">{product.dimensions}</span>
                </p>
              </div>

              {/* Price Banner */}
              <div className="p-5 rounded-3xl ultra-glass-card border-2 border-white/80 flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs font-black text-[#5C4E42] block uppercase tracking-wider">Store Price</span>
                  <div className="text-3xl font-black text-[#38A132] tracking-tight">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                  {product.originalPrice && (
                    <div className="text-xs text-[#7A6C5E] line-through font-extrabold">
                      MSRP: ₹{product.originalPrice.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {product.originalPrice && (
                  <span className="px-3.5 py-1.5 bg-[#38A132] text-white text-xs font-black rounded-2xl shadow-md">
                    Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Available Color Swatches Selector */}
              {availableColorsList.length > 0 && (
                <div className="ultra-glass-card p-5 rounded-3xl border-2 border-white/80 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/40 pb-2">
                    <span className="text-xs font-black text-[#1A1410] uppercase tracking-wider">
                      Available Finish & Color Options
                    </span>
                    <span className="text-xs font-black text-[#38A132] bg-[#38A132]/15 border border-[#38A132]/30 px-3 py-0.5 rounded-full">
                      {selectedColor || product.color}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    {availableColorsList.map((colName) => {
                      const colorStyle = getColorHex(colName);
                      const isSelected = (selectedColor || product.color) === colName;
                      return (
                        <button
                          key={colName}
                          type="button"
                          onClick={() => setSelectedColor(colName)}
                          className={`group/swatch relative flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/90 border-[#38A132] ring-2 ring-[#38A132]/40 shadow-md scale-105'
                              : 'bg-white/50 border-white/80 hover:border-[#38A132]/60 hover:bg-white/80'
                          }`}
                          title={colName}
                        >
                          <span
                            className="w-5 h-5 rounded-full border-2 shadow-xs transition-transform group-hover/swatch:scale-110 flex items-center justify-center"
                            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                          >
                            {isSelected && (
                              <Check className={`w-3 h-3 ${colorStyle.isDark ? 'text-white' : 'text-[#1A1410]'}`} />
                            )}
                          </span>
                          <span className={`text-xs font-black ${isSelected ? 'text-[#1A1410]' : 'text-[#5C4E42]'}`}>
                            {colName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Specs Grid */}
              <div className="ultra-glass-card p-5 rounded-3xl border-2 border-white/80 space-y-3 shadow-md">
                <h4 className="text-xs font-black text-[#1A1410] uppercase tracking-wider border-b border-white/40 pb-2">
                  Furniture Specs & Craft Details
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-black text-[#5C4E42] block">Primary Material</span>
                    <span className="font-black text-[#1A1410]">{product.material}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-black text-[#5C4E42] block">Color / Finish</span>
                    <span className="font-black text-[#38A132]">{selectedColor || product.color || 'Natural Finish'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-black text-[#5C4E42] block">Warranty Protection</span>
                    <span className="font-black text-[#38A132]">{product.warrantyInfo || '5 Years Warranty'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-black text-[#5C4E42] block">In-Stock Availability</span>
                    <span className="font-black text-[#1A1410]">{product.stock} Units Ready</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCartToggle}
                    className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
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
                    className={`p-4 rounded-2xl transition-all cursor-pointer shadow-md ${
                      isWishlisted
                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30'
                        : 'ultra-glass-pill text-[#1A1410] hover:bg-white/90'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;
