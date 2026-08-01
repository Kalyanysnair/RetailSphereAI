import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, ArrowUpRight, Check } from 'lucide-react';

interface WoodOption {
  id: string;
  name: string;
  color: string;
  priceAddon: number;
}

interface FabricOption {
  id: string;
  name: string;
  color: string;
  priceAddon: number;
}

export const CustomizationSection: React.FC = () => {
  const navigate = useNavigate();

  const isLoggedIn = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('access_token'));

  const woodFinishes: WoodOption[] = [
    { id: 'walnut', name: 'American Walnut', color: '#4A3B32', priceAddon: 450 },
    { id: 'oak', name: 'Natural Oak', color: '#D4B895', priceAddon: 200 },
    { id: 'ash', name: 'Smoked Ash', color: '#2B2725', priceAddon: 350 },
    { id: 'brass', name: 'Brushed Brass', color: '#C5A880', priceAddon: 500 },
  ];

  const fabrics: FabricOption[] = [
    { id: 'boucle', name: 'Ivory Bouclé', color: '#F4F1EA', priceAddon: 300 },
    { id: 'terracotta', name: 'Terracotta Velvet', color: '#C87D55', priceAddon: 250 },
    { id: 'obsidian', name: 'Obsidian Leather', color: '#1A1817', priceAddon: 650 },
    { id: 'sage', name: 'Sage Linen', color: '#8A9A86', priceAddon: 200 },
  ];

  const [selectedWood, setSelectedWood] = useState<WoodOption>(woodFinishes[0]);
  const [selectedFabric, setSelectedFabric] = useState<FabricOption>(fabrics[0]);

  const handleLaunchStudio = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <section id="customization" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Floating Warm Luxury Glass Card Container */}
      <div className="bg-[#FAF7F2]/90 backdrop-blur-2xl border-2 border-[#E2D7CB] rounded-[2.5rem] p-8 sm:p-12 lg:p-14 shadow-2xl relative overflow-hidden transition-all duration-500 text-[#2C241D]">
        {/* Ambient Accent Glow */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#38A132]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Title, Subtitle, & Swatch Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] text-[11px] font-extrabold uppercase tracking-wider mb-3">
                BESPOKE DESIGN STUDIO
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2C241D] leading-[1.15]">
                Architectural Customization Designed for Your Floor Plan
              </h2>

              <p className="mt-4 text-xs sm:text-sm text-[#524538] font-bold leading-relaxed max-w-xl">
                Choose timber species, upholstery textures, and exact spatial dimensions to craft bespoke furniture engineered uniquely for your living sanctuary.
              </p>
            </div>

            {/* Interactive Swatches Container */}
            <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl p-5 space-y-5 max-w-lg shadow-xs">
              {/* Timber Finishes */}
              <div>
                <span className="text-xs font-extrabold text-[#2C241D] block mb-2.5">
                  1. Timber & Hardware Finish: <span className="text-[#38A132] font-extrabold">{selectedWood.name}</span>
                </span>
                <div className="flex items-center gap-3">
                  {woodFinishes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedWood(item)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        selectedWood.id === item.id
                          ? 'ring-2 ring-[#38A132] ring-offset-2 ring-offset-[#FAF7F2] scale-110 shadow-md'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    >
                      {selectedWood.id === item.id && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fabric Swatches */}
              <div>
                <span className="text-xs font-extrabold text-[#2C241D] block mb-2.5">
                  2. Luxury Fabric Upholstery: <span className="text-[#38A132] font-extrabold">{selectedFabric.name}</span>
                </span>
                <div className="flex items-center gap-3">
                  {fabrics.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedFabric(item)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border border-[#E2D7CB] ${
                        selectedFabric.id === item.id
                          ? 'ring-2 ring-[#38A132] ring-offset-2 ring-offset-[#FAF7F2] scale-110 shadow-md'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    >
                      {selectedFabric.id === item.id && <Check className="w-4 h-4 text-[#2C241D] drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Glass Card with CTA */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-8 text-center flex flex-col items-center shadow-xl relative overflow-hidden text-[#2C241D]">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#38A132]/15 border border-[#38A132]/30 flex items-center justify-center text-[#38A132] mb-5">
                  <Palette className="w-7 h-7 stroke-[2]" />
                </div>

                <h3 className="font-extrabold text-2xl tracking-tight text-[#2C241D]">
                  Launch Customizer Studio
                </h3>

                <p className="mt-2 text-xs text-[#524538] font-bold leading-relaxed">
                  Log in to your RetailSphere AI account to adjust room models, save custom material configurations, and get instant artisan pricing.
                </p>

                <div className="w-full mt-7">
                  <button
                    type="button"
                    onClick={handleLaunchStudio}
                    className="w-full py-3.5 px-5 flex items-center justify-center gap-2 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-extrabold tracking-wide transition-all duration-300 shadow-lg shadow-[#38A132]/25"
                  >
                    <span>{isLoggedIn ? 'OPEN CUSTOMIZER STUDIO' : 'LOGIN TO START CUSTOMIZATION'}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  {!isLoggedIn && (
                    <p className="mt-4 text-[11px] text-[#6B5C4D] font-bold">
                      Need an account?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="font-extrabold text-[#38A132] hover:underline"
                      >
                        Create one now
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
