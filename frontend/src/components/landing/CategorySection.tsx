import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Sliders, ArrowUpRight, Heart, Search, ArrowUpDown, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { CatalogItem, CategoryTab } from '../../types/landing';
import { getWishlistItems, toggleWishlist } from '../../utils/wishlistStorage';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';
import { getStoredRetailOrders } from '../../utils/retailOrdersStorage';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured Items' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export const CategorySection: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('featured');
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    getWishlistItems().map((item) => item.id)
  );
  const [dbCatalogProducts, setDbCatalogProducts] = useState<CatalogItem[]>([]);

  const isLoggedIn = Boolean(
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('access_token') || localStorage.getItem('user'))
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { id: 'living', name: 'Living Room', subcategories: ['All', 'Sofas', 'Armchairs', 'Tables', 'TV Units'] },
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
      price: 46000,
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
      image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
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
      price: 52000,
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
      price: 42000,
      rating: 4.8,
      reviewCount: 33,
      isCustomizable: true,
      image: 'https://images.unsplash.com/photo-1533779283484-8ad4940aa3a8?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const activeTabObj = categories.find((c) => c.name === activeCategory) || categories[0];
  const sourceProducts = dbCatalogProducts.length > 0 ? dbCatalogProducts : demoProducts;

  const isSubcategoryMatch = (itemSubcategory: string = '', itemName: string = '', targetSubcategory: string = '') => {
    if (!targetSubcategory || targetSubcategory === 'All' || targetSubcategory === 'all' || targetSubcategory === 'all-sub') {
      return true;
    }

    const sub = itemSubcategory.toLowerCase().trim();
    const name = itemName.toLowerCase().trim();
    const target = targetSubcategory.toLowerCase().trim();

    if (sub === target || sub.includes(target) || target.includes(sub)) {
      return true;
    }

    const getKeywords = (str: string) =>
      str
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w) => (w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w))
        .filter((w) => w.length >= 3);

    const targetKeywords = getKeywords(target);
    if (targetKeywords.length === 0) return true;

    return targetKeywords.some((kw) => sub.includes(kw) || name.includes(kw));
  };

  const filteredProducts = sourceProducts.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSubcategory = isSubcategoryMatch(item.subcategory, item.name, activeSubcategory);
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

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === selectedSort)?.label || 'Featured Items';

  return (
    <section id="shop" className="scroll-mt-24 max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-10 relative">
      {/* Anchor targets */}
      <div id="categories" className="absolute -top-24 left-0" />
      <div id="readymade" className="absolute -top-24 left-0" />

      {/* Clean Unboxed Header & Text Navigation */}
      <div className="pt-10 sm:pt-14 md:pt-16 mb-6 space-y-4">
        {/* Top Flex: Title + Search/Sort */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1410] tracking-tight">
              Ready-Made & Spatial Collections
            </h2>
            <span className="text-xs font-bold text-[#7A6C5E]">
              ({filteredProducts.length} items)
            </span>
          </div>

          {/* Search + Sort Toolbar */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-[#38A132] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search furniture, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#1A1410] font-bold placeholder-[#8C7C6D] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#1A1410] bg-white border border-[#E2D7CB] rounded-xl shadow-xs hover:border-[#38A132] transition-all cursor-pointer whitespace-nowrap"
              >
                <ArrowUpDown className="w-3 h-3 text-[#38A132]" />
                <span>{currentSortLabel}</span>
                <ChevronDown className={`w-3 h-3 text-[#38A132] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white border border-[#E2D7CB] p-1.5 shadow-2xl z-50 animate-fadeIn space-y-0.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = opt.value === selectedSort;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedSort(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#38A132] text-white shadow-xs'
                            : 'text-[#1A1410] hover:bg-[#38A132]/10 hover:text-[#38A132]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean Text Category Tabs & Subcategories */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
          <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = cat.name === 'All' 
                ? sourceProducts.length 
                : sourceProducts.filter(p => p.category === cat.name).length;
              const isActive = activeCategory === cat.name;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.name);
                    setActiveSubcategory('All');
                  }}
                  className={`relative pb-2.5 text-sm sm:text-base font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#2E8B29]'
                      : 'text-[#6B5C4D] hover:text-[#1A1410]'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-xs font-bold ${
                    isActive ? 'text-[#2E8B29]' : 'text-[#9E9082]'
                  }`}>
                    {count}
                  </span>
                  {/* Active underline indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#38A132] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Subcategory Clean Text Filters */}
          {activeTabObj.subcategories.length > 1 && (
            <div className="flex items-center gap-2.5 flex-wrap pb-1">
              <span className="text-xs font-bold text-[#8C7C6D]">Filter:</span>
              {activeTabObj.subcategories.map((sub) => {
                const isActive = activeSubcategory === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setActiveSubcategory(sub)}
                    className={`text-xs font-bold transition-all cursor-pointer px-1 py-0.5 ${
                      isActive
                        ? 'text-[#2E8B29] font-extrabold underline underline-offset-4 decoration-2'
                        : 'text-[#7A6C5E] hover:text-[#1A1410]'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modern High-Contrast Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="group bg-white border border-[#E2D7CB] hover:border-[#38A132] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
            >
              <div>
                {/* Product Image */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#F0EBE4]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.isPopular && (
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#38A132] text-white shadow-md">
                      Bestseller
                    </span>
                  )}
                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistToggle(product);
                      }}
                      className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-[#E2D7CB] flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                        wishlistIds.includes(product.id)
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'text-[#524538] hover:text-rose-600'
                      }`}
                      title={wishlistIds.includes(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${wishlistIds.includes(product.id) ? 'fill-white' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Info Container */}
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#38A132]">
                    <span className="font-mono text-[9px] font-extrabold bg-[#38A132]/10 border border-[#38A132]/25 text-[#2E8B29] px-1.5 py-0.2 rounded">
                      {product.productCode || `SKU-RS-${product.id}`}
                    </span>
                    <span className="text-[#6B5C4D] font-extrabold text-[10px]">{product.category}</span>
                  </div>

                  <h3 className="font-extrabold text-xs sm:text-sm text-[#1A1410] leading-snug group-hover:text-[#38A132] transition-colors line-clamp-1">
                    {product.name}
                  </h3>

                  {/* Available Color Swatch Dots */}
                  {product.available_colors && product.available_colors.length > 0 && (
                    <div className="flex items-center gap-1 py-0.5">
                      {product.available_colors.map((colorName, idx) => {
                        const cStyle = getColorHex(colorName);
                        return (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border shadow-2xs transition-transform hover:scale-125 cursor-pointer"
                            style={{ backgroundColor: cStyle.bg, borderColor: cStyle.border }}
                            title={colorName}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Action Bottom Row */}
              <div className="p-3.5 pt-0 flex items-center justify-between border-t border-[#E2D7CB]/60 mt-1">
                <div>
                  <span className="text-[9px] font-extrabold text-[#7A6C5E] block uppercase tracking-wider">Price</span>
                  <span className="text-sm sm:text-base font-extrabold text-[#2E8B29]">₹{product.price.toLocaleString('en-IN')}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/product/${product.id}`);
                  }}
                  className="w-8 h-8 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white flex items-center justify-center transition-all duration-300 shadow-md shadow-[#38A132]/25 cursor-pointer group-hover:scale-105"
                  title="View Item"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#E2D7CB] shadow-sm">
          <p className="text-sm sm:text-base font-extrabold text-[#1A1410]">No furniture items match your search filter</p>
          <button
            onClick={() => {
              setActiveCategory('All');
              setActiveSubcategory('All');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-[#38A132] text-white text-xs font-extrabold shadow-md hover:bg-[#32922D] cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </section>
  );
};
