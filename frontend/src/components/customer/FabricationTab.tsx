import React, { useState, useEffect } from 'react';
import { Scissors, Plus, CheckCircle2, Clock, Upload, Cpu, Layers, FileText } from 'lucide-react';

export interface FabricationItem {
  fabrication_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  service_type: string;
  material_source: string;
  customer_material_id?: number;
  dimensions: string;
  quantity: number;
  drawing_image?: string;
  requirements?: string;
  deadline?: string;
  estimated_price?: number;
  status: string; // REQUESTED, ASSESSED, QUOTED, APPROVED, PAID, IN_PRODUCTION, QC_PENDING, COMPLETED, CANCELLED
  payment_status?: string;
  created_at?: string;
}

export const FabricationTab: React.FC = () => {
  const [requests, setRequests] = useState<FabricationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);

  // Form State
  const [serviceType, setServiceType] = useState('Wood Cutting');
  const [materialSource, setMaterialSource] = useState('Company Stock Material');
  const [dimensions, setDimensions] = useState('2440mm x 1220mm x 18mm Sheet');
  const [quantity, setQuantity] = useState('1');
  const [drawingImage, setDrawingImage] = useState('');
  const [requirements, setRequirements] = useState('Precision edge trimming and smooth sanding required.');
  const [deadline, setDeadline] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Optimizer State
  const [sheetW, setSheetW] = useState('2440');
  const [sheetH, setSheetH] = useState('1220');
  const [cutP1W, setCutP1W] = useState('600');
  const [cutP1H, setCutP1H] = useState('400');
  const [cutP1Qty, setCutP1Qty] = useState('4');
  const [cutP2W, setCutP2W] = useState('800');
  const [cutP2H, setCutP2H] = useState('300');
  const [cutP2Qty, setCutP2Qty] = useState('2');
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const fetchFabrications = async () => {
    try {
      setIsLoading(true);
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const uEmail = user?.email || '';

      const res = await fetch(`/api/fabrication/requests?customer_email=${encodeURIComponent(uEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.warn('Error fetching fabrication requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFabrications();
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
        setDrawingImage(data.url);
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;

      const payload = {
        customer_id: user?.customer_id || user?.user_id || 1,
        customer_email: user?.email || '',
        service_type: serviceType,
        material_source: materialSource,
        dimensions,
        quantity: parseInt(quantity) || 1,
        drawing_image: drawingImage,
        requirements,
        deadline: deadline || undefined,
      };

      const res = await fetch('/api/fabrication/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRequestModalOpen(false);
        setRequirements('');
        setDrawingImage('');
        fetchFabrications();
      }
    } catch (err) {
      console.error('Failed to create fabrication request:', err);
    }
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const payload = {
        sheet_width: parseFloat(sheetW) || 2440.0,
        sheet_height: parseFloat(sheetH) || 1220.0,
        items: [
          { width: parseFloat(cutP1W) || 600, height: parseFloat(cutP1H) || 400, quantity: parseInt(cutP1Qty) || 1, label: 'Table Top Panels' },
          { width: parseFloat(cutP2W) || 800, height: parseFloat(cutP2H) || 300, quantity: parseInt(cutP2Qty) || 1, label: 'Side Shelves' },
        ],
      };

      const res = await fetch('/api/ai/optimize-cutting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOptimizationResult(data);
      }
    } catch (err) {
      console.error('Cutting optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePayFabrication = async (fabId: number) => {
    try {
      const res = await fetch(`/api/fabrication/requests/${fabId}/pay`, { method: 'PUT' });
      if (res.ok) {
        fetchFabrications();
      }
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#2C241D] via-[#3D3025] to-[#2C241D] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Precision Workshop Services
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">Timber & Board Fabrication Studio</h2>
          <p className="text-xs text-[#D9CEBF] mt-1 max-w-xl">
            Custom wood cutting, shaping, edge profiling, drilling & surface finishing. Submit your technical drawings or use our AI 2D Sheet Cutting Optimizer tool!
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsOptimizerOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-[#48A63E]" /> 2D Cutting Optimizer
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-lg shadow-[#48A63E]/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Request Fabrication
          </button>
        </div>
      </div>

      {/* Fabrication Request Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading fabrication requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white/80 border-2 border-[#E2D7CB] rounded-3xl p-12 text-center space-y-4 backdrop-blur-md">
          <Scissors className="w-12 h-12 text-[#9E9082] mx-auto opacity-50" />
          <h3 className="text-base font-extrabold text-[#2C241D]">No Fabrication Requests Found</h3>
          <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
            Need timber cut to exact dimensions, edge profile routing, or CNC drilling? Submit your request with technical drawings or timber specifications.
          </p>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all cursor-pointer shadow-sm"
          >
            Create Fabrication Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map((r) => (
            <div key={r.fabrication_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                  <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-md border border-[#48A63E]/20">
                    FAB-#{r.fabrication_id}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-blue-300">
                    {r.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#2C241D]">{r.service_type}</h4>
                  <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5">Source: {r.material_source}</p>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Dimensions:</span>
                    <span className="font-bold text-[#2C241D]">{r.dimensions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A6C5E]">Quantity:</span>
                    <span className="font-bold text-[#2C241D]">{r.quantity} pcs</span>
                  </div>
                  {r.estimated_price && (
                    <div className="flex justify-between pt-1 border-t border-[#E2D7CB]">
                      <span className="text-[#7A6C5E]">Quote Price:</span>
                      <span className="font-extrabold text-[#48A63E]">₹{r.estimated_price.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {r.requirements && (
                  <p className="text-[11px] text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                    "{r.requirements}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9E9082] font-semibold">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                  <span className="text-[11px] font-extrabold text-[#2C241D]">
                    {r.payment_status === 'Paid' ? 'Paid ✓' : r.status === 'APPROVED' ? 'Quotation Approved' : r.status === 'QUOTED' ? 'Quotation Ready' : r.status}
                  </span>
                </div>

                {r.estimated_price && r.estimated_price > 0 && r.payment_status !== 'Paid' && (
                  <div>
                    {r.status === 'QUOTED' || r.status === 'CUSTOMER_APPROVAL_PENDING' ? (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-extrabold text-[#7A6C5E]">Quotation Details: ₹{r.estimated_price.toLocaleString('en-IN')}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/fabrication/requests/${r.fabrication_id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'APPROVED' })
                                });
                                fetchFabrications();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold cursor-pointer shadow-sm text-center"
                          >
                            Approve Quotation
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/fabrication/requests/${r.fabrication_id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'REJECTED' })
                                });
                                fetchFabrications();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold cursor-pointer text-center"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : r.status === 'APPROVED' || r.status === 'CUSTOMER_APPROVED' ? (
                      <button
                        onClick={() => handlePayFabrication(r.fabrication_id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Add to Cart & Checkout (₹{r.estimated_price.toLocaleString('en-IN')})</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Fabrication Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Request Wood Fabrication Service</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Precision cutting, shaping, drilling & edge finishing.</p>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-semibold text-[#2C241D]">
              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Required Operation</label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Wood Cutting">Wood Cutting & Panel Sizing</option>
                  <option value="Wood Shaping">Wood Shaping & Contour Routing</option>
                  <option value="Precision Drilling">CNC Precision Drilling</option>
                  <option value="Edge Finishing">Edge Profile Finishing / Banding</option>
                  <option value="Surface Finishing">Surface Sanding & Satin Polish</option>
                  <option value="Custom Fabrication">Custom Mixed Fabrication</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Material Source</label>
                <select value={materialSource} onChange={(e) => setMaterialSource(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Company Stock Material">Company Stock Material (Teak, Marine Ply, Oak)</option>
                  <option value="Customer-Owned Material">Customer-Owned Material (Registered Timber)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Target Dimensions</label>
                  <input type="text" value={dimensions} onChange={(e) => setDimensions(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Quantity (pcs)</label>
                  <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Technical Drawing / Diagram (Optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="text-xs text-[#7A6C5E] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#48A63E] file:text-white cursor-pointer" />
                  {isUploading && <span className="text-[10px] text-[#48A63E] font-bold animate-pulse">Uploading...</span>}
                </div>
                {drawingImage && <p className="text-[10px] text-[#48A63E] font-bold mt-1">Drawing attached ✓</p>}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Additional Requirements</label>
                <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="Tolerance specs, edge bevel angles, hole diameters..." className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-white cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md cursor-pointer">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2D Cutting Optimization Visualizer Tool Modal */}
      {isOptimizerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#48A63E]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#2C241D]">AI 2D Sheet Cutting Optimizer Tool</h3>
                  <p className="text-xs text-[#7A6C5E] font-medium">Algorithmic Bin-Packing Layout Solver for Timber & Plywood Sheet Cutting.</p>
                </div>
              </div>
              <button onClick={() => setIsOptimizerOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-[#2C241D]">
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <h4 className="font-extrabold text-xs text-[#48A63E] uppercase border-b border-[#E2D7CB] pb-1">1. Stock Sheet Dimensions (mm)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#7A6C5E]">Width (mm):</label>
                    <input type="number" value={sheetW} onChange={(e) => setSheetW(e.target.value)} className="w-full p-2 border border-[#E2D7CB] rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7A6C5E]">Height (mm):</label>
                    <input type="number" value={sheetH} onChange={(e) => setSheetH(e.target.value)} className="w-full p-2 border border-[#E2D7CB] rounded-lg" />
                  </div>
                </div>

                <h4 className="font-extrabold text-xs text-[#48A63E] uppercase border-b border-[#E2D7CB] pb-1 pt-2">2. Cut Pieces Required</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={cutP1W} onChange={(e) => setCutP1W(e.target.value)} placeholder="W1" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP1H} onChange={(e) => setCutP1H(e.target.value)} placeholder="H1" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP1Qty} onChange={(e) => setCutP1Qty(e.target.value)} placeholder="Qty1" className="p-2 border border-[#E2D7CB] rounded-lg text-center font-bold text-[#48A63E]" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={cutP2W} onChange={(e) => setCutP2W(e.target.value)} placeholder="W2" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP2H} onChange={(e) => setCutP2H(e.target.value)} placeholder="H2" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP2Qty} onChange={(e) => setCutP2Qty(e.target.value)} placeholder="Qty2" className="p-2 border border-[#E2D7CB] rounded-lg text-center font-bold text-[#48A63E]" />
                  </div>
                </div>

                <button
                  onClick={handleRunOptimizer}
                  disabled={isOptimizing}
                  className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer mt-2"
                >
                  {isOptimizing ? 'Running Guillotine Bin-Packing Solver...' : 'Calculate Optimal Cutting Plan'}
                </button>
              </div>

              {/* Cutting Visualization Diagram & Metrics */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                <h4 className="font-extrabold text-xs text-[#2C241D] uppercase border-b border-[#E2D7CB] pb-1">Optimization Metrics & Cutting Canvas</h4>

                {optimizationResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-800 font-bold block">Utilization Rate</span>
                        <span className="text-base font-extrabold text-emerald-700">{optimizationResult.material_utilization_percent}%</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl">
                        <span className="text-[10px] text-amber-800 font-bold block">Predicted Scrap Waste</span>
                        <span className="text-base font-extrabold text-amber-700">{optimizationResult.waste_percent}%</span>
                      </div>
                    </div>

                    {/* Canvas Representation */}
                    <div className="relative aspect-[2/1] w-full bg-[#2C241D] rounded-xl overflow-hidden border-2 border-[#E2D7CB] p-2 flex items-center justify-center">
                      <div className="relative w-full h-full bg-[#8C6D4F] rounded border border-amber-200/50">
                        {optimizationResult.placed_layout.map((item: any) => (
                          <div
                            key={item.id}
                            style={{
                              left: `${(item.x / optimizationResult.sheet_dimensions.width) * 100}%`,
                              top: `${(item.y / optimizationResult.sheet_dimensions.height) * 100}%`,
                              width: `${(item.width / optimizationResult.sheet_dimensions.width) * 100}%`,
                              height: `${(item.height / optimizationResult.sheet_dimensions.height) * 100}%`,
                            }}
                            className="absolute bg-[#48A63E]/90 border border-white text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs overflow-hidden"
                          >
                            {item.id}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-[#7A6C5E] space-y-1">
                      <p className="font-bold text-[#2C241D]">Cutting Instructions:</p>
                      {optimizationResult.cutting_sequence_instructions.map((inst: string, idx: number) => (
                        <p key={idx}>• {inst}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#7A6C5E] text-xs">
                    Click "Calculate Optimal Cutting Plan" to render visual cutting map and calculate timber waste %.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
