import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Plus, RefreshCw } from 'lucide-react';

export interface QualityInspectionData {
  inspection_id: number;
  order_type: string;
  order_id: number;
  inspector_name?: string;
  result: string; // PASS / FAIL
  checklist: {
    dimensions: boolean;
    finishing: boolean;
    structure: boolean;
    specifications: boolean;
  };
  inspection_notes?: string;
  inspected_at?: string;
}

export interface ReworkJobData {
  rework_id: number;
  inspection_id: number;
  order_type: string;
  order_id: number;
  worker_name?: string;
  rework_reason: string;
  status: string; // ASSIGNED, RESOLVED
  created_at?: string;
}

export const QualityControlTab: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspectionData[]>([]);
  const [reworks, setReworks] = useState<ReworkJobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [orderType, setOrderType] = useState('Custom');
  const [orderId, setOrderId] = useState('1');
  const [result, setResult] = useState('PASS');
  const [dimCheck, setDimCheck] = useState(true);
  const [finishCheck, setFinishCheck] = useState(true);
  const [structCheck, setStructCheck] = useState(true);
  const [specCheck, setSpecCheck] = useState(true);
  const [notes, setNotes] = useState('All joints and dimensions meet tolerance specifications.');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resI, resR] = await Promise.all([
        fetch('/api/quality/inspections'),
        fetch('/api/quality/rework'),
      ]);

      if (resI.ok) {
        const dataI = await resI.json();
        setInspections(dataI);
      }
      if (resR.ok) {
        const dataR = await resR.json();
        setReworks(dataR);
      }
    } catch (e) {
      console.error('Failed to fetch QC data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        order_type: orderType,
        order_id: parseInt(orderId) || 1,
        result,
        dimensions_check: dimCheck,
        finishing_check: finishCheck,
        structure_check: structCheck,
        specifications_check: specCheck,
        inspection_notes: notes,
      };

      const res = await fetch('/api/quality/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error('QC Record error:', e);
    }
  };

  const handleResolveRework = async (reworkId: number) => {
    try {
      const res = await fetch(`/api/quality/rework/${reworkId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Rework completed by artisan. Re-inspected.' }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Resolve rework error:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B2C] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Quality Assurance & Rework Routing
          </span>
          <h2 className="text-xl font-extrabold mt-2">Quality Control Inspection Center</h2>
          <p className="text-xs text-[#D9CEBF] mt-1">Four-point inspection checklist, pass/fail validation, and automatic artisan rework routing.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Record Inspection
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inspections History */}
        <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
            <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#48A63E]" /> Inspection Logs ({inspections.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs font-bold text-[#7A6C5E]">Loading inspection logs...</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {inspections.map((i) => (
                <div key={i.inspection_id} className="p-3.5 rounded-2xl border border-[#E2D7CB] bg-[#FAF7F2] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2C241D]">
                      {i.order_type} Order #{i.order_id}
                    </span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-[10px] ${
                      i.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {i.result}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-[#7A6C5E] bg-white p-2 rounded-xl border border-[#E2D7CB]">
                    <span>Dimensions: {i.checklist.dimensions ? '✓ Pass' : '✗ Fail'}</span>
                    <span>Finishing: {i.checklist.finishing ? '✓ Pass' : '✗ Fail'}</span>
                    <span>Structure: {i.checklist.structure ? '✓ Pass' : '✗ Fail'}</span>
                    <span>Specs: {i.checklist.specifications ? '✓ Pass' : '✗ Fail'}</span>
                  </div>

                  {i.inspection_notes && (
                    <p className="text-[11px] text-[#2C241D] italic font-medium">"{i.inspection_notes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rework Queue */}
        <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
            <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-rose-600" /> Active Rework Jobs ({reworks.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs font-bold text-[#7A6C5E]">Loading rework queue...</div>
          ) : reworks.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-[#7A6C5E]">No active rework jobs in queue.</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {reworks.map((r) => (
                <div key={r.rework_id} className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-900">
                      Rework #{r.rework_id} (Order #{r.order_id})
                    </span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-[10px] ${
                      r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#2C241D] font-medium bg-white p-2 rounded-xl border border-rose-200">
                    Reason: {r.rework_reason}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold text-[#7A6C5E]">Assigned Artisan: {r.worker_name}</span>
                    {r.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolveRework(r.rework_id)}
                        className="px-3 py-1 rounded-lg bg-[#48A63E] text-white text-[10px] font-extrabold cursor-pointer"
                      >
                        Mark Rework Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#2C241D]">Record Quality Control Inspection</h3>
            <form onSubmit={handleRecordInspection} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Order Type</label>
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                    <option value="Custom">Custom Order</option>
                    <option value="Fabrication">Fabrication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#7A6C5E] mb-1">Order ID</label>
                  <input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} required className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-[#7A6C5E] mb-1">Inspection Result</label>
                <select value={result} onChange={(e) => setResult(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white font-extrabold">
                  <option value="PASS">PASS — Approved for Dispatch</option>
                  <option value="FAIL">FAIL — Rework Required</option>
                </select>
              </div>

              <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="block text-[10px] font-bold uppercase text-[#7A6C5E]">Inspection Checklist</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dimCheck} onChange={(e) => setDimCheck(e.target.checked)} className="accent-[#48A63E]" />
                  <span>Dimensional Accuracy (&lt; 2mm tolerance)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={finishCheck} onChange={(e) => setFinishCheck(e.target.checked)} className="accent-[#48A63E]" />
                  <span>Surface Polish & Edge Banding Smoothness</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={structCheck} onChange={(e) => setStructCheck(e.target.checked)} className="accent-[#48A63E]" />
                  <span>Joint Strength & Structural Stability</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={specCheck} onChange={(e) => setSpecCheck(e.target.checked)} className="accent-[#48A63E]" />
                  <span>Customer Specification Compliance</span>
                </label>
              </div>

              <div>
                <label className="block text-[#7A6C5E] mb-1">Inspector Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-[#E2D7CB]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold">Save Inspection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
