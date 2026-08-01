import React from 'react';
import { ChartDataPoint } from '../../types/dashboard';

interface RevenueChartProps {
  data: ChartDataPoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue)) * 1.15;
  const width = 600;
  const height = 180;
  const padding = 20;

  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - (d.revenue / maxRevenue) * (height - padding * 2) - padding;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="bg-white border border-[#E6E1DA] rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Catalog Pricing & Popularity Trends</h3>
          <p className="text-xs text-slate-500 font-medium">Average category demand and price indices (in ₹ INR)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#C87D55]" />
            <span className="text-slate-700">Value (₹)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2C4A3E]" />
            <span className="text-slate-500">Popularity</span>
          </div>
        </div>
      </div>

      {/* SVG Smooth Chart */}
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          <defs>
            <linearGradient id="chartGradientLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C87D55" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C87D55" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding}
              y1={height * ratio - padding}
              x2={width - padding}
              y2={height * ratio - padding}
              stroke="#EFECE6"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradientLight)" />

          {/* Line Stroke */}
          <path d={pathD} fill="none" stroke="#C87D55" strokeWidth="3" strokeLinecap="round" />

          {/* Data Points */}
          {data.map((d, index) => {
            const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - (d.revenue / maxRevenue) * (height - padding * 2) - padding;
            return (
              <g key={d.month} className="group">
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  className="fill-white stroke-[#C87D55] stroke-[3] transition-all group-hover:r-7"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Month Labels */}
      <div className="flex justify-between px-2 mt-3 pt-3 border-t border-[#F2EFE9] text-xs font-semibold text-slate-500">
        {data.map((d) => (
          <span key={d.month}>{d.month}</span>
        ))}
      </div>
    </div>
  );
};
