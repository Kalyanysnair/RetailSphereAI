import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Wrench, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export interface MachineData {
  machine_id: number;
  machine_name: string;
  category: string;
  status: string; // AVAILABLE, IN_USE, MAINTENANCE, OFFLINE
  current_job_id?: number;
  current_worker_id?: number;
  current_worker_name?: string;
  last_serviced_at?: string;
}

export const MachineryTab: React.FC = () => {
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [machineName, setMachineName] = useState('');
  const [category, setCategory] = useState('CNC Cutting');

  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/machines');
      if (res.ok) {
        const data = await res.json();
        setMachines(data);
      }
    } catch (e) {
      console.error('Failed to fetch machines:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName.trim()) return;

    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_name: machineName.trim(), category }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setMachineName('');
        fetchMachines();
      }
    } catch (e) {
      console.error('Failed to add machine:', e);
    }
  };

  const handleStatusChange = async (machineId: number, status: string) => {
    try {
      const res = await fetch(`/api/machines/${machineId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchMachines();
      }
    } catch (e) {
      console.error('Failed to update machine status:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B2C] text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            Workshop Telemetry
          </span>
          <h2 className="text-xl font-extrabold mt-2">Machine & Equipment Control Center</h2>
          <p className="text-xs text-[#D9CEBF] mt-1">Track CNC machines, routers, shapers, edge banders, and maintenance schedules.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Machine
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading machine telemetry data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {machines.map((m) => (
            <div key={m.machine_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                  <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-md border border-[#48A63E]/20">
                    MCH-#{m.machine_id}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                    m.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    m.status === 'IN_USE' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#2C241D]">{m.machine_name}</h4>
                  <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5">{m.category}</p>
                </div>

                {m.current_worker_name && (
                  <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                    <span className="text-[10px] text-[#7A6C5E] font-extrabold uppercase">Operating Worker:</span>
                    <p className="font-extrabold text-[#2C241D]">{m.current_worker_name}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-between gap-2">
                <select
                  value={m.status}
                  onChange={(e) => handleStatusChange(m.machine_id, e.target.value)}
                  className="p-2 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-bold text-[#2C241D]"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="IN_USE">IN_USE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>

                <span className="text-[10px] text-[#9E9082] font-semibold">
                  Serviced: {m.last_serviced_at ? new Date(m.last_serviced_at).toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#2C241D]">Add Workshop Machine</h3>
            <form onSubmit={handleAddMachine} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[#7A6C5E] mb-1">Machine Name</label>
                <input type="text" value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="e.g. CNC Router R500" required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
              </div>
              <div>
                <label className="block text-[#7A6C5E] mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="CNC Cutting">CNC Cutting Center</option>
                  <option value="Wood Shaper">Wood Shaper / Router</option>
                  <option value="Edge Finisher">Edge Banding Finisher</option>
                  <option value="Sander">Orbital Surface Sander</option>
                  <option value="Upholstery Press">Pneumatic Upholstery Press</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl border border-[#E2D7CB]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold">Save Machine</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
