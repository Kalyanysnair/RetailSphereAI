import React, { useState, useEffect } from 'react';
import { Package, Plus, Upload, CheckCircle2, Clock, Layers, AlertCircle, FileText } from 'lucide-react';

export interface CustomerMaterialItem {
  material_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  material_type: string;
  wood_type?: string;
  quantity: number;
  unit: string;
  dimensions?: string;
  condition?: string;
  photos?: string;
  notes?: string;
  status: string; // REGISTERED, SUBMITTED, RECEIVED, INSPECTED, APPROVED, ALLOCATED, PARTIALLY_USED, COMPLETED
  remaining_quantity?: number;
  created_at?: string;
}

export const CustomerMaterialsTab: React.FC = () => {
  const [materials, setMaterials] = useState<CustomerMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Form State
  const [materialType, setMaterialType] = useState('Timber Wood');
  const [woodType, setWoodType] = useState('Teak');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('sq_ft');
  const [dimensions, setDimensions] = useState('8ft x 1ft x 2inch planks (Qty: 6)');
  const [condition, setCondition] = useState('Good (Seasoned Lumber)');
  const [photos, setPhotos] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const uEmail = user?.email || '';

      const res = await fetch(`/api/materials/customer?customer_email=${encodeURIComponent(uEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.warn('Error fetching customer materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos(data.url);
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;

      const payload = {
        customer_id: user?.customer_id || user?.user_id || 1,
        customer_email: user?.email || '',
        material_type: materialType,
        wood_type: woodType,
        quantity: parseFloat(quantity) || 0,
        unit,
        dimensions,
        condition,
        photos,
        notes,
      };

      const res = await fetch('/api/materials/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRegisterModalOpen(false);
        setNotes('');
        setPhotos('');
        fetchMaterials();
      }
    } catch (err) {
      console.error('Failed to register material:', err);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st.toUpperCase()) {
      case 'REGISTERED':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-300">Registered</span>;
      case 'SUBMITTED':
      case 'RECEIVED':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-blue-300">In Workshop</span>;
      case 'APPROVED':
      case 'ALLOCATED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-300">Allocated to Build</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-300">Fully Used</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B2C] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Customer-Owned Material Service
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">My Registered Materials</h2>
          <p className="text-xs text-[#D9CEBF] mt-1 max-w-xl">
            "I already have wood" — Register your own timber or fabric for custom manufacturing or fabrication. Every material remains linked strictly to your account.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-lg shadow-[#48A63E]/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Material
        </button>
      </div>

      {/* Materials List Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading your registered materials...</div>
      ) : materials.length === 0 ? (
        <div className="bg-white/80 border-2 border-[#E2D7CB] rounded-3xl p-12 text-center space-y-4 backdrop-blur-md">
          <Layers className="w-12 h-12 text-[#9E9082] mx-auto opacity-50" />
          <h3 className="text-base font-extrabold text-[#2C241D]">No Materials Registered Yet</h3>
          <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
            Have teak, mahogany, or fabric at home? Click below to register your wood and use it for custom furniture crafting or wood cutting services.
          </p>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all cursor-pointer shadow-sm"
          >
            Register My First Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((m) => (
            <div key={m.material_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                  <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-md border border-[#48A63E]/20">
                    MAT-CUST-#{m.material_id}
                  </span>
                  {getStatusBadge(m.status)}
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#2C241D]">{m.wood_type ? `${m.wood_type} (${m.material_type})` : m.material_type}</h4>
                  <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5">Condition: {m.condition || 'Good'}</p>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Registered Qty:</span>
                    <span className="font-bold text-[#2C241D]">{m.quantity} {m.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Remaining Qty:</span>
                    <span className="font-extrabold text-[#48A63E]">{m.remaining_quantity ?? m.quantity} {m.unit}</span>
                  </div>
                  {m.dimensions && (
                    <div className="flex justify-between pt-1 border-t border-[#E2D7CB]">
                      <span className="text-[#7A6C5E]">Specs:</span>
                      <span className="font-semibold text-[#2C241D]">{m.dimensions}</span>
                    </div>
                  )}
                </div>

                {m.photos && (
                  <div className="rounded-xl overflow-hidden aspect-[16/9] bg-[#FAF7F2] border border-[#E2D7CB]">
                    <img src={m.photos} alt="Material Photo" className="w-full h-full object-cover" />
                  </div>
                )}

                {m.notes && (
                  <p className="text-[11px] text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] italic">
                    "{m.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] text-[10px] text-[#9E9082] font-semibold flex items-center justify-between">
                <span>Registered On:</span>
                <span>{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Material Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Register Customer-Owned Material</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Link your timber or fabric to your profile for fabrication or custom builds.</p>
              </div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRegisterMaterial} className="space-y-4 text-xs font-semibold text-[#2C241D]">
              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Material Type</label>
                <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Timber Wood">Timber Wood / Lumber</option>
                  <option value="Wood Slabs">Natural Wood Slabs / Logs</option>
                  <option value="Upholstery Fabric">Upholstery Fabric</option>
                  <option value="Genuine Leather">Genuine Leather Sheet</option>
                  <option value="Plywood / MDF">Plywood / MDF Board</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Wood Species / Spec (Optional)</label>
                <input type="text" value={woodType} onChange={(e) => setWoodType(e.target.value)} placeholder="e.g. Teak, Mahogany, White Oak, Rosewood" className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Quantity</label>
                  <input type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                    <option value="sq_ft">sq ft (Square Feet)</option>
                    <option value="cu_ft">cu ft (Cubic Feet)</option>
                    <option value="meters">Meters</option>
                    <option value="pieces">Pieces / Planks</option>
                    <option value="kg">kg (Kilograms)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Plank / Sheet Dimensions</label>
                <input type="text" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 8ft x 1ft x 2inch planks (6 pcs)" className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Condition & Pre-treatment</label>
                <input type="text" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Seasoned, Kiln-dried, Untreated Rough Wood" className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Photo of Material (Optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="text-xs text-[#7A6C5E] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#48A63E] file:text-white cursor-pointer" />
                  {isUploading && <span className="text-[10px] text-[#48A63E] font-bold animate-pulse">Uploading photo...</span>}
                </div>
                {photos && <p className="text-[10px] text-[#48A63E] font-bold mt-1">Photo attached successfully ✓</p>}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Preferred Usage / Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe intended furniture piece or fabrication project..." className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-white cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md cursor-pointer">Submit Registration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
