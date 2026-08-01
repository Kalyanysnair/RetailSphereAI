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

export const DashboardPage: React.FC = () => {
  const location = useLocation();
  const [cartItemsCount, setCartItemsCount] = useState(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [selectedCustomProduct, setSelectedCustomProduct] = useState<RecommendationProduct | null>(null);
  const [customModalTrigger, setCustomModalTrigger] = useState(0);

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
    return RECOMMENDATIONS_DATA.filter((product) => {
      // Category Filter
      if (filterState.categoryId !== 'all' && product.category !== filterState.categoryId) {
        return false;
      }
      // Subcategory Filter
      if (
        filterState.subcategoryId !== 'all-sub' &&
        filterState.subcategoryId !== 'bestsellers' &&
        filterState.subcategoryId !== 'custom-ready' &&
        filterState.subcategoryId !== 'in-stock' &&
        product.subcategory !== filterState.subcategoryId
      ) {
        return false;
      }
      if (filterState.subcategoryId === 'bestsellers' && !product.badge?.includes('Bestseller')) {
        return false;
      }
      if (filterState.subcategoryId === 'custom-ready' && !product.isCustomizable) {
        return false;
      }

      // Material Filter
      if (
        filterState.material !== 'All Materials' &&
        product.material !== filterState.material
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
        if (!matchesName && !matchesMaterial && !matchesCategory) return false;
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




