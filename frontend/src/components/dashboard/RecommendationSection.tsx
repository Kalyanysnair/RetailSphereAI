import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Eye, Sparkles, Check } from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';

interface RecommendationSectionProps {
  products: RecommendationProduct[];
  onAddToCart?: (product: RecommendationProduct) => void;
  onToggleWishlist?: (productId: string) => void;
  onCustomizeProduct?: (product: RecommendationProduct) => void;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  products,
  onAddToCart,
  onToggleWishlist,
  onCustomizeProduct,
}) => {
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    getWishlistItems().map((item) => item.id)
  );
  const [cartIds, setCartIds] = useState<string[]>(() =>
    getCartItems().map((item) => item.id)
  );
  const [quickViewProduct, setQuickViewProduct] = useState<RecommendationProduct | null>(null);

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
    onAddToCart?.(product);
  };

  // Mock AI Match score calculations for visual richness
  const getAiMatchScore = (idx: number) => {
    const scores = [98, 96, 95, 94, 92, 91, 89, 88, 87, 85];
    return scores[idx % scores.length];
  };

  return (
    <div className="space-y-4">
      {/* Product-First Clean Section Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1814] tracking-tight">
          Featured Furniture Collection
        </h2>
        <span className="text-xs font-bold text-[#6E6458]">
          {products.length} Designs Available
        </span>
      </div>

      {/* 4-Column Product Grid (Immediately Showcase 8+ Products) */}
      {products.length === 0 ? (
        <div className="bg-white/90 border border-[#E6DDD3] rounded-3xl p-12 text-center text-[#6B5C4D] space-y-3 shadow-md backdrop-blur-xl">
          <p className="text-base font-bold text-[#2C241D]">No furniture designs match your active filter.</p>
          <p className="text-xs font-medium">Try selecting another category or reset filters to browse the collection.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('reset-dashboard-filters'))}
            className="mt-2 px-5 py-2 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all shadow-sm cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product, idx) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const isCartAdded = cartIds.includes(product.id);
            const aiScore = getAiMatchScore(idx);

            return (
              <div
                key={product.id}
                className="group relative bg-white border-2 border-[#D6C9B9] hover:border-[#48A63E] rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                {/* Image Container (70% height aspect ratio) */}
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4ECE1] cursor-pointer"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* AI Match Badge */}
                  <span className="absolute top-2.5 left-2.5 bg-[#1A1410] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3 text-[#48A63E]" />
                    <span>{aiScore}% AI Match</span>
                  </span>

                  {/* Wishlist Button */}
                  {isLoggedIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistClick(product);
                      }}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${
                        isWishlisted
                          ? 'bg-rose-600 text-white shadow-rose-600/30'
                          : 'bg-white/95 text-[#1A1410] hover:text-[#48A63E] border border-[#D6C9B9]'
                      }`}
                      title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
                    </button>
                  )}

                  {/* Quick View Button on Hover */}
                  <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickViewProduct(product);
                      }}
                      className="w-full py-2 bg-white hover:bg-[#FAF7F2] text-[#1A1410] font-extrabold text-xs rounded-xl shadow-lg border border-[#D6C9B9] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span>Quick View</span>
                    </button>
                  </div>
                </div>

                {/* Content Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2 bg-white">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[#6B5C4D] mb-1">
                      <span className="uppercase tracking-wider text-[#48A63E] font-mono">{product.category || 'Luxury'}</span>
                      <span className="bg-[#FAF7F2] border border-[#D6C9B9] px-2 py-0.5 rounded-md text-[#1A1410]">{product.material}</span>
                    </div>

                    <h3
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="text-xs sm:text-sm font-extrabold text-[#1A1410] tracking-tight line-clamp-1 group-hover:text-[#48A63E] transition-colors cursor-pointer"
                    >
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-[#7A6C5E]">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{product.rating}</span>
                      <span className="text-[#9E9082]">({product.reviewCount || 12})</span>
                    </div>
                  </div>

                  {/* Pricing & Add to Cart Action */}
                  <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between gap-1">
                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-[#2C241D] tracking-tight">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>

                      {product.originalPrice && (
                        <div className="text-[10px] text-[#9E9082] line-through -mt-1 font-semibold">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCartClick(product)}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold bg-[#48A63E] hover:bg-[#3D9134] text-white shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isCartAdded ? 'In Cart' : 'Add'}</span>
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
              <button onClick={() => setQuickViewProduct(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                ✕
              </button>
            </div>
            
            <img src={quickViewProduct.imageUrl} alt={quickViewProduct.name} className="w-full h-48 object-cover rounded-2xl border border-[#E2D7CB]" />
            
            <div className="space-y-1 text-xs text-[#7A6C5E] font-medium">
              <p><strong>Dimensions:</strong> {quickViewProduct.dimensions}</p>
              <p><strong>Material:</strong> {quickViewProduct.material}</p>
              <p className="text-base font-extrabold text-[#2C241D] pt-2">₹{quickViewProduct.price.toLocaleString('en-IN')}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleCartClick(quickViewProduct);
                  setQuickViewProduct(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>
              <button
                onClick={() => {
                  setQuickViewProduct(null);
                  navigate(`/product/${quickViewProduct.id}`);
                }}
                className="px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs hover:bg-[#EFECE8]"
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
