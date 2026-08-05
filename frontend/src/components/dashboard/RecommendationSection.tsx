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

export const RECOMMENDATIONS_DATA: RecommendationProduct[] = [
  {
    id: 'rec-1',
    name: 'Nordic Bouclé Curved Lounge Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 145000,
    originalPrice: 165000,
    stock: 12,
    salesCount: 148,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 128,
    material: 'Bouclé Fabric',
    color: 'Ivory White',
    dimensions: '220cm x 95cm x 78cm',
    isCustomizable: false,
    isTopPick: true,
    badge: '#1 Bestseller',
    detailedDescription: 'Crafted with high-density ergonomic foam and wrapped in rich, tactile Ivory Bouclé upholstery. Features reinforced kiln-dried hardwood internal framing and brushed brass feet.',
    warrantyInfo: '5 Years Structural & Frame Warranty'
  },
  {
    id: 'rec-2',
    name: 'Minimalist Teak Wood 6-Seater Dining Set',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 98000,
    originalPrice: 115000,
    stock: 5,
    salesCount: 94,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    rating: 4.85,
    reviewCount: 94,
    material: 'Teak Wood',
    color: 'Natural Walnut',
    dimensions: '180cm x 90cm x 75cm',
    isCustomizable: false,
    isTopPick: true,
    badge: 'Handcrafted Teak',
    detailedDescription: 'Handcrafted from 100% solid grade-A teak wood with natural matte organic oil sealing. Designed for modern luxury dining spaces with traditional mortise-and-tenon joinery.',
    warrantyInfo: '10 Years Solid Teak Warranty'
  },
  {
    id: 'rec-3',
    name: 'Calacatta Italian Marble Coffee Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 42500,
    originalPrice: 48000,
    stock: 18,
    salesCount: 67,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1533779283484-8ad4940aa3a8?auto=format&fit=crop&w=800&q=80',
    rating: 4.95,
    reviewCount: 67,
    material: 'Italian Marble',
    color: 'White & Gold',
    dimensions: '110cm x 65cm x 42cm',
    isCustomizable: false,
    isTopPick: true,
    badge: 'Top Rated',
    detailedDescription: 'Features genuine Italian Calacatta marble with gold and grey veining, hand-polished to a velvety satin finish. Supported by a champagne brass architectural geometric pedestal base.',
    warrantyInfo: '3 Years Marble Finish Warranty'
  },
  {
    id: 'rec-4',
    name: 'Royal Velvet Wingback Accent Armchair',
    category: 'living-room',
    subcategory: 'accent-chairs',
    price: 36000,
    stock: 8,
    salesCount: 52,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    rating: 4.75,
    reviewCount: 52,
    material: 'Italian Velvet',
    color: 'Emerald Green',
    dimensions: '85cm x 80cm x 98cm',
    isCustomizable: false,
    isTopPick: false,
    detailedDescription: 'Plush wingback silhouette with deep tufted seating and stain-resistant Italian velvet. Built over solid walnut legs with hand-hammered brass nailhead accents.',
    warrantyInfo: '5 Years Upholstery Warranty'
  },
  {
    id: 'rec-5',
    name: 'Executive Teak Desk with Cable Management',
    category: 'office',
    subcategory: 'desks',
    price: 68000,
    originalPrice: 75000,
    stock: 6,
    salesCount: 41,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    rating: 4.85,
    reviewCount: 41,
    material: 'Teak Wood',
    color: 'Dark Amber',
    dimensions: '160cm x 75cm x 76cm',
    isCustomizable: false,
    isTopPick: true,
    badge: 'Workstation Choice',
    detailedDescription: 'Premium executive workstation handcrafted from solid teak slab. Integrates hidden magnetic cable channels, wireless charging pad recess, and soft-close storage drawers.',
    warrantyInfo: '7 Years Workstation Warranty'
  },
  {
    id: 'rec-6',
    name: 'Bespoke Modular Sectional Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 220000,
    originalPrice: 250000,
    stock: 3,
    salesCount: 38,
    status: 'Low Stock',
    imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    rating: 5.0,
    reviewCount: 38,
    material: 'Bouclé Fabric',
    color: 'Charcoal Grey',
    dimensions: '280cm x 180cm x 80cm',
    isCustomizable: false,
    isTopPick: true,
    badge: 'Premium Bestseller',
    detailedDescription: 'Modular 4-piece sectional sofa system allowing versatile L-shape or straight arrangement. Includes down-blend accent cushions and water-repellent performance weave fabric.',
    warrantyInfo: '5 Years Structural Warranty'
  },
  {
    id: 'rec-7',
    name: 'Empress Velvet Upholstered King Bed',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 125000,
    originalPrice: 140000,
    stock: 7,
    salesCount: 83,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 83,
    material: 'Italian Velvet',
    color: 'Royal Navy',
    dimensions: '200cm x 210cm x 135cm',
    isCustomizable: false,
    isTopPick: false,
    detailedDescription: 'Grand winghead design with channel-stitched plush velvet upholstery. Engineered with noise-free pneumatic hydraulic storage lift base and solid teak support slats.',
    warrantyInfo: '10 Years Frame & Slats Warranty'
  },
  {
    id: 'rec-8',
    name: 'Art Deco Brass & Brushed Steel Console',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 74000,
    stock: 4,
    salesCount: 29,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    rating: 4.92,
    reviewCount: 64,
    material: 'Solid Walnut',
    dimensions: '200cm x 180cm x 110cm',
    isCustomizable: false,
    badge: 'Trending',
    detailedDescription: 'Luxury dining console table featuring solid walnut top and brushed antique brass base frame. Perfect centerpiece for modern luxury dining rooms and grand foyers.',
    warrantyInfo: '5 Years Metal & Wood Warranty'
  },
  {
    id: 'rec-9',
    name: 'Executive Ergonomic Leather Office Chair',
    category: 'workspace',
    subcategory: 'study-tables',
    price: 38000,
    originalPrice: 45000,
    stock: 20,
    salesCount: 312,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 195,
    material: 'Full-Grain Leather',
    dimensions: '65cm x 65cm x 120cm',
    isCustomizable: false,
    detailedDescription: 'Upholstered in full-grain Italian leather with multi-axis lumbar support, synchronized tilt mechanism, and heavy-duty chrome caster base.',
    warrantyInfo: '3 Years Mechanism & Leather Warranty'
  },
  {
    id: 'rec-10',
    name: 'Artisan Rattan & Teak Sun Lounger Daybed',
    category: 'outdoor',
    subcategory: 'outdoor-sets',
    price: 64000,
    originalPrice: 72000,
    stock: 9,
    salesCount: 88,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?auto=format&fit=crop&w=800&q=80',
    rating: 4.88,
    reviewCount: 52,
    material: 'Teak & Natural Cane',
    dimensions: '190cm x 80cm x 40cm',
    isCustomizable: false,
    detailedDescription: 'Weatherproof outdoor lounger daybed with handwoven natural cane rattan side panels and marine-grade teak frame. Quick-dry outdoor cushions included.',
    warrantyInfo: '5 Years Weatherproof Outdoor Warranty'
  },
  {
    id: 'rec-11',
    name: 'Architectural Marble Coffee Table',
    category: 'living-room',
    subcategory: 'tables',
    price: 54000,
    originalPrice: 62000,
    stock: 11,
    salesCount: 165,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 98,
    material: 'Italian Marble Top',
    dimensions: '120cm x 70cm x 42cm',
    isCustomizable: false,
    detailedDescription: 'Architectural living room coffee table featuring honed white marble slab top and matte black powder-coated steel tripod base.',
    warrantyInfo: '3 Years Marble & Structure Warranty'
  },
  {
    id: 'rec-12',
    name: 'Scandinavian Floating Media Console',
    category: 'decor',
    subcategory: 'cabinets',
    price: 49000,
    originalPrice: 58000,
    stock: 14,
    salesCount: 124,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    rating: 4.82,
    reviewCount: 74,
    material: 'Oak Wood Veneer',
    dimensions: '180cm x 40cm x 45cm',
    isCustomizable: false,
    detailedDescription: 'Wall-mounted oak wood veneer entertainment console with slatted tambour doors for infrared remote pass-through and hidden cable channels.',
    warrantyInfo: '5 Years Structural Warranty'
  },
];

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
          <p className="text-xs font-medium">Try selecting another subcategory or adjusting your price slider.</p>
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
