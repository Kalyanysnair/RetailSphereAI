import React, { useState } from 'react';
import { Sparkles, Plus, Wrench, Scissors, Bot, X } from 'lucide-react';

interface QuickActionsFabProps {
  onSelectTab: (tab: string) => void;
}

export const QuickActionsFab: React.FC<QuickActionsFabProps> = ({ onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Expandable Options */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 animate-fadeIn mb-2">
          <button
            onClick={() => {
              onSelectTab('assistant');
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold shadow-xl border border-white/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <Bot className="w-4 h-4 text-[#48A63E]" />
            <span>AI Furniture Assistant</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('create');
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold shadow-xl border border-white/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#48A63E]" />
            <span>Custom Furniture Studio</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('fabricate');
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold shadow-xl border border-white/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <Scissors className="w-4 h-4 text-[#48A63E]" />
            <span>2D Cutting Optimizer</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('services');
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold shadow-xl border border-white/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-4 h-4 text-[#48A63E]" />
            <span>Book Skilled Service Visit</span>
          </button>
        </div>
      )}

      {/* Main Trigger FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 border-2 border-white cursor-pointer"
        title="Quick Actions & AI Studio"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
      </button>
    </div>
  );
};
