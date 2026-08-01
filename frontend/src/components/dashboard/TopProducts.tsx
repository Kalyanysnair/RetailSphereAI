import React from 'react';
import { FurnitureProduct } from '../../types/dashboard';
import { PackageCheck, AlertTriangle } from 'lucide-react';

interface TopProductsProps {
  products: FurnitureProduct[];
}

export const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  return (
    <div className="bg-white border border-[#E6E1DA] rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Trending Furniture</h3>
          <p className="text-xs text-slate-500 font-medium">Most popular customer picks this week</p>
        </div>
        <span className="text-xs font-bold text-[#C87D55] hover:underline cursor-pointer">
          Explore All
        </span>
      </div>

      <div className="space-y-3.5">
        {products.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#EFECE6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F7F4EE] border border-[#E8E2D8] flex items-center justify-center text-slate-800 font-extrabold text-sm shadow-inner">
                {item.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {item.salesCount} bought
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-sm font-extrabold text-slate-900">
                ₹{item.price.toLocaleString('en-IN')}
              </span>
              <div className="mt-0.5">
                {item.status === 'In Stock' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <PackageCheck className="w-3 h-3" />
                    In stock
                  </span>
                )}
                {item.status === 'Low Stock' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    Only {item.stock} left
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
