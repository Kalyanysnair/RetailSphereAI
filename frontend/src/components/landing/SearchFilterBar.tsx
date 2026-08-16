import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Check } from 'lucide-react';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured Items' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedSort,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = SORT_OPTIONS.find(opt => opt.value === selectedSort)?.label || 'Featured Items';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full bg-white/65 backdrop-blur-2xl border-2 border-white/80 rounded-2xl p-3 sm:p-4 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-visible relative">
      {/* Search Input */}
      <div className="relative w-full md:w-96 z-10">
        <Search className="w-4 h-4 text-[#38A132] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search sofas, dining tables, lamps..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white/85 backdrop-blur-md border border-[#E2D7CB] rounded-xl text-[#1A1410] font-black placeholder-[#8C7C6D] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all shadow-xs"
        />
      </div>

      {/* Filter Stats & Sorting */}
      <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 z-20">
        <div className="flex items-center gap-2 text-xs font-black text-[#1A1410]">
          <SlidersHorizontal className="w-4 h-4 text-[#38A132]" />
          <span>Interactive Catalog Filter</span>
        </div>

        {/* Custom Luxury Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-black text-[#1A1410] bg-white/90 backdrop-blur-md border border-[#38A132] rounded-xl shadow-xs hover:border-[#38A132] hover:bg-white hover:shadow-md transition-all cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#38A132]" />
            <span>{currentLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#38A132] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = opt.value === selectedSort;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSortChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#38A132] text-white shadow-xs'
                        : 'text-[#2C241D] hover:bg-[#38A132]/10 hover:text-[#38A132]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
