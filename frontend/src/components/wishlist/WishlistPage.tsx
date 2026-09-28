import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowLeft, Star, Sliders, Sparkles, ChevronRight, Check } from 'lucide-react';
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

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <Header cartCount={cartIds.length} wishlistCount={items.length} />

        {/* Main Glass Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pt-3">
          {/* Breadcrumb & Navigation Pill */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <Link
              to="/dashboard#shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 border border-[#E2D7CB] text-xs font-black text-[#1C1814] hover:bg-white hover:border-[#38A132]/40 transition-all shadow-xs group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Store Catalog</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#5C4E42] bg-white/90 border border-[#E2D7CB] px-4 py-2 rounded-xl shadow-xs">
              <span>Store</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#38A132] font-black">Wishlist</span>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 lg:p-8 space-y-6 relative overflow-hidden shadow-sm border border-[#E2D7CB]">
            {/* Notification Toast */}
            {toastMessage && (
              <div className="relative z-20 bg-[#38A132] text-white text-xs font-black px-5 py-3 rounded-2xl shadow-xl shadow-[#38A132]/30 text-center animate-fadeIn max-w-md mx-auto flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Header / Title Banner */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
                    <Heart className="w-5 h-5 text-rose-600 fill-rose-600/20" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1C1814] tracking-tight flex items-center gap-3">
                      <span>Saved Wishlist</span>
                      <span className="text-xs font-black text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/25 px-3 py-1 rounded-full shadow-2xs">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </h1>
                    <p className="text-xs text-[#6B5C4D] font-bold mt-0.5">
                      Your curated selection of luxury timber furniture and custom designs
                    </p>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleAddAllToCart}
                    className="px-5 py-2.5 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-black shadow-md shadow-[#38A132]/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Move All to Cart</span>
                  </button>
                  <button
                    onClick={() => {
                      clearWishlist();
                      setItems([]);
                      showToast('Wishlist cleared.');
                    }}
                    className="px-4 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-rose-50 border border-[#E2D7CB] text-rose-600 hover:text-rose-700 text-xs font-black transition-all active:scale-95 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist Items Content */}
            {items.length === 0 ? (
              /* Empty Wishlist State */
              <div className="relative z-10 bg-[#FAF8F5] rounded-3xl p-10 sm:p-16 text-center space-y-4 shadow-xs my-4 border border-[#E2D7CB]">
                <div className="w-20 h-20 bg-white text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-[#E2D7CB] shadow-sm">
                  <Heart className="w-9 h-9 fill-rose-500/20" />
                </div>
                <h2 className="text-2xl font-black text-[#1C1814] tracking-tight">Your wishlist is empty</h2>
                <p className="text-xs sm:text-sm text-[#6B5C4D] max-w-md mx-auto font-bold leading-relaxed">
                  Discover handcrafted teak furniture, minimalist velvet seating, and bespoke custom units to curate your personal collection.
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => navigate('/dashboard#shop')}
                    className="py-3 px-7 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white font-black text-xs transition-all shadow-md shadow-[#38A132]/30 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explore Furniture Catalog</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Wishlist Grid */
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((product) => {
                  const isCartAdded = cartIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="group relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 border border-[#E2D7CB] hover:border-[#38A132]/60 hover:-translate-y-1 flex flex-col justify-between"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF8F5]">
                        <img
                          src={
                            product.imageUrl ||
                            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
                          }
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                        {/* Custom Badge or Material Tag */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                          {product.badge && (
                            <span className="bg-white/95 backdrop-blur-md text-[#38A132] text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs border border-[#38A132]/30">
                              {product.badge}
                            </span>
                          )}
                          {product.isCustomizable && (
                            <span className="bg-[#38A132] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <Sliders className="w-2.5 h-2.5" /> Customizable
                            </span>
                          )}
                        </div>

                        {/* Remove Action Button */}
                        <button
                          onClick={() => handleRemove(product.id, product.name)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/95 hover:bg-rose-600 text-[#5C4E42] hover:text-white backdrop-blur-md transition-all shadow-xs cursor-pointer active:scale-90 z-10"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card Content Details */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#7A6C5E] mb-1">
                            <span className="text-[#38A132]">
                              {product.material || 'Solid Teak & Finish'}
                            </span>
                          </div>

                          <h3
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="text-sm sm:text-base font-black text-[#1C1814] tracking-tight line-clamp-1 group-hover:text-[#38A132] transition-colors cursor-pointer"
                          >
                            {product.name}
                          </h3>

                          {product.dimensions && (
                            <p className="text-[11px] text-[#6B5C4D] mt-0.5 font-bold truncate">
                              Dimensions: {product.dimensions}
                            </p>
                          )}
                        </div>

                        {/* Pricing and Add to Cart Action */}
                        <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                          <div>
                            <div className="text-base sm:text-lg font-black text-[#1C1814] tracking-tight">
                              ₹{product.price.toLocaleString('en-IN')}
                            </div>
                            {product.originalPrice && (
                              <div className="text-[10px] text-[#9E9082] line-through -mt-0.5 font-bold">
                                ₹{product.originalPrice.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                              isCartAdded
                                ? 'bg-[#38A132] hover:bg-[#32922D] text-white shadow-[#38A132]/25'
                                : 'bg-[#38A132] hover:bg-[#32922D] text-white shadow-[#38A132]/25'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{isCartAdded ? 'Go to Cart' : 'Add to Cart'}</span>
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

