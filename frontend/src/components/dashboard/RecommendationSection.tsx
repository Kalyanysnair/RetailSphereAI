import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Sliders } from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';


interface RecommendationSectionProps {
  products: RecommendationProduct[];
  onAddToCart?: (product: RecommendationProduct) => void;
  onToggleWishlist?: (productId: string) => void;
  onCustomizeProduct?: (product: RecommendationProduct) => void;
}

export const RECOMMENDATIONS_DATA: RecommendationProduct[] = [];

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

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
            Recommended Furniture For You
          </h2>
          <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
            Luxury designs tailored to your home preference & custom request.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-xs font-bold text-[#2C241D] bg-white/90 border border-[#E6DDD3] px-3 py-1 rounded-xl shadow-sm">
          {products.length} Designs Found
        </span>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="bg-white/90 border border-[#E6DDD3] rounded-3xl p-12 text-center text-[#6B5C4D] space-y-3 shadow-md backdrop-blur-xl">
          <p className="text-base font-bold text-[#2C241D]">No furniture designs match your active filters.</p>
          <p className="text-xs font-medium">Try selecting another category or click below to view all designs.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('reset-dashboard-filters'))}
            className="mt-2 px-5 py-2 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all shadow-sm cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const isCartAdded = cartIds.includes(product.id);

            return (
              <div
                key={product.id}
                className="group relative bg-[#FAF7F2] border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                {/* Product Image Container */}
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4ECE1] cursor-pointer"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

                  {/* Badge */}
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-[#48A63E] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-md border border-white/20">
                      {product.badge}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlistClick(product);
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all shadow-sm ${
                      isWishlisted
                        ? 'bg-rose-600 text-white shadow-rose-600/30'
                        : 'bg-[#FAF7F2]/90 text-[#2C241D] hover:text-[#48A63E] hover:bg-white border border-[#E2D7CB]'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
                  </button>

                  {/* Rating Badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-[#FAF7F2]/95 backdrop-blur-md px-2.5 py-0.5 rounded-xl text-xs font-extrabold text-[#2C241D] shadow-sm border border-[#E2D7CB]">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{product.rating}</span>
                    <span className="text-[10px] text-[#7A6C5E] font-medium">({product.reviewCount})</span>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5 gap-1">
                      <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">
                        {product.productCode || (product.badge && product.badge.startsWith('SKU') ? product.badge : `SKU-RS-${product.id}`)}
                      </span>
                      <span className="font-extrabold text-[#7A6C5E] bg-[#F4ECE1] px-2 py-0.5 rounded-md border border-[#E2D7CB] text-[10px]">
                        {product.material}
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="text-sm font-extrabold text-[#2C241D] tracking-tight line-clamp-1 group-hover:text-[#48A63E] transition-colors cursor-pointer"
                    >
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-[#7A6C5E] mt-1 font-semibold">
                      Dimensions: {product.dimensions}
                    </p>
                  </div>

                  {/* Pricing & Add to Cart Action */}
                  <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                    <div>
                      <div className="text-lg font-extrabold text-[#2C241D] tracking-tight">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>

                      {product.originalPrice && (
                        <div className="text-[11px] text-[#9E9082] line-through -mt-1 font-semibold">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCartClick(product)}
                      className="px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-[#48A63E] hover:bg-[#3D9134] text-white shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isCartAdded ? (
                        <>
                          <ShoppingBag className="w-4 h-4" /> Go to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" /> Add to Cart
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
    </div>


  );
};
