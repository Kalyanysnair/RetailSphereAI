import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { CategoryFilterSection } from './CategoryFilterSection';
import { RecommendationSection, RECOMMENDATIONS_DATA } from './RecommendationSection';
import { CustomerContactSection } from './CustomerContactSection';
import { CustomizationModal } from './CustomizationModal';
import { CustomOrderTracker } from './CustomOrderTracker';
import { DashboardFilterState, RecommendationProduct } from '../../types/dashboard';

import { getCartCount } from '../../utils/cartStorage';
import { getWishlistCount } from '../../utils/wishlistStorage';
import { fetchInventoryFromDB } from '../../services/api';

export const DashboardPage: React.FC = () => {
  const location = useLocation();
  const [cartItemsCount, setCartItemsCount] = useState(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [selectedCustomProduct, setSelectedCustomProduct] = useState<RecommendationProduct | null>(null);
  const [customModalTrigger, setCustomModalTrigger] = useState(0);
  const [dbProducts, setDbProducts] = useState<RecommendationProduct[]>([]);

  useEffect(() => {
    const loadDBProducts = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const mapped: RecommendationProduct[] = dbItems.map((p: any) => {
            const rawId = p.product_id || p.id;
            const code = p.productCode || p.sku || `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;
            
            let catId = (p.category || '').toLowerCase().replace(/\s+/g, '-');
            if (catId.includes('living')) catId = 'living-room';
            else if (catId.includes('dining')) catId = 'dining-room';
            else if (catId.includes('bed')) catId = 'bedroom';
            else if (catId.includes('light')) catId = 'lighting-accents';
            else if (catId.includes('office') || catId.includes('studio')) catId = 'home-office';

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
    const sourceList = dbProducts;
    return sourceList.filter((product) => {
      // Category Filter
      if (filterState.categoryId !== 'all' && product.category !== filterState.categoryId) {
        return false;
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

        const matchesSub = subName.includes(filterSub) || 
                           prodName.includes(filterSub) || 
                           filterSub.split(' ').some(w => w.length > 3 && (prodName.includes(w) || subName.includes(w)));
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
  }, [filterState]);

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




