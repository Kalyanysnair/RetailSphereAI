import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { CategoryFilterSection } from './CategoryFilterSection';
import { RecommendationSection } from './RecommendationSection';
import { CustomerContactSection } from './CustomerContactSection';
import { CustomizationModal } from './CustomizationModal';
import { CustomOrderTracker } from './CustomOrderTracker';
import { DashboardFilterState, RecommendationProduct } from '../../types/dashboard';

import { getCartCount } from '../../utils/cartStorage';
import { getWishlistCount } from '../../utils/wishlistStorage';
import { fetchInventoryFromDB } from '../../services/api';

export const DEFAULT_CATALOG_PRODUCTS: RecommendationProduct[] = [
  {
    id: 'inv-1',
    productCode: 'SKU-RS-001',
    name: 'Emerald Green Velvet Lounge Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 145000,
    originalPrice: 166750,
    stock: 12,
    salesCount: 45,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 38,
    material: 'Italian Velvet & Solid Wood',
    color: 'Emerald Green',
    dimensions: '220cm x 95cm x 85cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-001',
  },
  {
    id: 'inv-2',
    productCode: 'SKU-RS-002',
    name: 'Nordic Minimalist Modular Sofa',
    category: 'living-room',
    subcategory: 'sofas',
    price: 220000,
    originalPrice: 253000,
    stock: 5,
    salesCount: 30,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 24,
    material: 'Woven Linen & Oak Wood',
    color: 'Warm Beige',
    dimensions: '280cm x 160cm x 82cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-002',
  },
  {
    id: 'inv-3',
    productCode: 'SKU-RS-003',
    name: 'Calacatta Italian Marble Coffee Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 42500,
    originalPrice: 48875,
    stock: 18,
    salesCount: 60,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 42,
    material: 'Italian Marble & Brushed Brass',
    color: 'White Calacatta / Antique Brass',
    dimensions: '120cm x 70cm x 45cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-003',
  },
  {
    id: 'inv-4',
    productCode: 'SKU-RS-004',
    name: 'Minimalist Teak Wood Side Table',
    category: 'living-room',
    subcategory: 'coffee-tables',
    price: 18500,
    originalPrice: 21275,
    stock: 15,
    salesCount: 50,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 19,
    material: 'Solid Teak Wood',
    color: 'Natural Smoked Oak',
    dimensions: '55cm x 55cm x 50cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-004',
  },
  {
    id: 'inv-5',
    productCode: 'SKU-RS-005',
    name: 'Minimalist Teak Wood 6-Seater Dining Set',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 98000,
    originalPrice: 112700,
    stock: 8,
    salesCount: 35,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 52,
    material: 'Solid Teak Wood',
    color: 'Warm Honey Teak',
    dimensions: '200cm x 90cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-005',
  },
  {
    id: 'inv-6',
    productCode: 'SKU-RS-006',
    name: 'Smoked Walnut Solid Wood Dining Table',
    category: 'dining-room',
    subcategory: 'dining-tables',
    price: 112000,
    originalPrice: 128800,
    stock: 4,
    salesCount: 22,
    status: 'Low Stock',
    imageUrl: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 29,
    material: 'American Walnut & Brass',
    color: 'Smoked Dark Walnut',
    dimensions: '220cm x 100cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-006',
  },
  {
    id: 'inv-7',
    productCode: 'SKU-RS-007',
    name: 'Artisan Upholstered Oak Dining Chair (Set of 2)',
    category: 'dining-room',
    subcategory: 'dining-chairs',
    price: 34000,
    originalPrice: 39100,
    stock: 14,
    salesCount: 40,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 31,
    material: 'FSC Oak & Natural Linen',
    color: 'Natural Oak / Oatmeal',
    dimensions: '50cm x 55cm x 88cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-007',
  },
  {
    id: 'inv-8',
    productCode: 'SKU-RS-008',
    name: 'Japanese Oak Minimalist Bed Frame',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 125000,
    originalPrice: 143750,
    stock: 6,
    salesCount: 28,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 48,
    material: 'FSC-Certified Solid Oak',
    color: 'Natural Japanese Oak',
    dimensions: '210cm x 195cm x 115cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-008',
  },
  {
    id: 'inv-9',
    productCode: 'SKU-RS-009',
    name: 'Scandi Solid Teak Platform Bed',
    category: 'bedroom',
    subcategory: 'king-beds',
    price: 85000,
    originalPrice: 97750,
    stock: 10,
    salesCount: 33,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 36,
    material: 'Solid Teak Wood & Natural Rattan',
    color: 'Natural Blonde Teak',
    dimensions: '205cm x 185cm x 110cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-009',
  },
  {
    id: 'inv-10',
    productCode: 'SKU-RS-010',
    name: 'Contemporary Walnut 3-Drawer Dresser',
    category: 'bedroom',
    subcategory: 'wardrobes',
    price: 48000,
    originalPrice: 55200,
    stock: 9,
    salesCount: 26,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 21,
    material: 'Walnut Veneer & Brushed Brass',
    color: 'Smoked Walnut / Gold',
    dimensions: '110cm x 50cm x 85cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-010',
  },
  {
    id: 'inv-11',
    productCode: 'SKU-RS-011',
    name: 'Executive Smoked Walnut Writing Desk',
    category: 'office',
    subcategory: 'desks',
    price: 56000,
    originalPrice: 64400,
    stock: 7,
    salesCount: 19,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 27,
    material: 'Smoked Walnut & Black Steel',
    color: 'Dark Walnut / Matte Black',
    dimensions: '160cm x 75cm x 76cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-011',
  },
  {
    id: 'inv-12',
    productCode: 'SKU-RS-012',
    name: 'Ergonomic Executive Genuine Leather Chair',
    category: 'office',
    subcategory: 'ergonomic',
    price: 36500,
    originalPrice: 41975,
    stock: 12,
    salesCount: 41,
    status: 'In Stock',
    imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 33,
    material: 'Top-Grain Leather & Aluminium',
    color: 'Cognac Brown / Chrome',
    dimensions: '65cm x 65cm x 115cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-012',
  },
  {
    id: 'inv-13',
    productCode: 'SKU-RS-013',
    name: 'Bespoke Curved Architectural Lounge Chair',
    category: 'living-room',
    subcategory: 'accent-chairs',
    price: 78000,
    originalPrice: 89700,
    stock: 3,
    salesCount: 15,
    status: 'Low Stock',
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 17,
    material: 'Black Ash & Steel',
    color: 'Charcoal Black',
    dimensions: '90cm x 85cm x 80cm',
    isCustomizable: true,
    isTopPick: true,
    badge: 'SKU-RS-013',
  },
];

export const DashboardPage: React.FC = () => {
  const location = useLocation();
  const [cartItemsCount, setCartItemsCount] = useState(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [selectedCustomProduct, setSelectedCustomProduct] = useState<RecommendationProduct | null>(null);
  const [customModalTrigger, setCustomModalTrigger] = useState(0);
  const [dbProducts, setDbProducts] = useState<RecommendationProduct[]>(DEFAULT_CATALOG_PRODUCTS);

  useEffect(() => {
    const loadDBProducts = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const mapped: RecommendationProduct[] = dbItems.map((p: any) => {
            const rawId = p.product_id || p.id;
            const code = p.productCode || p.sku || `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;
            
            let catId = (p.category || '').toLowerCase().trim();
            if (catId.includes('living')) catId = 'living-room';
            else if (catId.includes('dining')) catId = 'dining-room';
            else if (catId.includes('bed')) catId = 'bedroom';
            else if (catId.includes('office') || catId.includes('desk') || catId.includes('studio')) catId = 'office';
            else if (catId.includes('custom')) catId = 'custom-studio';

            return {
              id: p.id || `inv-${p.product_id}`,
              productCode: code,
              name: p.name || p.product_name,
              category: catId,
              subcategory: (p.subcategory || 'General').toLowerCase().replace(/\s+/g, '-'),
              price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
              originalPrice: (typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0) * 1.15,
              stock: p.stockCount || 10,
              salesCount: 45,
              status: (p.status || 'In Stock') as any,
              imageUrl: p.image_url || p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
              rating: 4.9,
              reviewCount: 38,
              material: p.material || 'Solid Teak Wood',
              color: p.color || 'Natural Wood',
              dimensions: '200cm x 90cm x 75cm',
              isCustomizable: true,
              isTopPick: p.stockCount > 0,
              badge: code
            };
          });
          setDbProducts(mapped);
        }
      } catch (err) {
        console.warn('Could not fetch DB products for dashboard:', err);
      }
    };
    loadDBProducts();

    const handleReset = () => handleResetFilters();
    window.addEventListener('reset-dashboard-filters', handleReset);
    return () => window.removeEventListener('reset-dashboard-filters', handleReset);
  }, []);

  // Smooth Hash Scroll & Custom Order Form Trigger
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      if (targetId === 'custom-order-section' || targetId === 'custom-order-form') {
        setCustomModalTrigger((prev) => prev + 1);
      }
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId) || document.getElementById('custom-order-form');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.pathname]);


  // Filter State
  const [filterState, setFilterState] = useState<DashboardFilterState>({
    categoryId: 'all',
    subcategoryId: 'all-sub',
    material: 'All Materials',
    maxPrice: 350000,
    searchQuery: '',
    sortBy: 'recommended',
  });

  const handleFilterChange = (updated: Partial<DashboardFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilterState({
      categoryId: 'all',
      subcategoryId: 'all-sub',
      material: 'All Materials',
      maxPrice: 350000,
      searchQuery: '',
      sortBy: 'recommended',
    });
  };

  // Filtered Furniture Recommendations & Catalog Products
  const filteredProducts = useMemo(() => {
    const sourceList = dbProducts.length > 0 ? dbProducts : DEFAULT_CATALOG_PRODUCTS;
    return sourceList.filter((product) => {
      // Category Filter
      if (filterState.categoryId !== 'all') {
        const prodCat = (product.category || '').toLowerCase();
        const filterCat = filterState.categoryId.toLowerCase();
        const isMatch = prodCat === filterCat || 
                        (filterCat === 'office' && (prodCat === 'home-office' || prodCat === 'office')) ||
                        (filterCat === 'home-office' && (prodCat === 'home-office' || prodCat === 'office')) ||
                        (filterCat === 'custom-studio' && (prodCat === 'custom-studio' || prodCat.includes('custom')));
        if (!isMatch) return false;
      }
      // Subcategory Filter
      if (
        filterState.subcategoryId !== 'all-sub' &&
        filterState.subcategoryId !== 'bestsellers' &&
        filterState.subcategoryId !== 'custom-ready' &&
        filterState.subcategoryId !== 'in-stock'
      ) {
        const subName = (product.subcategory || '').toLowerCase();
        const prodName = (product.name || '').toLowerCase();
        const filterSub = filterState.subcategoryId.toLowerCase().replace(/-/g, ' ');

        // Tokenize target keywords and stem plurals
        const targetKeywords = filterSub
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .map((w) => (w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w))
          .filter((w) => w.length >= 3);

        const matchesSub =
          subName.includes(filterSub) ||
          prodName.includes(filterSub) ||
          (targetKeywords.length > 0 && targetKeywords.some((kw) => prodName.includes(kw) || subName.includes(kw)));

        if (!matchesSub) {
          return false;
        }
      }
      if (filterState.subcategoryId === 'bestsellers' && !product.isTopPick) {
        return false;
      }
      if (filterState.subcategoryId === 'custom-ready' && !product.isCustomizable) {
        return false;
      }

      // Material Filter
      if (
        filterState.material !== 'All Materials' &&
        !product.material.toLowerCase().includes(filterState.material.toLowerCase())
      ) {
        return false;
      }

      // Price Range Filter
      if (product.price > filterState.maxPrice) {
        return false;
      }

      // Search Query Filter
      if (filterState.searchQuery.trim()) {
        const query = filterState.searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesMaterial = product.material.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        const matchesCode = (product.productCode || '').toLowerCase().includes(query);
        if (!matchesName && !matchesMaterial && !matchesCategory && !matchesCode) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filterState.sortBy === 'price-low') return a.price - b.price;
      if (filterState.sortBy === 'price-high') return b.price - a.price;
      if (filterState.sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [filterState, dbProducts]);

  const handleAddToCart = () => {
    setCartItemsCount((prev) => prev + 1);
  };

  const handleToggleWishlist = () => {
    setWishlistCount((prev) => prev + 1);
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
        {/* Floating Header Pill Navigation */}
        <Header
          cartCount={cartItemsCount}
          wishlistCount={wishlistCount}
          onOpenCustomOrder={() => setCustomModalTrigger((prev) => prev + 1)}
        />

        {/* Main Content Area wrapped in an ultra glass panel */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pt-3">


          <div className="ultra-glass-panel rounded-[2.5rem] p-5 sm:p-8 lg:p-10 space-y-10 relative overflow-hidden">
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />



            {/* Search Bar Outside Header + Category Tabs, Subcategory Chips & Filters */}
            <CategoryFilterSection
              filterState={filterState}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onOpenCustomOrder={() => setCustomModalTrigger((prev) => prev + 1)}
            />

            {/* Top Furniture Recommendations & Catalog Grid */}
            <RecommendationSection
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              onCustomizeProduct={(product) => setSelectedCustomProduct(product)}
            />

            {/* Live Custom Furniture Order & Artisan Tracker */}
            <div id="custom-order-section" className="scroll-mt-24">
              <CustomOrderTracker openModalTrigger={customModalTrigger} />
            </div>

            {/* Dedicated Customer Support & Contact Us Section */}
            <CustomerContactSection />
          </div>
        </main>

      </div>

      {/* Customization Studio Modal */}
      <CustomizationModal
        product={selectedCustomProduct}
        onClose={() => setSelectedCustomProduct(null)}
      />
    </div>
  );
};




