import React, { useState } from 'react';
import { X, Check, Sliders, Palette, Ruler, CheckCircle2, Image, UploadCloud } from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';

import { submitCustomOrderRequest } from '../../services/api_production';

interface CustomizationModalProps {
  product: RecommendationProduct | null;
  onClose: () => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ product, onClose }) => {
  if (!product) return null;

  const [selectedWood, setSelectedWood] = useState('Premium Teak Wood');
  const [customWoodInput, setCustomWoodInput] = useState('');
  const [selectedFabric, setSelectedFabric] = useState('Cream Bouclé');
  const [selectedColor, setSelectedColor] = useState('Cream White');
  const [customColorInput, setCustomColorInput] = useState('');
  const [customPickerHex, setCustomPickerHex] = useState('#38A132');
  const [customLength, setCustomLength] = useState('220cm Standard');
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>(['']);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setReferenceImageUrls((prev) => {
            const filtered = prev.filter((url) => url.trim() !== '');
            return [...filtered, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedWood === 'Other' && !customWoodInput.trim()) {
      setErrorMsg('Please specify your custom wood or material name.');
      return;
    }

    if ((selectedColor === 'Custom Color Picker' || selectedColor === 'Other') && !customColorInput.trim()) {
      setErrorMsg('Please specify your custom shade or color name.');
      return;
    }

    try {
      const finalWood = selectedWood === 'Other' ? customWoodInput.trim() : selectedWood;
      let finalColor = selectedColor;
      if (selectedColor === 'Custom Color Picker' || selectedColor === 'Other') {
        const shadeName = customColorInput.trim();
        finalColor = `${shadeName} (${customPickerHex.toUpperCase()})`;
      }
      const combinedColorFinish = `${selectedFabric} (${finalColor})`;

      const validRefImages = referenceImageUrls.map(u => u.trim()).filter(Boolean).join(', ');

      await submitCustomOrderRequest(
        product.name,
        finalWood,
        customLength,
        combinedColorFinish,
        notes.trim() || 'Floor plan customization request',
        validRefImages || undefined
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
      <div className="relative w-full max-w-lg bg-white border border-[#E6DDD3] rounded-3xl p-6 shadow-2xl space-y-5 text-[#2C241D] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/30">
              <Sliders className="w-3.5 h-3.5 text-[#48A63E]" /> Bespoke Custom Studio
            </div>
            <h2 className="text-xl font-extrabold text-[#2C241D] mt-1">
              Customize {product.name}
            </h2>
            <p className="text-xs text-[#6B5C4D] font-medium">Tailor wood finish, color palette, reference images, and exact measurements.</p>
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
              Our master craftsmen are reviewing your specs ({selectedWood === 'Other' ? customWoodInput || 'Custom' : selectedWood}, {selectedColor === 'Other' ? customColorInput || 'Custom Color' : selectedColor}). A custom quotation will be sent to your email!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitCustomRequest} className="space-y-4 text-xs" noValidate>
            {errorMsg && (
              <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-bold">
                {errorMsg}
              </div>
            )}
            {/* Wood Selection */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                Primary Wood & Structural Material
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Premium Teak Wood', 'Sheesham Rosewood', 'Natural Oak', 'Dark Walnut', 'Other'].map((wood) => (
                  <button
                    key={wood}
                    type="button"
                    onClick={() => setSelectedWood(wood)}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer ${
                      selectedWood === wood
                        ? 'bg-[#48A63E]/15 border-[#48A63E] text-[#2C241D] shadow-xs'
                        : 'bg-[#F9F6F0] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                    }`}
                  >
                    {wood === 'Other' ? '✨ Other Material' : wood}
                  </button>
                ))}
              </div>
              {selectedWood === 'Other' && (
                <div className="mt-2 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Specify Custom Wood / Material:</label>
                  <input
                    type="text"
                    placeholder="e.g. Italian Carrara Marble, Reclaimed Pine..."
                    value={customWoodInput}
                    onChange={(e) => setCustomWoodInput(e.target.value)}
                    required={selectedWood === 'Other'}
                    className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
              )}
            </div>

            {/* Color Selection with Swatches & Color Picker */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#48A63E]" />
                Color & Polish Finish Selection
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Cream White', hex: '#FDFBF7' },
                  { name: 'Emerald Green', hex: '#0B4F37' },
                  { name: 'Terracotta Orange', hex: '#C85A32' },
                  { name: 'Charcoal Grey', hex: '#2F3337' },
                  { name: 'Navy Blue', hex: '#1E293B' },
                  { name: 'Natural Teak Wax', hex: '#A87948' },
                  { name: 'Custom Color Picker', hex: 'CUSTOM_PICKER' }
                ].map((swatch) => {
                  const isSelected = selectedColor === swatch.name;
                  if (swatch.hex === 'CUSTOM_PICKER') {
                    return (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => setSelectedColor(swatch.name)}
                        className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#48A63E]/15 border-[#48A63E] text-[#2C241D] shadow-xs'
                            : 'bg-[#F9F6F0] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-dashed border-[#48A63E] flex items-center justify-center text-[9px] shrink-0">
                          🎨
                        </span>
                        <span className="truncate">Color Picker</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => setSelectedColor(swatch.name)}
                      className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#48A63E]/15 border-[#48A63E] text-[#2C241D] shadow-xs'
                          : 'bg-[#F9F6F0] border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F4ECE1]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block border border-black/20 shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="truncate">{swatch.name}</span>
                    </button>
                  );
                })}
              </div>

              {(selectedColor === 'Custom Color Picker' || selectedColor === 'Other') && (
                <div className="mt-2.5 p-3 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPickerHex}
                      onChange={(e) => setCustomPickerHex(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-[#E2D7CB] cursor-pointer bg-transparent p-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-[#2C241D]">
                      HEX: {customPickerHex.toUpperCase()}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Custom Color Name (e.g. Mint Green)..."
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
              )}
            </div>

            {/* Fabric Selection */}
            <div>
              <label className="block font-bold text-[#5C4E42] mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                Upholstery Texture & Finish Style
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

            {/* Reference Image URLs Provision (Optional Multi-Image & Drag-and-Drop) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[#5C4E42] flex items-center gap-1.5 text-xs">
                  <Image className="w-3.5 h-3.5 text-[#48A63E]" />
                  Reference Design Images (Optional - Drag & drop photos or paste URLs)
                </label>
                <button
                  type="button"
                  onClick={() => setReferenceImageUrls((prev) => [...prev, ''])}
                  className="text-[11px] font-extrabold text-[#48A63E] hover:underline cursor-pointer"
                >
                  + Add URL
                </button>
              </div>

              {/* DRAG AND DROP ZONE */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('modal-reference-file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#48A63E] bg-[#48A63E]/15 shadow-sm scale-[1.01]'
                    : 'border-[#48A63E]/40 hover:border-[#48A63E] bg-[#48A63E]/5 hover:bg-[#48A63E]/10'
                }`}
              >
                <input
                  id="modal-reference-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  <UploadCloud className="w-5 h-5 text-[#48A63E] animate-pulse" />
                  <p className="text-xs font-extrabold text-[#2C241D]">
                    Drag & drop reference images, or <span className="text-[#48A63E] underline">browse files</span>
                  </p>
                  <p className="text-[10px] font-medium text-[#7A6C5E]">
                    Supports PNG, JPG, WEBP, GIF, SVG
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {referenceImageUrls.map((url, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReferenceImageUrls((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        placeholder={url.startsWith('data:image/') ? `Uploaded file #${idx + 1}` : `Paste reference photo URL ${idx + 1}...`}
                        className="w-full px-3 py-2 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                      />
                      {referenceImageUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setReferenceImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {url.trim() && (
                      <div className="p-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={url.trim()}
                            alt={`Reference Preview ${idx + 1}`}
                            className="w-10 h-10 rounded-lg object-cover border border-[#EFE7DE] flex-shrink-0"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <span className="text-[10px] font-extrabold text-[#48A63E] flex items-center gap-1 truncate">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            {url.startsWith('data:image/') ? `Uploaded Photo #${idx + 1}` : `Photo #${idx + 1} Loaded`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
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
                className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
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
