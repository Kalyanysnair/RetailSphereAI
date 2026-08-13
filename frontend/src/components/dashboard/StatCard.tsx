import React from 'react';
import { IndianRupee, ShoppingBag, Heart, Truck, Award } from 'lucide-react';
import { KpiMetric } from '../../types/dashboard';

export const StatCard: React.FC<{ metric: KpiMetric }> = ({ metric }) => {
  const getIcon = () => {
    switch (metric.iconName) {
      case 'rupee':
        return <IndianRupee className="w-5 h-5 text-amber-700" />;
      case 'package':
        return <Truck className="w-5 h-5 text-emerald-700" />;
      case 'shopping':
        return <ShoppingBag className="w-5 h-5 text-amber-800" />;
      case 'trending':
        return <Award className="w-5 h-5 text-indigo-700" />;
      default:
        return <Heart className="w-5 h-5 text-rose-600" />;
    }
  };

  return (
    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {metric.title}
        </span>
        <div className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#EAE3D8]">
          {getIcon()}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {metric.value}
        </h3>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
            metric.isPositive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {metric.change}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 font-medium">
        {metric.timeframe}
      </p>
    </div>
  );
};
