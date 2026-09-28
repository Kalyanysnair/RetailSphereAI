import React from 'react';
import { Scissors, Cpu, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FabricationShowcaseSection: React.FC = () => {
  return (
    <section id="fabrication" className="scroll-mt-24 max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-10 space-y-6 relative">
      <div id="fabricate" className="absolute -top-24 left-0" />
      {/* Header Badge & Title */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/30 text-[#48A63E] text-xs font-mono font-bold uppercase tracking-wider">
          <Scissors className="w-3.5 h-3.5" /> Precision Workshop Services
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2C241D] tracking-tight">
          Timber & Board Fabrication Studio
        </h2>
        <p className="text-xs sm:text-sm text-[#7A6C5E] font-medium leading-relaxed">
          Need custom wood cutting, contour shaping, edge profiling, or CNC drilling? Submit your technical drawings or bring your own timber.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            ✂️
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">Precision Wood Cutting</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            Exact panel sizing and rip cuts for solid teak, rosewood, and marine plywood with sub-millimeter accuracy.
          </p>
        </div>

        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            🪵
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">Contour Wood Shaping</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            CNC router profiling, beveling, decorative moldings, curved edges, and custom joinery slots.
          </p>
        </div>

        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            🎯
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">Edge & Surface Finishing</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            Edge banding, satin sanding, lacquer sealing, stain matching, and high-gloss polish applications.
          </p>
        </div>

        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            🤖
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">2D Cutting Optimization</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            AI Bin-Packing algorithm calculates exact sheet layouts to minimize timber off-cut scrap and cut costs.
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="bg-gradient-to-r from-[#FAF8F5] via-[#F4ECE1] to-[#FAF8F5] border-2 border-[#E2D7CB] text-[#1A1410] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-lg font-extrabold text-[#1A1410]">Have Timber or Board Cuts Needed?</h4>
          <p className="text-xs text-[#5C4E42] font-semibold mt-1">Submit your specifications or drawings to get an instant fabrication quote.</p>
        </div>
        <Link
          to="/login?redirect=/dashboard"
          className="px-6 py-3 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-lg shadow-[#38A132]/25 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span>Request Fabrication</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};
