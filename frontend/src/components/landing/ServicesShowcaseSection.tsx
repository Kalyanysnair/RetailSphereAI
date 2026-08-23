import React from 'react';
import { Wrench, MapPin, ShieldCheck, UserCheck, ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ServicesShowcaseSection: React.FC = () => {
  return (
    <section id="services" className="scroll-mt-24 space-y-8">
      {/* Header Badge & Title */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/30 text-[#48A63E] text-xs font-mono font-bold uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5" /> Certified Workshop Artisans
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2C241D] tracking-tight">
          On-Site Skilled Services & Customer Materials
        </h2>
        <p className="text-xs sm:text-sm text-[#7A6C5E] font-medium leading-relaxed">
          Book verified workshop craftsmen for home carpentry, sofa upholstery repair, furniture assembly, door fitting, or register your own wood for custom builds.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            🪵
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">On-Site Carpentry & Repair</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            Furniture structural reinforcement, joint re-gluing, drawer runner realignment, door hinge adjustments, and custom timber modifications at your doorstep.
          </p>
        </div>

        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            🪡
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">Sofa Upholstery & Cushioning</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            High-density PU foam replacement, premium velvet/leather fabric re-upholstery, spring sagging repairs, and seam stitching.
          </p>
        </div>

        <div className="bg-white/80 border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold text-xl">
            📦
          </div>
          <h3 className="text-base font-extrabold text-[#2C241D]">Customer-Owned Materials</h3>
          <p className="text-xs text-[#7A6C5E] leading-relaxed font-medium">
            "I already have wood" — Register your own teak or rosewood lumber to be used for custom furniture manufacturing or fabrication.
          </p>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-[#2C241D] via-[#3D3025] to-[#2C241D] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h4 className="text-lg font-extrabold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#48A63E]" /> Book an Artisan Visit for Your Home
          </h4>
          <p className="text-xs text-[#D9CEBF]">Select your preferred date, time window, and location in Kottayam or surrounding areas.</p>
        </div>
        <Link
          to="/signup"
          className="px-6 py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span>Schedule Service Visit</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};
