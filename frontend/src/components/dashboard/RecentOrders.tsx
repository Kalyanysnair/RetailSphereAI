import React from 'react';
import { FurnitureOrder } from '../../types/dashboard';
import { CheckCircle2, Clock, Truck } from 'lucide-react';

interface RecentOrdersProps {
  orders: FurnitureOrder[];
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  const getStatusBadge = (status: FurnitureOrder['status']) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Delivered
          </span>
        );
      case 'In Transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3.5 h-3.5" />
            In Transit
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Processing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-[#E6E1DA] rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">My Recent Purchases</h3>
          <p className="text-xs text-slate-500 font-medium">Track your placed furniture orders & delivery status</p>
        </div>
        <span className="text-xs font-bold text-[#C87D55] hover:underline cursor-pointer">
          View All Orders
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#F2EFE9] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 px-2">Order ID</th>
              <th className="pb-3 px-3">Item Purchased</th>
              <th className="pb-3 px-3">Amount (₹)</th>
              <th className="pb-3 px-3">Delivery Status</th>
              <th className="pb-3 px-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F6F4F0] text-sm">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3.5 px-2 font-mono text-xs font-bold text-[#C87D55]">
                  {order.id}
                </td>
                <td className="py-3.5 px-3 font-semibold text-slate-900">
                  {order.productName}
                </td>
                <td className="py-3.5 px-3 font-extrabold text-slate-900">
                  ₹{order.amount.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-3">
                  {getStatusBadge(order.status)}
                </td>
                <td className="py-3.5 px-2 text-right text-xs font-medium text-slate-500">
                  {order.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
