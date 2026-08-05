import React from 'react';
import { 
  Grid, 
  Sofa, 
  Bed, 
  Utensils, 
  Briefcase, 
  Palette,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Search,
  Plus
} from 'lucide-react';
import { CategoryItem, DashboardFilterState } from '../../types/dashboard';

interface CategoryFilterSectionProps {
  filterState: DashboardFilterState;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onResetFilters: () => void;
  onOpenCustomOrder?: () => void;
}

export const CATEGORIES_DATA: CategoryItem[] = [
  {
    id: 'all',
    name: 'All Collections',
    icon: 'Grid',
    count: 24,
    subcategories: [
      { id: 'all-sub', name: 'All', count: 24 },
      { id: 'bestsellers', name: 'Bestsellers', count: 8 },
      { id: 'custom-ready', name: 'Custom Made', count: 6 },
      { id: 'in-stock', name: 'Ready to Ship', count: 12 },
    ]
  },
  {
    id: 'living-room',
    name: 'Living Room',
    icon: 'Sofa',
    count: 8,
    subcategories: [
      { id: 'sofas', name: 'Luxury Sofas', count: 4 },
      { id: 'accent-chairs', name: 'Accent Chairs', count: 2 },
      { id: 'coffee-tables', name: 'Coffee Tables', count: 2 },
    ]
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'Bed',
    count: 5,
    subcategories: [
      { id: 'king-beds', name: 'King & Queen Beds', count: 3 },
      { id: 'nightstands', name: 'Nightstands', count: 2 },
    ]
  },
  {
    id: 'dining-room',
    name: 'Dining Room',
    icon: 'Utensils',
    count: 5,
    subcategories: [
      { id: 'dining-tables', name: 'Dining Tables', count: 3 },
      { id: 'dining-chairs', name: 'Dining Chairs', count: 2 },
    ]
  },
  {
    id: 'office',
    name: 'Home Office',
    icon: 'Briefcase',
    count: 3,
    subcategories: [
      { id: 'desks', name: 'Executive Desks', count: 2 },
      { id: 'ergonomic', name: 'Ergonomic Chairs', count: 1 },
    ]
  },
  {
    id: 'custom-studio',
    name: 'Custom Studio',
    icon: 'Palette',
    count: 3,
    subcategories: [
      { id: 'custom-sofas', name: 'Bespoke Sofas', count: 2 },
      { id: 'custom-wood', name: 'Teak Woodwork', count: 1 },
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
  'Full Grain Leather'
];

export const CategoryFilterSection: React.FC<CategoryFilterSectionProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  onOpenCustomOrder,
}) => {
  const activeCategory = CATEGORIES_DATA.find((c) => c.id === filterState.categoryId) || CATEGORIES_DATA[0];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sofa': return <Sofa className="w-4 h-4" />;
      case 'Bed': return <Bed className="w-4 h-4" />;
      case 'Utensils': return <Utensils className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'Palette': return <Palette className="w-4 h-4" />;
      default: return <Grid className="w-4 h-4" />;
    }
  };

  const hasActiveFilters = 
    filterState.categoryId !== 'all' ||
    filterState.subcategoryId !== 'all-sub' ||
    filterState.material !== 'All Materials' ||
    filterState.maxPrice < 350000 ||
    filterState.searchQuery !== '';

  return (
    <div id="catalog-section" className="space-y-4">
      {/* Search Bar & + Custom Order Button Row */}
      <div className="flex items-center gap-3 w-full max-w-4xl mx-auto mb-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-[#48A63E] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search luxury sofas, teak wood dining tables, velvet chairs..."
            className="w-full pl-12 pr-10 py-3.5 text-sm ultra-glass-pill rounded-full text-[#2C241D] placeholder-[#9E9082] focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 transition-all font-medium"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#9E9082] hover:text-[#2C241D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenCustomOrder) {
              onOpenCustomOrder();
            } else {
              const el = document.getElementById('custom-order-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="py-3.5 px-5 rounded-full bg-[#48A63E] hover:bg-[#3d9134] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-[#48A63E]/25 transition-all flex-shrink-0 cursor-pointer"
          title="Configure Bespoke Custom Furniture Order"
        >
          <Plus className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Custom Order</span>
          <span className="sm:hidden">Custom</span>
        </button>
      </div>

      {/* Top Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center">
        {CATEGORIES_DATA.map((cat) => {
          const isSelected = filterState.categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                onFilterChange({
                  categoryId: cat.id,
                  subcategoryId: cat.subcategories[0]?.id || 'all-sub'
                });
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-300 ${
                isSelected
                  ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/25 scale-[1.02] border-2 border-[#48A63E]'
                  : 'bg-[#FAF7F2] border-2 border-[#E2D7CB] text-[#5C4E42] hover:text-[#2C241D] hover:border-[#48A63E]'
              }`}
            >
              {getCategoryIcon(cat.icon)}
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isSelected ? 'bg-white/20 text-white font-extrabold' : 'bg-[#F4ECE1] text-[#2C241D] font-extrabold'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar on Customer Catalog */}
      <div className="relative max-w-xl mx-auto mb-4">
        <Search className="w-4 h-4 text-[#9E9082] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search furniture title, material finish, color, category..."
          value={filterState.searchQuery || ''}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          className="w-full pl-11 pr-4 py-3 text-xs bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-full text-[#2C241D] font-extrabold focus:outline-none focus:border-[#48A63E] shadow-sm transition-all placeholder-[#9E9082]"
        />
        {filterState.searchQuery && (
          <button
            onClick={() => onFilterChange({ searchQuery: '' })}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#7A6C5E] hover:text-[#2C241D] rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Subcategory Chips & Quick Filters Bar */}
      <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-[2rem] p-5 shadow-sm space-y-4">


        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
          {/* Subcategories Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#7A6C5E] mr-1 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" />
              Filter:
            </span>
            {activeCategory.subcategories.map((sub) => {
              const isSelected = filterState.subcategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onFilterChange({ subcategoryId: sub.id })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#48A63E] text-white shadow-sm font-bold'
                      : 'bg-[#F5ECE1]/80 border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#EAE0D4] hover:text-[#2C241D]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline transition-colors ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Material & Sorting Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Material Select */}
          <div>
            <label className="block text-[11px] font-bold text-[#5C4E42] mb-1">
              Material Finish
            </label>
            <select
              value={filterState.material}
              onChange={(e) => onFilterChange({ material: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E] font-semibold"
            >
              {MATERIALS_LIST.map((mat) => (
                <option key={mat} value={mat} className="bg-white text-[#2C241D]">
                  {mat}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#5C4E42] mb-1">
              <span>Max Budget:</span>
              <span className="text-[#2C241D] font-extrabold">₹{filterState.maxPrice.toLocaleString('en-IN')}</span>

            </div>
            <input
              type="range"
              min="20000"
              max="350000"
              step="10000"
              value={filterState.maxPrice}
              onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) })}
              className="w-full accent-[#48A63E] bg-[#EAE1D5] rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-bold text-[#5C4E42] mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-[#48A63E]" />
              Sort Furniture By
            </label>
            <select
              value={filterState.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E] font-semibold"
            >
              <option value="recommended" className="bg-white text-[#2C241D]">Featured & Recommended</option>
              <option value="price-low" className="bg-white text-[#2C241D]">Price: Low to High</option>
              <option value="price-high" className="bg-white text-[#2C241D]">Price: High to Low</option>
              <option value="rating" className="bg-white text-[#2C241D]">Highest Customer Rating</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

};

