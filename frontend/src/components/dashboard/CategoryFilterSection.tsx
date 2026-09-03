import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, 
  Sofa, 
  Bed, 
  Utensils, 
  Briefcase, 
  ArrowUpDown, 
  ChevronDown,
  Check
} from 'lucide-react';
import { CategoryItem, DashboardFilterState, RecommendationProduct } from '../../types/dashboard';

interface CategoryFilterSectionProps {
  filterState: DashboardFilterState;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onResetFilters?: () => void;
  onOpenCustomOrder?: () => void;
  allProducts?: RecommendationProduct[];
  maxPriceLimit?: number;
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Featured & Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Customer Rating' },
];

export const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'living-room',
    name: 'Living Room',
    icon: 'Sofa',
    count: 6,
    subcategories: [
      { id: 'all-sub', name: 'All Living Room', count: 6 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'sofas', name: 'Sofas & Couches', count: 3 },
      { id: 'coffee-tables', name: 'Coffee Tables', count: 2 },
      { id: 'accent-chairs', name: 'Accent Chairs', count: 1 },
      { id: 'tv-units', name: 'TV Consoles', count: 1 },
    ]
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'Bed',
    count: 4,
    subcategories: [
      { id: 'all-sub', name: 'All Bedroom', count: 4 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'king-beds', name: 'Beds & Headboards', count: 2 },
      { id: 'wardrobes', name: 'Wardrobes & Storage', count: 1 },
      { id: 'nightstands', name: 'Nightstands', count: 1 },
    ]
  },
  {
    id: 'dining-room',
    name: 'Dining',
    icon: 'Utensils',
    count: 4,
    subcategories: [
      { id: 'all-sub', name: 'All Dining', count: 4 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'dining-tables', name: 'Dining Tables', count: 2 },
      { id: 'dining-chairs', name: 'Dining Chairs', count: 1 },
      { id: 'buffets', name: 'Buffets & Sideboards', count: 1 },
    ]
  },
  {
    id: 'office',
    name: 'Home Office',
    icon: 'Briefcase',
    count: 3,
    subcategories: [
      { id: 'all-sub', name: 'All Home Office', count: 3 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'desks', name: 'Desks & Workstations', count: 2 },
      { id: 'ergonomic', name: 'Ergonomic Seating', count: 1 },
      { id: 'bookshelves', name: 'Bookshelves', count: 1 },
    ]
  },
  {
    id: 'all',
    name: 'All',
    icon: 'Grid',
    count: 14,
    subcategories: [
      { id: 'all-sub', name: 'All Products', count: 14 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'sofas', name: 'Sofas & Couches', count: 4 },
      { id: 'accent-chairs', name: 'Accent Chairs', count: 3 },
      { id: 'dining-tables', name: 'Dining Tables', count: 3 },
      { id: 'king-beds', name: 'Beds', count: 2 },
      { id: 'desks', name: 'Desks', count: 2 },
    ]
  }
];

export const MATERIALS_LIST = [
  'All Materials',
  'Teak Wood',
  'Bouclé Fabric',
  'Italian Marble',
  'Italian Velvet',
  'Brass & Steel',
  'Natural Rattan',
  'Genuine Leather'
];

export const CategoryFilterSection: React.FC<CategoryFilterSectionProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  maxPriceLimit = 60000,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = CATEGORIES_DATA.find((cat) => cat.id === filterState.categoryId) || CATEGORIES_DATA[0];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sofa': return <Sofa className="w-4 h-4" />;
      case 'Bed': return <Bed className="w-4 h-4" />;
      case 'Utensils': return <Utensils className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      default: return <Grid className="w-4 h-4" />;
    }
  };

  const scrollToCollection = () => {
    const el = document.getElementById('catalog-section') || document.getElementById('recommendations-grid');
    if (el) {
      const yOffset = -85;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="catalog-section" className="space-y-3 pt-1">
      {/* 1. Category Bar */}
      <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl p-1 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="grid grid-cols-5 min-w-[500px] divide-x divide-[#E0D5C7]">
          {CATEGORIES_DATA.map((cat) => {
            const isSelected = filterState.categoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onFilterChange({ categoryId: cat.id, subcategoryId: 'all-sub' });
                  scrollToCollection();
                }}
                className={`py-2.5 px-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                  isSelected
                    ? 'bg-white rounded-xl shadow-2xs text-[#1C1814] font-black'
                    : 'text-[#5C5042] hover:text-[#1C1814] hover:bg-white/50 font-bold'
                }`}
              >
                <div className={`transition-transform group-hover:scale-110 ${isSelected ? 'text-[#48A63E]' : 'text-[#5C5042]'}`}>
                  {getCategoryIcon(cat.icon)}
                </div>
                <span className="text-[11px] leading-none whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subcategories Bar + Compact Inline Price Filter & Sort Dropdown */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-1">
        {/* Compact Subcategories Pills (Fits on one line) */}
        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none w-full md:w-auto flex-nowrap">
            {activeCategory.subcategories.map((sub) => {
              const isSubSelected = filterState.subcategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    onFilterChange({ subcategoryId: sub.id });
                    scrollToCollection();
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all flex-shrink-0 cursor-pointer whitespace-nowrap border flex items-center gap-1 ${
                    isSubSelected
                      ? 'bg-[#48A63E] text-white border-[#48A63E] shadow-2xs font-black'
                      : 'bg-white text-[#5C5042] border-[#E2D7CB] hover:bg-[#FAF7F2] hover:text-[#1C1814]'
                  }`}
                >
                  {isSubSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Compact Right Control Cluster: Price Filter, Sort Dropdown & Reset Filters Button */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
          {/* Reset All Filters Pill Button (Exact Match to User Screenshot) */}
          {onResetFilters && (filterState.categoryId !== 'all' || filterState.subcategoryId !== 'all-sub' || filterState.maxPrice < maxPriceLimit || filterState.searchQuery) && (
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                scrollToCollection();
              }}
              className="px-3.5 py-1 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white text-[10px] sm:text-[11px] font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center"
            >
              Reset All Filters
            </button>
          )}

          {/* Ultra-compact Price Range Slider */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#1C1814] shadow-2xs">
            <span className="text-[10px] sm:text-[11px] text-[#6E6458] font-bold whitespace-nowrap">Max Price:</span>
            <span className="font-mono font-extrabold text-[#48A63E] text-[10px] sm:text-[11px] whitespace-nowrap min-w-[36px]">
              ₹{(filterState.maxPrice / 1000).toFixed(0)}k
            </span>
            <input
              type="range"
              min="10000"
              max={maxPriceLimit}
              step="1000"
              value={filterState.maxPrice > maxPriceLimit ? maxPriceLimit : filterState.maxPrice}
              onChange={(e) => {
                onFilterChange({ maxPrice: Number(e.target.value) });
                scrollToCollection();
              }}
              className="w-16 sm:w-24 accent-[#48A63E] cursor-pointer"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#E2D7CB] hover:bg-[#FAF7F2] text-[10px] sm:text-xs font-extrabold text-[#1C1814] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="w-3 h-3 text-[#48A63E]" />
              <span className="truncate max-w-[100px]">
                {SORT_OPTIONS.find((s) => s.value === filterState.sortBy)?.label.split(':')[0] || 'Featured'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#6E6458]" />
            </button>

            {sortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2D7CB] rounded-2xl p-2 shadow-xl z-50 space-y-1 animate-fadeIn">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onFilterChange({ sortBy: opt.value as any });
                      setSortOpen(false);
                      scrollToCollection();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      filterState.sortBy === opt.value
                        ? 'bg-[#48A63E] text-white'
                        : 'text-[#1C1814] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filterState.sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
