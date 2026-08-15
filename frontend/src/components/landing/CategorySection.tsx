import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Sliders, ArrowUpRight, Heart } from 'lucide-react';
import { CatalogItem, CategoryTab } from '../../types/landing';
import { SearchFilterBar } from './SearchFilterBar';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';
import { getStoredRetailOrders } from '../../utils/retailOrdersStorage';

export const CategorySection: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('featured');
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    getWishlistItems().map((item) => item.id)
  );
  const [dbCatalogProducts, setDbCatalogProducts] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const loadProductsFromDB = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          // Calculate top ordered product IDs from stored orders
          const orderCounts: Record<string, number> = {};
          try {
            const orders = getStoredRetailOrders();
            orders.forEach((ord) => {
              if (ord.items && Array.isArray(ord.items)) {
                ord.items.forEach((it) => {
                  const key = it.id;
                  orderCounts[key] = (orderCounts[key] || 0) + (it.quantity || 1);
                });
              }
            });
          } catch (e) {}

          const orderEntries = Object.entries(orderCounts).sort((a, b) => b[1] - a[1]);
          const topOrderedIds = new Set(
            orderEntries.length > 0
              ? orderEntries.slice(0, 2).map((e) => e[0])
              : [dbItems[0]?.id || `inv-${dbItems[0]?.product_id}`, dbItems[1]?.id || `inv-${dbItems[1]?.product_id}`]
          );

          const mapped: CatalogItem[] = dbItems.map((p: any, idx: number) => {
            const rawId = p.product_id || p.id;
            const itemKey = p.id || `inv-${p.product_id}`;
            const code = p.productCode || p.sku || `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;
            const colors = parseAvailableColors(p.available_colors || p.availableColors || p.color);
            
            // Only set Bestseller for top ordered products (or top 2 in catalog if no orders placed yet)
            const isTopSeller = topOrderedIds.has(itemKey) || topOrderedIds.has(String(rawId)) || (orderEntries.length === 0 && idx < 2);

            return {
              id: itemKey,
              productCode: code,
              name: p.name || p.product_name,
              category: p.category || 'Living Room',
              subcategory: p.subcategory || 'General',
              price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
              rating: 4.9,
              reviewCount: 28,
              isCustomizable: true,
              image: p.image_url || p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
              color: p.color || 'Natural',
              available_colors: colors.length > 0 ? colors : [p.color || 'Natural'],
              isPopular: isTopSeller
            };
          });
          setDbCatalogProducts(mapped);
        }
      } catch (err) {
        console.warn('Error loading products from DB into customer catalog:', err);
      }
    };
    loadProductsFromDB();
  }, []);

  useEffect(() => {
    const syncWishlist = () => {
      setWishlistIds(getWishlistItems().map((item) => item.id));
    };
    syncWishlist();
    window.addEventListener('wishlist-updated', syncWishlist);
    window.addEventListener('storage', syncWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  const handleWishlistToggle = (product: CatalogItem) => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      material: product.category,
      price: product.price,
      imageUrl: product.image,
      category: product.category,
      subcategory: product.subcategory,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isCustomizable: product.isCustomizable,
    });
  };

  const categories: CategoryTab[] = [
    { id: 'all', name: 'All', subcategories: ['All'] },
    { id: 'living', name: 'Living Room', subcategories: ['All', 'Sofas', 'Armchairs', 'Coffee Tables', 'TV Units'] },
    { id: 'dining', name: 'Dining Room', subcategories: ['All', 'Dining Tables', 'Dining Chairs', 'Sideboards'] },
    { id: 'bedroom', name: 'Bedroom', subcategories: ['All', 'Bed Frames', 'Nightstands', 'Wardrobes'] },
    { id: 'lighting', name: 'Lighting & Accents', subcategories: ['All', 'Floor Lamps', 'Pendant Lights', 'Table Lamps'] },
  ];

  const demoProducts: CatalogItem[] = [
    {
      id: 'c1',
      name: 'Nordic Bouclé Curved Lounge Sofa',
      category: 'Living Room',
      subcategory: 'Sofas',
      price: 148000,
      rating: 4.9,
      reviewCount: 38,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
      isPopular: true,
    },
    {
      id: 'c2',
      name: 'Minimalist Walnut Solid Dining Table',
      category: 'Dining Room',
      subcategory: 'Dining Tables',
      price: 96000,
      rating: 4.8,
      reviewCount: 24,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'c3',
      name: 'Sculptural Brass Arc Floor Lamp',
      category: 'Lighting & Accents',
      subcategory: 'Floor Lamps',
      price: 27200,
      rating: 4.9,
      reviewCount: 52,
      isCustomizable: false,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      isPopular: true,
    },
    {
      id: 'c4',
      name: 'Terracotta Velvet Ergonomic Armchair',
      category: 'Living Room',
      subcategory: 'Armchairs',
      price: 54400,
      rating: 4.7,
      reviewCount: 19,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'c5',
      name: 'Floating Ambient Walnut Nightstand',
      category: 'Bedroom',
      subcategory: 'Nightstands',
      price: 18500,
      rating: 4.9,
      reviewCount: 41,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1532372576444-dda954194ad0?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'c6',
      name: 'Hand-Blown Glass Pendant Light',
      category: 'Lighting & Accents',
      subcategory: 'Pendant Lights',
      price: 14200,
      rating: 4.8,
      reviewCount: 29,
      isCustomizable: false,
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'c7',
      name: 'Japanese Oak Minimalist Bed Frame',
      category: 'Bedroom',
      subcategory: 'Bed Frames',
      price: 112000,
      rating: 4.9,
      reviewCount: 67,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      isPopular: true,
    },
    {
      id: 'c8',
      name: 'Architectural Marble Coffee Table',
      category: 'Living Room',
      subcategory: 'Coffee Tables',
      price: 68000,
      rating: 4.8,
      reviewCount: 33,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1533779283484-8ad4940aa3a8?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const activeTabObj = categories.find((c) => c.name === activeCategory) || categories[0];

  const sourceProducts = dbCatalogProducts.length > 0 ? dbCatalogProducts : demoProducts;

  const filteredProducts = sourceProducts.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSubcategory = activeSubcategory === 'All' || item.subcategory === activeSubcategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.productCode && item.productCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSubcategory && matchesSearch;
  }).sort((a, b) => {
    if (selectedSort === 'price-asc') return a.price - b.price;
    if (selectedSort === 'price-desc') return b.price - a.price;
    if (selectedSort === 'rating') return b.rating - a.rating;
    return 0;
  });

  return (
    <section id="categories" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C241D] tracking-tight">
          Explore Spatial Collections
        </h2>
        <p className="text-xs sm:text-sm text-[#524538] font-bold">
          Handcrafted furniture pieces designed for comfort, longevity, and modern spatial harmony.
        </p>
      </div>

      {/* Toolbar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.name);
              setActiveSubcategory('All');
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeCategory === cat.name
                ? 'bg-[#38A132] text-white shadow-lg shadow-[#38A132]/30 scale-105'
                : 'bg-white/70 hover:bg-white text-[#1A1410] border border-white/80 backdrop-blur-md shadow-xs'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Subcategory Pills */}
      {activeTabObj.subcategories.length > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          <span className="text-xs font-black text-[#1A1410] mr-2 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
            Subcategories:
          </span>
          {activeTabObj.subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubcategory === sub
                  ? 'bg-[#38A132] text-white shadow-md'
                  : 'bg-white/70 hover:bg-white text-[#1A1410] border border-white/80 backdrop-blur-md'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="group ultra-glass-card rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative text-[#1A1410] border-2 border-white/80 cursor-pointer"
            >
              <div className="relative z-10">
                {/* Product Image */}
                <div className="relative h-60 w-full overflow-hidden bg-[#EAE1D5]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.isPopular && (
                    <span className="absolute top-3 left-3 text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full bg-[#38A132] text-white shadow-md">
                      Bestseller
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlistToggle(product);
                    }}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md border border-white/80 flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                      wishlistIds.includes(product.id)
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/80 text-[#524538] hover:text-rose-600'
                    }`}
                    title={wishlistIds.includes(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${wishlistIds.includes(product.id) ? 'fill-white' : ''}`} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-[#38A132]">
                    <span className="font-mono text-[10px] font-black bg-[#38A132]/10 border border-[#38A132]/25 text-[#38A132] px-2 py-0.5 rounded">
                      {product.productCode || `SKU-RS-${product.id}`}
                    </span>
                    <span className="text-[#4A3E31] font-black text-[11px]">{product.category}</span>
                  </div>

                  <h3 className="font-black text-base text-[#1A1410] leading-snug group-hover:text-[#38A132] transition-colors">
                    {product.name}
                  </h3>

                  {/* Available Color Swatch Circles (Matching Reference Image) */}
                  {product.available_colors && product.available_colors.length > 0 && (
                    <div className="flex items-center gap-1.5 py-1">
                      {product.available_colors.map((colorName, idx) => {
                        const cStyle = getColorHex(colorName);
                        return (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border shadow-2xs transition-transform hover:scale-125 cursor-pointer"
                            style={{ backgroundColor: cStyle.bg, borderColor: cStyle.border }}
                            title={colorName}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-5 pt-0 flex items-center justify-between border-t border-white/40 mt-2 relative z-10">
                <div>
                  <span className="text-[10px] font-black text-[#5C4E42] block uppercase tracking-wider">Price</span>
                  <span className="text-lg font-black text-[#38A132]">₹{product.price.toLocaleString('en-IN')}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/product/${product.id}`);
                  }}
                  className="w-9 h-9 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white flex items-center justify-center transition-all duration-300 shadow-md shadow-[#38A132]/25 cursor-pointer"
                  title="View Item"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 ultra-glass-card rounded-3xl border-2 border-white/80">
          <p className="text-base font-black text-[#1A1410]">No furniture items match your query</p>
          <button
            onClick={() => {
              setActiveCategory('All');
              setActiveSubcategory('All');
              setSearchQuery('');
            }}
            className="mt-4 px-5 py-2.5 rounded-2xl bg-[#38A132] text-white text-xs font-extrabold shadow-md"
          >
            Reset Catalog Filters
          </button>
        </div>
      )}
    </section>
  );
};
