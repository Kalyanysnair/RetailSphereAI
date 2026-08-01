import React, { useState } from 'react';
import { X, Check, Sliders, Palette, Ruler, CheckCircle2 } from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';

import { submitCustomOrderRequest } from '../../services/api_production';

interface CustomizationModalProps {
  product: RecommendationProduct | null;
  onClose: () => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ product, onClose }) => {
  if (!product) return null;

  const [selectedWood, setSelectedWood] = useState('Premium Teak Wood');
  const [selectedFabric, setSelectedFabric] = useState('Cream Bouclé');
  const [customLength, setCustomLength] = useState('220cm Standard');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitCustomOrderRequest(
        product.name,
        `${selectedWood} & ${selectedFabric}`,
        customLength,
        selectedFabric,
        notes || 'Floor plan customization request'
      );
    } catch (err) {
      console.error('Error submitting order:', err);
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-[#E6DDD3] rounded-3xl p-6 shadow-2xl space-y-5 text-[#2C241D]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/30">
              <Sliders className="w-3.5 h-3.5 text-[#48A63E]" /> Bespoke Custom Studio
            </div>
            <h2 className="text-xl font-extrabold text-[#2C241D] mt-1">
              Customize {product.name}
            </h2>
            <p className="text-xs text-[#6B5C4D] font-medium">Tailor wood finish, fabric color, and exact measurements.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#2C241D]">Custom Request Received!</h3>
            <p className="text-xs text-[#6B5C4D] max-w-xs mx-auto font-medium">
              Our master craftsmen are reviewing your specs ({selectedWood}, {selectedFabric}). A custom quotation will be sent to your email!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitCustomRequest} className="space-y-4 text-xs">
            {/* Wood Selection */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                Primary Wood Finish
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Premium Teak Wood', 'Sheesham Rosewood', 'Natural Oak', 'Dark Walnut'].map((wood) => (
                  <button
                    key={wood}
                    type="button"
                    onClick={() => setSelectedWood(wood)}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                      selectedWood === wood
                        ? 'bg-[#48A63E]/15 border-[#48A63E] text-[#2C241D] shadow-xs'
                        : 'bg-[#F9F6F0] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                    }`}
                  >
                    {wood}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric Selection */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#48A63E]" />
                Upholstery Fabric & Shade
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Cream Bouclé', 'Emerald Green Velvet', 'Warm Terracotta', 'Charcoal Grey Linen'].map((fab) => (
                  <button
                    key={fab}
                    type="button"
                    onClick={() => setSelectedFabric(fab)}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                      selectedFabric === fab
                        ? 'bg-[#48A63E]/15 border-[#48A63E] text-[#2C241D] shadow-xs'
                        : 'bg-[#F9F6F0] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                    }`}
                  >
                    {fab}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#48A63E]" />
                Custom Length & Depth
              </label>
              <input
                type="text"
                value={customLength}
                onChange={(e) => setCustomLength(e.target.value)}
                placeholder="e.g. 240cm x 100cm x 80cm"
                className="w-full px-3 py-2.5 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify brass accents, leg style, or room dimensions..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between border-t border-[#EFE7DE]">
              <div>
                <span className="block text-[11px] text-[#7A6C5E] font-medium">Estimated Custom Price</span>
                <span className="text-base font-extrabold text-[#2C241D]">
                  ₹{(product.price * 1.1).toLocaleString('en-IN')}
                </span>

              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Request Custom Build
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );


};
