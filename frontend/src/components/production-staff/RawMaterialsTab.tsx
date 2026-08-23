import React, { useState, useEffect } from 'react';
import { Layers, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface RawMaterialData {
  material_id: number;
  category: string;
  material_name: string;
  unit: string;
  available_qty: number;
  reserved_qty: number;
  used_qty: number;
  wasted_qty: number;
  reorder_level: number;
  unit_cost: number;
  status: string;
}

export const RawMaterialsTab: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [category, setCategory] = useState('Timber');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('100');
  const [unit, setUnit] = useState('sq_ft');
  const [reorder, setReorder] = useState('20');
  const [unitCost, setUnitCost] = useState('1200');

  const fetchRawMaterials = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/materials/raw');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (e) {
      console.error('Failed to fetch raw materials:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  const handleAddRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/materials/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          material_name: name.trim(),
          available_qty: parseFloat(qty) || 0,
          unit,
          reorder_level: parseFloat(reorder) || 10,
          unit_cost: parseFloat(unitCost) || 0,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setName('');
        fetchRawMaterials();
      }
    } catch (e) {
      console.error('Failed to add raw material:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B2C] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Raw Inventory Control
          </span>
          <h2 className="text-xl font-extrabold mt-2">Manufacturing Raw Materials Stock</h2>
          <p className="text-xs text-[#D9CEBF] mt-1">Timber planks, plywood sheets, velvet upholstery fabric, foam & hardware joinery.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Stock Material
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading raw material stock levels...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((m) => (
            <div key={m.material_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                  <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-md border border-[#48A63E]/20">
                    RAW-#{m.material_id}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                    m.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#2C241D]">{m.material_name}</h4>
                  <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5">{m.category}</p>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Available Stock:</span>
                    <span className="font-extrabold text-[#48A63E]">{m.available_qty} {m.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Reserved for Builds:</span>
                    <span className="font-bold text-[#2C241D]">{m.reserved_qty} {m.unit}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E2D7CB]">
                    <span className="text-[#7A6C5E]">Unit Cost:</span>
                    <span className="font-bold text-[#2C241D]">₹{m.unit_cost} / {m.unit}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] text-[10px] text-[#9E9082] font-semibold flex items-center justify-between">
                <span>Reorder Threshold:</span>
                <span>{m.reorder_level} {m.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#2C241D]">Add Raw Manufacturing Material</h3>
            <form onSubmit={handleAddRawMaterial} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[#7A6C5E] mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Timber">Timber Wood</option>
                  <option value="Plywood">Plywood / MDF</option>
                  <option value="Fabric">Upholstery Fabric</option>
                  <option value="Foam">High-Density PU Foam</option>
                  <option value="Hardware">Hardware & Fasteners</option>
                </select>
              </div>
              <div>
                <label className="block text-[#7A6C5E] mb-1">Material Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teak Wood Planks" required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Available Qty</label>
                  <input type="number" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Unit</label>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Reorder Level</label>
                  <input type="number" step="0.1" value={reorder} onChange={(e) => setReorder(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Unit Cost (₹)</label>
                  <input type="number" step="0.1" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl border border-[#E2D7CB]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold">Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
