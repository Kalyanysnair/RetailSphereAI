import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Award,
  ChevronRight,
  Package,
  Sparkles,
  Check,
  ShoppingBag,
  Heart,
  Sliders,
  ArrowUpRight,
} from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { HeaderNav } from '../landing/HeaderNav';
import { Header as CustomerDashboardHeader } from '../dashboard/Header';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';
import { openImageInNewTab } from '../../utils/imageUtils';
import { addToCart, getCartItems, getCartCount } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist, getWishlistCount } from '../../utils/wishlistStorage';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<RecommendationProduct | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [availableColorsList, setAvailableColorsList] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState<number>(() => getWishlistCount());
  const [cartIds, setCartIds] = useState<string[]>(() => getCartItems().map((it) => it.id));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlistItems().map((it) => it.id));

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(
      typeof localStorage !== 'undefined' &&
      (localStorage.getItem('access_token') || localStorage.getItem('user'))
    );
  });

  useEffect(() => {
    const syncStorage = () => {
      setCartCount(getCartCount());
      setWishlistCount(getWishlistCount());
      setCartIds(getCartItems().map((it) => it.id));
      setWishlistIds(getWishlistItems().map((it) => it.id));
      setIsLoggedIn(Boolean(localStorage.getItem('access_token') || localStorage.getItem('user')));
    };

    window.addEventListener('storage', syncStorage);
    window.addEventListener('cart-updated', syncStorage);
    window.addEventListener('wishlist-updated', syncStorage);
    window.addEventListener('user-logged-in', syncStorage);
    window.addEventListener('user-logout', syncStorage);

    return () => {
      window.removeEventListener('storage', syncStorage);
      window.removeEventListener('cart-updated', syncStorage);
      window.removeEventListener('wishlist-updated', syncStorage);
      window.removeEventListener('user-logged-in', syncStorage);
      window.removeEventListener('user-logout', syncStorage);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadProduct = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const match = dbItems.find(
            (p: any) => String(p.id) === String(id) || String(p.product_id) === String(id) || p.sku === id
          );
          const target = match || dbItems[0];
          const rawId = target.product_id || target.id;
          const code =
            target.productCode ||
            target.sku ||
            `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;

          const rawColors =
            target.available_colors ||
            target.availableColors ||
            target.color ||
            'Emerald Green, Warm Beige, Charcoal Black';
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
            originalPrice:
              (typeof target.price === 'number' ? target.price : parseFloat(target.price) || 0) * 1.15,
            stock: target.stockCount || 10,
            salesCount: 45,
            status: (target.status || 'In Stock') as any,
            imageUrl:
              target.image_url ||
              target.image ||
              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
            rating: 4.9,
            reviewCount: 38,
            material: target.material || 'Solid Teak Wood',
            color: target.color || 'Natural Wood',
            dimensions: target.dimensions || '200cm x 90cm x 75cm',
            isCustomizable: true,
            isTopPick: target.stockCount > 0,
            badge: code,
            detailedDescription: target.description || target.detailedDescription,
          });
        }
      } catch (err) {
        console.warn('Error loading product detail from DB:', err);
      }
    };
    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (cartIds.includes(product.id)) {
      navigate('/cart');
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      material: product.material,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    setCartIds(getCartItems().map((it) => it.id));
    setCartCount(getCartCount());
  };

  const handleToggleWishlist = () => {
    if (!product) return;
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
    setWishlistIds(getWishlistItems().map((it) => it.id));
    setWishlistCount(getWishlistCount());
  };

  if (!product) {
    return (
      <div className="relative min-h-screen text-[#1C1814] flex items-center justify-center p-6 bg-[#FAF8F5] overflow-x-hidden font-sans">
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5] via-[#F1EDE6] to-[#E6E0D5] pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-[#E2D7CB] shadow-sm">
          <Package className="w-12 h-12 text-[#38A132] mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-[#1C1814]">Loading Product Details...</h2>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlistIds.includes(product.id);
  const isCartAdded = cartIds.includes(product.id);

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

      {/* Header: Authenticated Dashboard Header for logged-in users, otherwise Public Landing Header */}
      <div className="relative z-20">
        {isLoggedIn ? (
          <CustomerDashboardHeader
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            activeTab="shop"
            onSelectTab={(tab) => navigate(`/dashboard?tab=${tab}`)}
            onOpenCustomOrder={() => navigate('/dashboard#custom-order-form')}
          />
        ) : (
          <HeaderNav />
        )}
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4 pt-4">
        {/* Breadcrumb & Back Link */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to={isLoggedIn ? "/dashboard#shop" : "/#shop"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ultra-glass-pill text-xs font-black text-[#1A1410] hover:bg-white/90 transition-all shadow-sm group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
            <span>{isLoggedIn ? "Back to Dashboard" : "Back to Furniture Catalog"}</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs font-black text-[#5C4E42] ultra-glass-pill px-4 py-2 rounded-xl">
            <span>{isLoggedIn ? "Store" : "Catalog"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="capitalize">{product.category.replace('-', ' ')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#38A132] font-black">{product.name}</span>
          </div>
        </div>

        {/* Product Details Master Glass Card */}
        <div className="ultra-glass-panel rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          {/* Glossy Top Reflection Sheen */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2rem]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            {/* LEFT COLUMN: Product Image & Guarantees (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Single Display Image */}
              <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-white/70 bg-gradient-to-b from-[#FAF7F2] via-[#F4ECE1] to-[#EAE1D5] shadow-md group flex items-center justify-center p-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                  onClick={() => product.imageUrl && openImageInNewTab(product.imageUrl)}
                  title="Click to view full image"
                />

                {/* SKU / Badge */}
                {product.badge && (
                  <span className="absolute top-4 left-4 ultra-glass-pill text-[#38A132] text-xs font-black px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#38A132]" />
                    {product.badge}
                  </span>
                )}

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E2D7CB] flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                    isWishlisted ? 'bg-rose-600 text-white border-rose-600' : 'text-[#524538] hover:text-rose-600'
                  }`}
                  title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                </button>
              </div>

              {/* Guarantees Strip */}
              <div className="flex items-center justify-between gap-2 py-2.5 px-4 bg-white/45 backdrop-blur-md rounded-xl border border-white/60 text-xs font-black text-[#2C241D]">
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
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-[#1A1410] uppercase tracking-wider">
                  Detailed Description
                </h4>
                <p className="text-xs font-extrabold text-[#4A3E31] leading-relaxed bg-white/40 backdrop-blur-xs p-4 rounded-2xl border border-white/50">
                  {product.detailedDescription ||
                    `${product.name} is meticulously handcrafted using premium grade timber and artisan joinery techniques. Designed for modern luxury spaces, offering superior durability, structural stability, and timeless aesthetic appeal.`}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Basic Product Details & Specs (Lg: 6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {/* Category & Title */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-black text-[#38A132] bg-[#38A132]/15 border border-[#38A132]/30 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  {product.material}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black text-[#1A1410] tracking-tight leading-tight">
                  {product.name}
                </h1>

                <p className="text-xs font-black text-[#5C4E42]">
                  Dimensions: <span className="text-[#1A1410] font-black">{product.dimensions}</span>
                </p>
              </div>

              {/* Price & Savings */}
              <div className="flex items-center justify-between py-3 border-y border-white/60">
                <div>
                  <span className="text-xs font-black text-[#5C4E42] block uppercase tracking-wider">
                    Store Price
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#38A132] tracking-tight">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-[#7A6C5E] line-through font-extrabold">
                        MSRP ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {product.originalPrice && (
                  <span className="px-3.5 py-1.5 bg-[#38A132] text-white text-xs font-black rounded-xl shadow-xs">
                    Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Finish & Color Options */}
              {availableColorsList.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-black text-[#1A1410] uppercase tracking-wider block">
                    Finish & Color Options
                  </span>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {availableColorsList.map((colName) => {
                      const colorStyle = getColorHex(colName);
                      const isSelected = (selectedColor || product.color) === colName;
                      return (
                        <button
                          key={colName}
                          type="button"
                          onClick={() => setSelectedColor(colName)}
                          className={`group/swatch relative flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/95 border-[#38A132] ring-2 ring-[#38A132]/30 shadow-xs'
                              : 'bg-white/50 border-white/70 hover:border-[#38A132]/50 hover:bg-white/80'
                          }`}
                          title={colName}
                        >
                          <span
                            className="w-4 h-4 rounded-full border shadow-xs transition-transform group-hover/swatch:scale-110 flex items-center justify-center"
                            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                          >
                            {isSelected && (
                              <Check
                                className={`w-2.5 h-2.5 ${colorStyle.isDark ? 'text-white' : 'text-[#1A1410]'}`}
                              />
                            )}
                          </span>
                          <span
                            className={`text-xs font-black ${isSelected ? 'text-[#1A1410]' : 'text-[#5C4E42]'}`}
                          >
                            {colName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Button: Add to Cart */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#38A132]/30 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isCartAdded ? 'Go to Cart' : 'Add to Cart'}</span>
                </button>
              </div>

              {/* Specifications Grid */}
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-black text-[#1A1410] uppercase tracking-wider block">
                  Product Specifications
                </span>
                <div className="grid grid-cols-2 gap-3 p-4 bg-white/40 backdrop-blur-xs rounded-2xl border border-white/50 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                      Primary Material
                    </span>
                    <span className="font-black text-[#1A1410] text-xs mt-0.5 block">{product.material}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                      Warranty Protection
                    </span>
                    <span className="font-black text-[#38A132] text-xs mt-0.5 block">
                      {product.warrantyInfo || '5 Years Warranty'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                      Category
                    </span>
                    <span className="font-black text-[#1A1410] text-xs mt-0.5 block capitalize">
                      {product.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                      Dimensions
                    </span>
                    <span className="font-black text-[#1A1410] text-xs mt-0.5 block">{product.dimensions}</span>
                  </div>
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

