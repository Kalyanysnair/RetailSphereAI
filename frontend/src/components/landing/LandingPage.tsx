import React from 'react';
import { HeaderNav } from './HeaderNav';
import { HeroCarousel } from './HeroCarousel';
import { CategorySection } from './CategorySection';
import { CustomizationSection } from './CustomizationSection';
import { FabricationShowcaseSection } from './FabricationShowcaseSection';
import { ServicesShowcaseSection } from './ServicesShowcaseSection';
import { AboutSection } from './AboutSection';
import { ContactSection } from './ContactSection';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full font-sans text-[#2C241D] selection:bg-[#38A132] selection:text-white overflow-x-hidden">
      {/* High Resolution Ambient Warm Living Room Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
        aria-hidden="true"
      />

      {/* Warm Cream Luxury Gradient Overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/60 via-[#F3EDE5]/45 to-[#EAE1D5]/60 pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="relative z-50">
        <HeaderNav />
      </div>

      {/* Main Content Modules */}
      <main className="relative z-10">
        {/* 1st Section: Full-Screen Hero Carousel (Kept as earlier) */}
        <HeroCarousel />

        {/* 2nd Part Onwards: Wrapped inside Master Luxury Glass Card Container (Matching other pages) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full ultra-glass-panel rounded-[2.5rem] p-6 sm:p-10 shadow-2xl transition-all duration-300 relative space-y-12 sm:space-y-16">
            <CategorySection />
            <CustomizationSection />
            <FabricationShowcaseSection />
            <AboutSection />
            <ContactSection />
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
};
