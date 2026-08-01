import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedSort,
  onSortChange,
}) => {
  return (
    <div className="w-full bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-2xl p-3 sm:p-4 shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden relative">
      {/* Search Input */}
      <div className="relative w-full md:w-96 z-10">
        <Search className="w-4 h-4 text-[#38A132] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search sofas, dining tables, lamps..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
        />
      </div>

      {/* Filter Stats & Sorting */}
      <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 z-10">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#524538]">
          <SlidersHorizontal className="w-4 h-4 text-[#38A132]" />
          <span>Interactive Catalog Filter</span>
        </div>

        <div className="relative flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#38A132]" />
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-xs font-extrabold text-[#2C241D] bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl py-2 px-3 focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 shadow-xs"
          >
            <option value="featured" className="bg-[#FAF7F2] text-[#2C241D]">Featured Items</option>
            <option value="price-asc" className="bg-[#FAF7F2] text-[#2C241D]">Price: Low to High</option>
            <option value="price-desc" className="bg-[#FAF7F2] text-[#2C241D]">Price: High to Low</option>
            <option value="rating" className="bg-[#FAF7F2] text-[#2C241D]">Highest Rated</option>
          </select>
        </div>
      </div>
    </div>
  );
};
