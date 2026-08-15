import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { HeroSlide } from '../../types/landing';
import slide1Img from '../../assets/slides/slide1.png';
import slide2Img from '../../assets/slides/slide2.png';
import slide3Img from '../../assets/slides/slide3.png';
import slide4Img from '../../assets/slides/slide4.png';

export const HeroCarousel: React.FC = () => {
  const slides: HeroSlide[] = [
    {
      id: '1',
      categoryTag: 'LIVING ROOM EDIT 2026',
      title: 'Architectural Comfort for Modern Living',
      subtitle: 'Hand-finished bouclé sectionals, solid walnut coffee tables, and organic sculptural lounge chairs.',
      image: slide1Img,
      ctaText: 'Explore Collection',
      ctaLink: '#categories',
    },
    {
      id: '2',
      categoryTag: 'DINING & SANCTUARY',
      title: 'Crafted Elegance for Gathering Spaces',
      subtitle: 'Sustainably harvested timber tables paired with ergonomically engineered dining seats.',
      image: slide2Img,
      ctaText: 'Discover Dining',
      ctaLink: '#categories',
    },
    {
      id: '3',
      categoryTag: 'RESTFUL BEDROOMS',
      title: 'Serene Minimalist Retreat Solutions',
      subtitle: 'Low-profile wooden frames, washed organic linen, and floating ambient nightstands.',
      image: slide3Img,
      ctaText: 'Explore Bedroom',
      ctaLink: '#categories',
    },
    {
      id: '4',
      categoryTag: 'LIGHTING & ACCENTS',
      title: 'Sculptural Luminescence & Object Art',
      subtitle: 'Hand-blown glass pendants, brushed brass floor lamps, and ceramic spatial accents.',
      image: slide4Img,
      ctaText: 'View Lighting',
      ctaLink: '#categories',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative w-full h-screen min-h-[660px] overflow-hidden -mt-20">
      <div className="w-full h-full relative overflow-hidden">
        {/* Full-Screen Background Image Slides */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-transform duration-[8000ms] ease-out scale-105"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            {/* Rich Dark Vignette Overlay for Crisp Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/15 to-transparent" />
          </div>
        ))}

        {/* Floating Warm Luxury Editorial Glass Card */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 sm:px-12 flex items-center pt-24 sm:pt-28">
          <div className="max-w-xl w-full bg-[#FAF7F2]/95 backdrop-blur-2xl border-2 border-[#E2D7CB] rounded-[2.5rem] p-7 sm:p-11 shadow-2xl transition-all duration-500 overflow-hidden text-[#1A1410]">
            <div className="relative z-10 space-y-4">
              <h1 className="text-3xl sm:text-5xl font-black text-[#1A1410] tracking-tight leading-[1.15]">
                {slides[currentIndex].title}
              </h1>

              <p className="text-xs sm:text-sm text-[#4A3E31] font-extrabold leading-relaxed">
                {slides[currentIndex].subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={slides[currentIndex].ctaLink}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-black tracking-wide transition-all duration-300 shadow-lg shadow-[#38A132]/30 cursor-pointer"
                >
                  <span>{slides[currentIndex].ctaText}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                <a
                  href="#customization"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-[#FAF7F2] text-[#1A1410] text-xs sm:text-sm font-black border-2 border-[#E2D7CB] shadow-sm transition-all duration-200 cursor-pointer"
                >
                  Custom Order
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Counter & Navigation Bar */}
        <div className="absolute z-20 bottom-8 right-8 sm:right-16 flex items-center gap-5 bg-white/95 backdrop-blur-2xl border-2 border-[#E2D7CB] px-6 py-3 rounded-full text-[#1A1410] shadow-2xl">
          <span className="font-black text-xs tracking-wider text-[#38A132]">
            0{currentIndex + 1} <span className="text-[#8C7C6D]">/ 0{slides.length}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E2D7CB] text-[#1A1410] hover:bg-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E2D7CB] text-[#1A1410] hover:bg-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
