import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Eye, Sparkles, Check, X, RotateCcw, Tag } from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';

interface RecommendationSectionProps {
  products: RecommendationProduct[];
  totalCatalogCount?: number;
  activeSearchQuery?: string;
  onAddToCart?: (product: RecommendationProduct) => void;
  onToggleWishlist?: (productId: string) => void;
  onCustomizeProduct?: (product: RecommendationProduct) => void;
  onResetFilters?: () => void;
  onApplySearch?: (query: string) => void;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  products,
  totalCatalogCount,
  activeSearchQuery,
  onAddToCart,
  onToggleWishlist,
  onCustomizeProduct,
  onResetFilters,
  onApplySearch,
}) => {
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    getWishlistItems().map((item) => item.id)
  );
  const [cartIds, setCartIds] = useState<string[]>(() =>
    getCartItems().map((item) => item.id)
  );
  const [quickViewProduct, setQuickViewProduct] = useState<RecommendationProduct | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const isLoggedIn = Boolean(
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('access_token') || localStorage.getItem('user'))
  );

  useEffect(() => {
    const syncWishlist = () => {
      setWishlistIds(getWishlistItems().map((item) => item.id));
    };
    const syncCart = () => {
      setCartIds(getCartItems().map((item) => item.id));
    };

    syncWishlist();
    syncCart();

    window.addEventListener('wishlist-updated', syncWishlist);
    window.addEventListener('cart-updated', syncCart);
    window.addEventListener('storage', syncWishlist);
    window.addEventListener('storage', syncCart);

    return () => {
      window.removeEventListener('wishlist-updated', syncWishlist);
      window.removeEventListener('cart-updated', syncCart);
      window.removeEventListener('storage', syncWishlist);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const handleWishlistClick = (product: RecommendationProduct) => {
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
    onToggleWishlist?.(product.id);
  };

  const handleCartClick = (product: RecommendationProduct) => {
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

    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 1800);

    onAddToCart?.(product);
  };

  const handleApplyQuickSearch = (term: string) => {
    if (onApplySearch) {
      onApplySearch(term);
    } else {
      window.dispatchEvent(new CustomEvent('apply-dashboard-search', { detail: term }));
    }
  };

  const handleTriggerReset = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      window.dispatchEvent(new CustomEvent('reset-dashboard-filters'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Product-First Clean Section Header with Live Count */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1814] tracking-tight">
            Featured Furniture Collection
          </h2>
          {products.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5E9] border border-[#48A63E]/20 text-[#48A63E] text-[11px] font-black">
              {products.length} {products.length === 1 ? 'Design' : 'Designs'}
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-[#6E6458]">
          {totalCatalogCount ? `Showing ${products.length} of ${totalCatalogCount} pieces` : `${products.length} Available`}
        </span>
      </div>

      {/* 4-Column Product Grid or Interactive Empty State */}
      {products.length === 0 ? (
        <div className="bg-white/95 border-2 border-dashed border-[#DFD3C4] rounded-3xl p-8 sm:p-12 text-center text-[#6B5C4D] space-y-4 shadow-sm backdrop-blur-xl max-w-2xl mx-auto my-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#48A63E] flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-[#2C241D]">
              No furniture designs match your criteria
            </h3>
            <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
              {activeSearchQuery
                ? `We couldn't find matches for "${activeSearchQuery}". Try another keyword or check out popular suggestions below.`
                : 'Try adjusting your price slider or selecting another category to view handcrafted pieces.'}
            </p>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider">
              Popular Searches:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Teak Dining Table', 'Velvet Lounge Sofa', 'Solid Wood Bed', 'Coffee Table', 'Workstation Desk'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleApplyQuickSearch(chip)}
                  className="px-3 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#E8F5E9] border border-[#D6C9B9] hover:border-[#48A63E] text-xs font-bold text-[#2C241D] hover:text-[#48A63E] transition-all cursor-pointer shadow-xs"
                >
                  🔍 {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTriggerReset}
              className="px-6 py-2.5 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold transition-all shadow-md shadow-[#48A63E]/20 cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters & Show All Furniture</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const isCartAdded = cartIds.includes(product.id);
            const isJustAdded = recentlyAddedId === product.id;
            
            const hasDiscount = Boolean(
              product.originalPrice && product.originalPrice > product.price
            );
            const discountPct = hasDiscount
              ? Math.round((((product.originalPrice! - product.price) / product.originalPrice!) * 100))
              : 0;

            const isLowStock = Boolean(
              product.stock !== undefined && product.stock > 0 && product.stock <= 4
            );

            return (
              <div
                key={product.id}
                className="group relative bg-[#FAF8F5] border border-[#D6C9B9] hover:border-[#48A63E] rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                {/* Image Container */}
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4ECE1] cursor-pointer"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Discount Percentage Badge (Top-Left) */}
                  {hasDiscount && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#48A63E] text-white text-[10px] font-black shadow-md flex items-center gap-1 z-10">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{discountPct}% OFF</span>
                    </div>
                  )}

                  {/* Wishlist Icon Button overlay (Top-Right) */}
                  {isLoggedIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistClick(product);
                      }}
                      className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-md transition-all shadow-2xs flex items-center justify-center z-10 ${
                        isWishlisted
                          ? 'bg-rose-600 text-white shadow-rose-600/30'
                          : 'bg-white/90 text-[#2C241D] hover:text-[#48A63E] border border-[#D6C9B9]'
                      }`}
                      title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
                    </button>
                  )}

                  {/* Quick View Button on Hover (Centered Bottom of Image) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickViewProduct(product);
                    }}
                    className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-[#2C241D] hover:text-[#48A63E] shadow-md border border-[#D6C9B9] flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer z-10"
                    title="Quick View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 bg-[#FAF8F5]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase mb-1 text-[#6E6458]">
                      <span>{product.category ? product.category.replace(/-/g, ' ') : 'CATEGORY'}</span>
                      {Boolean(product.reviewCount && product.reviewCount > 0 && product.rating && product.rating > 0) && (
                        <div className="flex items-center gap-1 font-extrabold text-[#2C241D]">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{product.rating} ({product.reviewCount})</span>
                        </div>
                      )}
                    </div>

                    <h3
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="text-xs sm:text-sm font-extrabold text-[#1C1814] tracking-tight line-clamp-1 group-hover:text-[#48A63E] transition-colors cursor-pointer"
                    >
                      {product.name}
                    </h3>
                    
                    <p className="text-[11px] font-semibold text-[#6E6458] truncate mt-0.5">
                      {product.material || 'Italian Velvet & Teak'}
                    </p>

                    {/* Low Stock Indicator */}
                    {isLowStock && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>Only {product.stock} left in stock</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Add to Cart Action */}
                  <div className="pt-2 border-t border-[#EAE0D4] flex items-center justify-between gap-1">
                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-[#1C1814] tracking-tight">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>
                      {hasDiscount && (
                        <div className="text-[10px] text-[#9E9082] line-through -mt-0.5 font-semibold">
                          ₹{product.originalPrice!.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCartClick(product)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap ${
                        isJustAdded
                          ? 'bg-[#48A63E] ring-2 ring-[#48A63E]/40 animate-pulse'
                          : isCartAdded
                          ? 'bg-[#3D9134] hover:bg-[#327A2B]'
                          : 'bg-[#48A63E] hover:bg-[#3D9134]'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{isCartAdded ? 'Go to Cart' : 'Add to Cart'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#E2D7CB] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[#48A63E] uppercase">{quickViewProduct.category}</span>
                <h3 className="text-lg font-extrabold text-[#2C241D]">{quickViewProduct.name}</h3>
              </div>
              <button onClick={() => setQuickViewProduct(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <img src={quickViewProduct.imageUrl} alt={quickViewProduct.name} className="w-full h-48 object-cover rounded-2xl border border-[#E2D7CB]" />
            
            <div className="space-y-1 text-xs text-[#7A6C5E] font-medium">
              <p><strong>Dimensions:</strong> {quickViewProduct.dimensions}</p>
              <p><strong>Material:</strong> {quickViewProduct.material}</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-base font-extrabold text-[#2C241D]">₹{quickViewProduct.price.toLocaleString('en-IN')}</span>
                {quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price && (
                  <span className="text-xs text-[#9E9082] line-through font-semibold">
                    ₹{quickViewProduct.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleCartClick(quickViewProduct);
                  setQuickViewProduct(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" /> {cartIds.includes(quickViewProduct.id) ? 'Go to Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  setQuickViewProduct(null);
                  navigate(`/product/${quickViewProduct.id}`);
                }}
                className="px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs hover:bg-[#EFECE8] cursor-pointer"
              >
                Full Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
