import React, { useState } from 'react';
import { Package, Wrench, Scissors, Layers, DollarSign, FileText } from 'lucide-react';
import { MyOrdersPage } from '../orders/MyOrdersPage';
import { CustomOrderTracker } from '../dashboard/CustomOrderTracker';
import { CustomerMaterialsTab } from './CustomerMaterialsTab';
import { FabricationTab } from './FabricationTab';
import { ServicesTab } from './ServicesTab';

interface MyActivityTabProps {
  initialSubTab?: 'orders' | 'custom' | 'fabrication' | 'services' | 'materials' | 'quotes';
}

export const MyActivityTab: React.FC<MyActivityTabProps> = ({ initialSubTab = 'custom' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'custom' | 'fabrication' | 'services' | 'materials' | 'quotes'>(initialSubTab);

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar */}
      <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-2.5 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('custom')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'custom'
              ? 'bg-[#2C241D] text-white shadow-md'
              : 'text-[#7A6C5E] hover:bg-[#FAF7F2] hover:text-[#2C241D]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#48A63E]" /> Custom Furniture Requests
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'orders'
              ? 'bg-[#2C241D] text-white shadow-md'
              : 'text-[#7A6C5E] hover:bg-[#FAF7F2] hover:text-[#2C241D]'
          }`}
        >
          <Package className="w-4 h-4 text-[#48A63E]" /> E-Commerce Orders
        </button>

        <button
          onClick={() => setActiveSubTab('fabrication')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'fabrication'
              ? 'bg-[#2C241D] text-white shadow-md'
              : 'text-[#7A6C5E] hover:bg-[#FAF7F2] hover:text-[#2C241D]'
          }`}
        >
          <Scissors className="w-4 h-4 text-[#48A63E]" /> Fabrication Requests
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'services'
              ? 'bg-[#2C241D] text-white shadow-md'
              : 'text-[#7A6C5E] hover:bg-[#FAF7F2] hover:text-[#2C241D]'
          }`}
        >
          <Wrench className="w-4 h-4 text-[#48A63E]" /> Service Bookings
        </button>

        <button
          onClick={() => setActiveSubTab('materials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'materials'
              ? 'bg-[#2C241D] text-white shadow-md'
              : 'text-[#7A6C5E] hover:bg-[#FAF7F2] hover:text-[#2C241D]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#48A63E]" /> My Wood & Materials
        </button>
      </div>

      {/* Dynamic Sub-Tab Content Rendering */}
      <div>
        {activeSubTab === 'custom' && <CustomOrderTracker />}
        {activeSubTab === 'orders' && <MyOrdersPage hideHeader={true} />}
        {activeSubTab === 'fabrication' && <FabricationTab />}
        {activeSubTab === 'services' && <ServicesTab />}
        {activeSubTab === 'materials' && <CustomerMaterialsTab />}
      </div>
    </div>
  );
};
