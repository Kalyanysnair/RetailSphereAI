import React from 'react';
import { Award, ShieldCheck, HeartHandshake, Trees } from 'lucide-react';

export const AboutSection: React.FC = () => {
  const stats = [
    { value: '10,000+', label: 'Sanctuaries Designed', description: 'Across Kerala' },
    { value: '100%', label: 'Custom Made', description: 'Tailored to your space' },
    { value: '100%', label: 'Sustainable Timber', description: 'FSC-certified hardwoods' },
    { value: '4.9 / 5', label: 'Client Satisfaction', description: 'From 2,400+ verified homes' },
  ];

  const pillars = [
    {
      icon: Trees,
      title: 'Responsibly Harvested',
      description: 'Certified sustainable timber harvested with complete reforestation commitment.',
    },
    {
      icon: Award,
      title: 'Generational Joinery',
      description: 'Mortise and tenon wood joinery engineered for lifetime durability.',
    },
    {
      icon: ShieldCheck,
      title: '10-Year Guarantee',
      description: 'Comprehensive structural frame coverage on all signature furniture.',
    },
    {
      icon: HeartHandshake,
      title: 'White-Glove Placement',
      description: 'Scheduled home delivery, room placement, assembly, and packaging recycling.',
    },
  ];

  return (
    <section id="about" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] text-[11px] font-extrabold uppercase tracking-wider">
            DESIGN PHILOSOPHY
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C241D] tracking-tight">
            Where Craftsmanship Meets Spatial Harmony
          </h2>
          <p className="text-xs sm:text-sm text-[#524538] font-bold leading-relaxed">
            RetailSphere AI bridges timeless furniture design with intelligent spatial customization.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {stats.map((st, idx) => (
            <div
              key={idx}
              className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 text-center relative overflow-hidden shadow-lg text-[#2C241D]"
            >
              <div className="relative z-10">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#2C241D] tracking-tight block">
                  {st.value}
                </span>
                <span className="text-xs font-extrabold text-[#38A132] block mt-1.5 uppercase tracking-wider">
                  {st.label}
                </span>
                <span className="text-[11px] text-[#6B5C4D] font-bold block mt-1">
                  {st.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pil, idx) => {
            const Icon = pil.icon;
            return (
              <div
                key={idx}
                className="bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 text-[#2C241D]"
              >
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-lg text-[#2C241D]">{pil.title}</h3>
                  <p className="text-xs text-[#524538] font-bold mt-2 leading-relaxed">
                    {pil.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
