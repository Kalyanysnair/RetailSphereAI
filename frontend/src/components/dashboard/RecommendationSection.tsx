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
    productCode: 'SKU-RS-001',
    name: 'Emerald Green Velvet Lounge Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 145000,
    originalPrice: 165000,
    stock: 13,
    salesCount: 148,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 128,
    material: 'Premium Velvet & Teak Wood',
    color: 'Emerald Green / Warm Walnut',
    dimensions: '220cm x 95cm x 78cm',
    isCustomizable: true,
    isTopPick: true,
    badge: '#1 Bestseller',
    detailedDescription: 'Hand-upholstered organic lounge sofa in deep emerald green stain-resistant velvet fabric with solid wood frame.',
    warrantyInfo: '5 Years Structural & Frame Warranty'
  },
  {
    id: 'rec-2',
    productCode: 'SKU-RS-002',
    name: 'Nordic Minimalist Modular Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 220000,
    originalPrice: 250000,
    stock: 5,
    salesCount: 94,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    rating: 4.85,
    reviewCount: 94,
    material: 'Woven Linen & Oak Wood',
    color: 'Slate Grey / Smoked Oak',
    dimensions: '280cm x 180cm x 80cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'Modular Luxury',
    detailedDescription: 'Luxe modular deep-seated sectional sofa with high-density foam cushions and solid oak support legs.',
    warrantyInfo: '5 Years Structural Warranty'
  },
  {
    id: 'rec-3',
    productCode: 'SKU-RS-003',
    name: 'Calacatta Italian Marble Coffee Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 42500,
    originalPrice: 48000,
    stock: 18,
    salesCount: 67,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    rating: 4.95,
    reviewCount: 67,
    material: 'Italian Marble & Brushed Brass',
    color: 'White Calacatta / Antique Brass',
    dimensions: '110cm x 65cm x 42cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'Top Rated',
    detailedDescription: 'Polished natural Calacatta marble top with solid brushed brass geometric metal frame.',
    warrantyInfo: '3 Years Marble Finish Warranty'
  },
  {
    id: 'rec-4',
    productCode: 'SKU-RS-004',
    name: 'Minimalist Teak Wood Side Table',
    category: 'living-room',
    subcategory: 'accent-chairs',
    price: 18500,
    originalPrice: 22000,
    stock: 15,
    salesCount: 52,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?auto=format&fit=crop&w=800&q=80',
    rating: 4.75,
    reviewCount: 52,
    material: 'Solid Teak Wood',
    color: 'Natural Smoked Oak',
    dimensions: '45cm x 45cm x 50cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'Handcrafted',
    detailedDescription: 'Artisanal hand-turned solid teak accent table finished in protective matte organic oil.',
    warrantyInfo: '5 Years Teak Warranty'
  },
  {
    id: 'rec-5',
    productCode: 'SKU-RS-005',
    name: 'Minimalist Teak Wood 6-Seater Dining Set',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 98000,
    originalPrice: 115000,
    stock: 8,
    salesCount: 41,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    rating: 4.85,
    reviewCount: 41,
    material: 'Solid Teak Wood',
    color: 'Warm Honey Teak',
    dimensions: '180cm x 90cm x 75cm',
    isCustomizable: true,
    isTopPick: true,
    badge: '6-Seater Set',
    detailedDescription: 'Sustainably sourced solid teak dining table crafted with chamfered joinery legs and matching seats.',
    warrantyInfo: '10 Years Solid Teak Warranty'
  },
  {
    id: 'rec-6',
    productCode: 'SKU-RS-006',
    name: 'Smoked Walnut Solid Wood Dining Table',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 112000,
    originalPrice: 130000,
    stock: 5,
    salesCount: 38,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    rating: 5.0,
    reviewCount: 38,
    material: 'Solid Walnut Wood & Brass',
    color: 'Smoked Dark Walnut',
    dimensions: '200cm x 95cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'Premium Walnut',
    detailedDescription: 'Premium smoked dark walnut dining table featuring hand-inlaid matte brass edge details.',
    warrantyInfo: '10 Years Wood Warranty'
  },
  {
    id: 'rec-7',
    productCode: 'SKU-RS-007',
    name: 'Artisan Sculptural Wooden Accent Chair',
    category: 'dining-room',
    subcategory: 'dining-chairs',
    price: 34000,
    originalPrice: 40000,
    stock: 14,
    salesCount: 83,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 83,
    material: 'Solid Oak Wood & Premium Fabric',
    color: 'Mustard Yellow / Natural Wood',
    dimensions: '55cm x 55cm x 85cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'Set of 2',
    detailedDescription: 'Handcrafted FSC-certified solid oak sculptural accent chair upholstered in vibrant mustard fabric.',
    warrantyInfo: '5 Years Oak Wood Warranty'
  },
  {
    id: 'rec-8',
    productCode: 'SKU-RS-008',
    name: 'Empress Upholstered Luxury King Bed',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 125000,
    originalPrice: 145000,
    stock: 6,
    salesCount: 29,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    rating: 4.92,
    reviewCount: 64,
    material: 'Plush Upholstered Fabric & Hardwood',
    color: 'Slate Grey / Dark Hardwood',
    dimensions: '200cm x 210cm x 135cm',
    isCustomizable: true,
    badge: 'King Size Bed',
    detailedDescription: 'Tall channel-tufted king headboard wrapped in premium fabric with reinforced hardwood frame.',
    warrantyInfo: '10 Years Frame Warranty'
  },
  {
    id: 'rec-9',
    productCode: 'SKU-RS-009',
    name: 'Scandi Solid Teak Platform Bed',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 85000,
    originalPrice: 95000,
    stock: 10,
    salesCount: 312,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 195,
    material: 'Solid Teak Wood & Natural Cane',
    color: 'Natural Blonde Teak',
    dimensions: '190cm x 200cm x 110cm',
    isCustomizable: true,
    detailedDescription: 'Minimalist Scandinavian platform bed frame with hand-woven organic cane headboard.',
    warrantyInfo: '7 Years Teak Wood Warranty'
  },
  {
    id: 'rec-10',
    productCode: 'SKU-RS-010',
    name: 'Contemporary Walnut 3-Drawer Dresser',
    category: 'bedroom',
    subcategory: 'nightstands',
    price: 48000,
    originalPrice: 55000,
    stock: 9,
    salesCount: 88,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    rating: 4.88,
    reviewCount: 52,
    material: 'Walnut Veneer & Brushed Brass',
    color: 'Smoked Walnut / Gold',
    dimensions: '90cm x 45cm x 80cm',
    isCustomizable: true,
    detailedDescription: 'Soft-closing 3-drawer storage chest featuring rich walnut grain and brushed brass bar pulls.',
    warrantyInfo: '5 Years Furniture Warranty'
  },
  {
    id: 'rec-11',
    productCode: 'SKU-RS-011',
    name: 'Executive Smoked Walnut Writing Desk',
    category: 'office',
    subcategory: 'desks',
    price: 56000,
    originalPrice: 65000,
    stock: 7,
    salesCount: 165,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 98,
    material: 'Smoked Walnut & Black Steel',
    color: 'Dark Walnut / Matte Black',
    dimensions: '160cm x 75cm x 76cm',
    isCustomizable: true,
    detailedDescription: 'Sleek executive writing desk with dual wire management ports and integrated drawer storage.',
    warrantyInfo: '5 Years Executive Desk Warranty'
  },
  {
    id: 'rec-12',
    productCode: 'SKU-RS-012',
    name: 'Ergonomic Executive Office Chair',
    category: 'office',
    subcategory: 'ergonomic',
    price: 36500,
    originalPrice: 42000,
    stock: 12,
    salesCount: 124,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80',
    rating: 4.82,
    reviewCount: 74,
    material: 'Top-Grain Leather & Aluminium',
    color: 'Cognac Brown / Chrome',
    dimensions: '65cm x 65cm x 120cm',
    isCustomizable: true,
    detailedDescription: 'Ergonomic high-back desk chair in full top-grain cognac leather with pneumatic height adjustment.',
    warrantyInfo: '3 Years Chair Warranty'
  },
  {
    id: 'rec-13',
    productCode: 'SKU-RS-013',
    name: 'Bespoke Curved Architectural Lounge Chair',
    category: 'custom-studio',
    subcategory: 'custom-sofas',
    price: 78000,
    originalPrice: 90000,
    stock: 8,
    salesCount: 45,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    rating: 4.95,
    reviewCount: 38,
    material: 'Textured Fabric & Brass Swivel',
    color: 'Royal Mustard / Brushed Gold',
    dimensions: '85cm x 85cm x 80cm',
    isCustomizable: true,
    badge: '360° Swivel',
    detailedDescription: 'Custom architectural accent chair featuring 360-degree smooth brass swivel and high-density foam.',
    warrantyInfo: '5 Years Swivel Mechanism Warranty'
  }
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
