import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, 
  Sofa, 
  Bed, 
  Utensils, 
  Briefcase, 
  SlidersHorizontal, 
  ArrowUpDown, 
  X, 
  Search, 
  Plus, 
  Mic, 
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';
import { CategoryItem, DashboardFilterState, RecommendationProduct } from '../../types/dashboard';

interface CategoryFilterSectionProps {
  filterState: DashboardFilterState;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onResetFilters: () => void;
  onOpenCustomOrder?: () => void;
  allProducts?: RecommendationProduct[];
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Featured & AI Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Customer Rating' },
];

export const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'all',
    name: 'All Collections',
    icon: 'Grid',
    count: 14,
    subcategories: [
      { id: 'all-sub', name: 'All Products', count: 14 },
      { id: 'bestsellers', name: 'Best Sellers ⭐', count: 8 },
      { id: 'custom-ready', name: 'Customizable 🎨', count: 10 },
      { id: 'sofas', name: 'Sofas & Couches', count: 4 },
      { id: 'coffee-tables', name: 'Coffee Tables', count: 3 },
      { id: 'dining-tables', name: 'Dining Tables', count: 3 },
      { id: 'king-beds', name: 'Beds', count: 2 },
      { id: 'desks', name: 'Desks & Workstations', count: 2 },
    ]
  },
  {
    id: 'living-room',
    name: 'Living Room',
    icon: 'Sofa',
    count: 6,
    subcategories: [
      { id: 'all-sub', name: 'All Living Room', count: 6 },
      { id: 'sofas', name: 'Sofas & Couches', count: 3 },
      { id: 'coffee-tables', name: 'Coffee & Accent Tables', count: 2 },
      { id: 'accent-chairs', name: 'Accent Chairs', count: 1 },
      { id: 'tv-units', name: 'TV Consoles & Media Units', count: 1 },
    ]
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'Bed',
    count: 4,
    subcategories: [
      { id: 'all-sub', name: 'All Bedroom', count: 4 },
      { id: 'king-beds', name: 'Beds & Headboards', count: 2 },
      { id: 'wardrobes', name: 'Wardrobes & Storage', count: 1 },
      { id: 'nightstands', name: 'Nightstands & Side Tables', count: 1 },
    ]
  },
  {
    id: 'dining-room',
    name: 'Dining Room',
    icon: 'Utensils',
    count: 4,
    subcategories: [
      { id: 'all-sub', name: 'All Dining', count: 4 },
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
      { id: 'all-sub', name: 'All Office', count: 3 },
      { id: 'desks', name: 'Desks & Workstations', count: 2 },
      { id: 'ergonomic', name: 'Ergonomic Seating', count: 1 },
      { id: 'bookshelves', name: 'Bookshelves & Storage', count: 1 },
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
  onOpenCustomOrder,
}) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = CATEGORIES_DATA.find((cat) => cat.id === filterState.categoryId) || CATEGORIES_DATA[0];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sofa': return <Sofa className="w-3.5 h-3.5" />;
      case 'Bed': return <Bed className="w-3.5 h-3.5" />;
      case 'Utensils': return <Utensils className="w-3.5 h-3.5" />;
      case 'Briefcase': return <Briefcase className="w-3.5 h-3.5" />;
      default: return <Grid className="w-3.5 h-3.5" />;
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

  const activeFiltersCount = 
    (filterState.categoryId !== 'all' ? 1 : 0) +
    (filterState.subcategoryId !== 'all-sub' ? 1 : 0) +
    (filterState.material !== 'All Materials' ? 1 : 0) +
    (filterState.maxPrice < 350000 ? 1 : 0) +
    (filterState.searchQuery ? 1 : 0);

  return (
    <div id="catalog-section" className="space-y-3">
      {/* 1. Compact 80px Top Search & Action Bar (Borderless Container) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Full-width Search Input with AI & Voice Icon */}
        <div className="relative flex-1 w-full">
          <Sparkles className="w-4 h-4 text-[#387A46] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search luxury sofas, teak dining tables, velvet armchairs with AI..."
            className="w-full pl-11 pr-12 py-3 bg-white border border-[#E4DCD0] focus:border-[#387A46] rounded-full text-xs font-bold text-[#1C1814] placeholder-[#8A7E72] focus:outline-none transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filterState.searchQuery ? (
              <button onClick={() => onFilterChange({ searchQuery: '' })} className="p-1 text-[#8A7E72] hover:text-[#1C1814]">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="button" title="Voice Search" className="p-1 text-[#8A7E72] hover:text-[#387A46] transition-colors cursor-pointer">
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls: Filter Drawer Toggle, Sort Dropdown, Custom Order CTA */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-shrink-0">
          
          {/* Collapsible Filter Button */}
          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`px-4 py-3 rounded-full text-xs font-extrabold border transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_20px_rgb(0,0,0,0.03)] ${
              activeFiltersCount > 0
                ? 'bg-[#387A46] text-white border-[#387A46]'
                : 'bg-white border-[#E4DCD0] text-[#1C1814] hover:bg-[#FAF8F5]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#387A46]" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#387A46] text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="px-4 py-3 rounded-full bg-white border border-[#E4DCD0] hover:bg-[#FAF8F5] text-xs font-extrabold text-[#1C1814] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#387A46]" />
              <span className="hidden sm:inline">Sort:</span>
              <span className="truncate max-w-[100px]">
                {SORT_OPTIONS.find((s) => s.value === filterState.sortBy)?.label.split(':')[0] || 'Featured'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#6E6458]" />
            </button>

            {sortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E4DCD0] rounded-2xl p-2 shadow-xl z-50 space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onFilterChange({ sortBy: opt.value as any });
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      filterState.sortBy === opt.value
                        ? 'bg-[#387A46] text-white'
                        : 'text-[#1C1814] hover:bg-[#F1EDE6]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filterState.sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Order CTA */}
          <button
            onClick={() => {
              if (onOpenCustomOrder) onOpenCustomOrder();
              else document.getElementById('custom-order-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-3 rounded-full bg-[#1C1814] hover:bg-[#0A0807] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#387A46]" />
            <span>Custom Order</span>
          </button>
        </div>
      </div>

      {/* 2. Main Category Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES_DATA.map((cat) => {
          const isSelected = filterState.categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ categoryId: cat.id, subcategoryId: 'all-sub' })}
              className={`px-4 py-2.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? 'bg-[#387A46] text-white border-[#387A46] shadow-sm'
                  : 'bg-white/80 text-[#6E6458] border-[#E4DCD0] hover:bg-white hover:text-[#1C1814]'
              }`}
            >
              {getCategoryIcon(cat.icon)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Dedicated Subcategories Bar for Active Category */}
      {activeCategory && activeCategory.subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none border-t border-[#E4DCD0]/60 pt-2">
          <span className="text-[10px] font-black text-[#8A7E72] uppercase tracking-wider flex-shrink-0 mr-1">
            Subcategories:
          </span>
          {activeCategory.subcategories.map((sub) => {
            const isSubSelected = filterState.subcategoryId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onFilterChange({ subcategoryId: sub.id })}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all flex-shrink-0 cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  isSubSelected
                    ? 'bg-[#1C1814] text-white border-[#1C1814] shadow-sm'
                    : 'bg-white/90 text-[#524538] border-[#E4DCD0] hover:bg-white hover:text-[#1C1814]'
                }`}
              >
                <span>{sub.name}</span>
                {sub.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    isSubSelected ? 'bg-white/20 text-white' : 'bg-[#F1EDE6] text-[#6E6458]'
                  }`}>
                    {sub.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Secondary Collapsible Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#48A63E]" />
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Refine Furniture Selection</h4>
            </div>
            {activeFiltersCount > 0 && (
              <button onClick={onResetFilters} className="text-xs font-bold text-rose-600 hover:underline">
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs font-semibold text-[#2C241D]">
            {/* Price Slider */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[#7A6C5E] font-bold">Max Price:</span>
                <span className="font-extrabold text-[#48A63E]">₹{filterState.maxPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="350000"
                step="5000"
                value={filterState.maxPrice}
                onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) })}
                className="w-full accent-[#48A63E] cursor-pointer"
              />
            </div>

            {/* Material Filter */}
            <div>
              <label className="block text-[#7A6C5E] font-bold mb-1">Material Preference</label>
              <select
                value={filterState.material}
                onChange={(e) => onFilterChange({ material: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-bold text-xs"
              >
                {MATERIALS_LIST.map((mat) => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            {/* AI Picked Toggle */}
            <div className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
              <div>
                <span className="font-extrabold text-xs text-[#2C241D] block">AI Match Prioritization</span>
                <span className="text-[10px] text-[#7A6C5E]">Show highest match score items first</span>
              </div>
              <input
                type="checkbox"
                checked={filterState.subcategoryId === 'bestsellers'}
                onChange={(e) => onFilterChange({ subcategoryId: e.target.checked ? 'bestsellers' : 'all-sub' })}
                className="w-4 h-4 accent-[#48A63E] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
