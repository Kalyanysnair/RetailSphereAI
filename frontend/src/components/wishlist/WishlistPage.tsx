import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowLeft, Star, Sliders } from 'lucide-react';
import { Header } from '../dashboard/Header';
import {
  WishlistItem,
  getWishlistItems,
  removeFromWishlist,
  clearWishlist,
} from '../../utils/wishlistStorage';
import { addToCart, getCartItems } from '../../utils/cartStorage';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>(() => getWishlistItems());
  const [cartIds, setCartIds] = useState<string[]>(() =>
    getCartItems().map((item) => item.id)
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      setItems(getWishlistItems());
    };
    const handleCartUpdate = () => {
      setCartIds(getCartItems().map((item) => item.id));
    };

    handleWishlistUpdate();
    handleCartUpdate();

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleWishlistUpdate);
    window.addEventListener('storage', handleCartUpdate);

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleWishlistUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleRemove = (id: string, name: string) => {
    const updated = removeFromWishlist(id);
    setItems(updated);
    showToast(`Removed "${name}" from your wishlist.`);
  };

  const handleAddToCart = (product: WishlistItem) => {
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
    showToast(`Added "${product.name}" to your cart!`);
  };

  const handleAddAllToCart = () => {
    if (items.length === 0) return;
    items.forEach((p) => {
      addToCart({
        id: p.id,
        name: p.name,
        material: p.material,
        price: p.price,
        imageUrl: p.imageUrl,
      });
    });
    showToast('All items added to your cart!');
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
        <Header cartCount={cartIds.length} wishlistCount={items.length} />

        {/* Main Central Semi-Transparent Glass Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pt-3">


          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-5 lg:p-6 pt-3 sm:pt-4 space-y-4 relative overflow-hidden">

            {/* Glossy Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* Notification Toast */}
            {toastMessage && (
              <div className="relative z-20 bg-[#48A63E] text-white text-xs font-extrabold px-4 py-3 rounded-2xl shadow-lg shadow-[#48A63E]/20 text-center animate-fadeIn max-w-md mx-auto">
                {toastMessage}
              </div>
            )}

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
                  <span className="flex items-center gap-2">
                    <Heart className="w-6 h-6 text-rose-600 fill-rose-600/20" />
                    Saved Wishlist
                  </span>
                  <span className="text-xs font-extrabold text-[#2C241D] bg-white/90 border border-[#E6DDD3] px-3 py-1 rounded-full shadow-xs">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </h1>
              </div>

              {items.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddAllToCart}
                    className="px-4 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Move All to Cart
                  </button>
                  <button
                    onClick={() => {
                      clearWishlist();
                      setItems([]);
                      showToast('Wishlist cleared.');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/90 border border-[#E2D7CB] text-rose-600 hover:text-rose-800 text-xs font-bold transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist Items Content */}
            {items.length === 0 ? (
              /* Empty Wishlist State */
              <div className="relative z-10 ultra-glass-card rounded-3xl p-12 text-center space-y-4 shadow-md my-6">
                <div className="w-16 h-16 bg-[#F5ECE1] text-[#9E9082] rounded-full flex items-center justify-center mx-auto border border-[#E2D7CB]">
                  <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20" />
                </div>
                <h2 className="text-xl font-extrabold text-[#2C241D]">Your wishlist is empty</h2>
                <p className="text-xs text-[#6B5C4D] max-w-sm mx-auto font-medium">
                  Save your favorite teak wood furniture, velvet sofas, and decor pieces here to easily find them later!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="py-3 px-6 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold text-xs transition-colors shadow-md shadow-[#48A63E]/20"
                  >
                    Explore Furniture Collection
                  </button>
                </div>
              </div>
            ) : (
              /* Wishlist Grid */
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((product) => {
                  const isCartAdded = cartIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="group relative ultra-glass-card hover:border-[#48A63E]/60 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4ECE1]">
                        <img
                          src={
                            product.imageUrl ||
                            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
                          }
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

                        {/* Badge */}
                        {product.badge && (
                          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[#48A63E] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md border border-[#48A63E]/30">
                            {product.badge}
                          </span>
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemove(product.id, product.name)}
                          className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-rose-600 text-[#5C4E42] hover:text-white backdrop-blur-md transition-all shadow-md"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Rating Badge */}
                        {product.rating && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-extrabold text-[#2C241D] shadow-sm border border-[#E2D7CB]">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{product.rating}</span>
                            {product.reviewCount && (
                              <span className="text-[10px] text-[#7A6C5E] font-medium">
                                ({product.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Content Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#7A6C5E] mb-1">
                            <span className="font-bold text-[#48A63E]">
                              {product.material || 'Premium Finish'}
                            </span>
                            {product.isCustomizable && (
                              <span className="text-[10px] text-[#48A63E] font-bold bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/30 flex items-center gap-1">
                                <Sliders className="w-3 h-3 text-[#48A63E]" /> Customizable
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-[#2C241D] tracking-tight line-clamp-1 group-hover:text-[#48A63E] transition-colors">
                            {product.name}
                          </h3>

                          {product.dimensions && (
                            <p className="text-[11px] text-[#7A6C5E] mt-0.5 font-medium">
                              Dimensions: {product.dimensions}
                            </p>
                          )}
                        </div>

                        {/* Pricing and Add to Cart Action */}
                        <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                          <div>
                            <div className="text-lg font-extrabold text-[#48A63E] tracking-tight">
                              ₹{product.price.toLocaleString('en-IN')}
                            </div>
                            {product.originalPrice && (
                              <div className="text-[11px] text-[#9E9082] line-through -mt-1 font-semibold">
                                ₹{product.originalPrice.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${isCartAdded
                                ? 'bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md shadow-[#48A63E]/20'
                                : 'bg-[#48A63E] hover:bg-[#3D9134] text-white shadow-[#48A63E]/20'
                              }`}
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
        </main>
      </div>
    </div>
  );
};
