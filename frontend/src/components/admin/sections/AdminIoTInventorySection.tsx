import React, { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Wifi,
  WifiOff,
  AlertTriangle,
  PackageCheck
} from 'lucide-react';
import {
  fetchIoTInventoryStatus,
  fetchIoTInventoryHistory,
  IoTInventoryMovement,
  IoTInventoryStatusResponse
} from '../../../services/api_iot';
import { formatToIST } from '../../../utils/timeUtils';

export const AdminIoTInventorySection: React.FC = () => {
  const [statusData, setStatusData] = useState<IoTInventoryStatusResponse | null>(null);
  const [historyMovements, setHistoryMovements] = useState<IoTInventoryMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFetchingRef = useRef<boolean>(false);

  const loadData = async (silent: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      setErrorMsg(null);
      const [statusRes, histRes] = await Promise.all([
        fetchIoTInventoryStatus(),
        fetchIoTInventoryHistory(undefined, 25)
      ]);

      setStatusData(statusRes);
      setHistoryMovements(histRes || []);
    } catch (err: any) {
      console.error('Failed to load IoT inventory data:', err);
      setErrorMsg(err.message || 'Unable to retrieve IoT inventory data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Automatic background refresh every 15 seconds (paused when tab is hidden)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadData(true);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // Status computation
  const currentStock = statusData?.current_stock ?? 0;
  const totalEntries = statusData?.total_entries ?? 0;
  const totalExits = statusData?.total_exits ?? 0;
  const lastMovement = statusData?.last_movement;
  const freshnessStatus = statusData?.freshness?.status || (statusData?.has_data ? 'OFFLINE' : 'NO_DATA');

  // Format date time helper in Asia/Kolkata IST
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const formatted = formatToIST(isoString, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      return formatted || isoString;
    } catch {
      return isoString;
    }
  };

  // Sensor status badge helper
  const renderSensorStatus = () => {
    if (freshnessStatus === 'ONLINE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          Online
        </span>
      );
    }
    if (freshnessStatus === 'OFFLINE' || freshnessStatus === 'STALE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <WifiOff className="w-3.5 h-3.5" />
          Offline
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        No Data
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & CONTROLS                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#38A132]/10 border border-[#38A132]/20 flex items-center justify-center text-[#38A132] shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-[#2C241D] tracking-tight">
                IoT Inventory Monitoring
              </h2>
              {renderSensorStatus()}
            </div>
            <p className="text-xs font-semibold text-[#7A6C5E] mt-0.5">
              Live stock counts detected by warehouse gate sensors
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={isRefreshing}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE3] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh current inventory state"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#38A132] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OFFLINE ALERT WARNING                                         */}
      {/* ------------------------------------------------------------- */}
      {(freshnessStatus === 'OFFLINE' || freshnessStatus === 'STALE') && statusData?.has_data && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold block">Sensor Node Offline</span>
            <span className="text-amber-800">
              The ESP32 sensor has not reported within the expected window. Displayed counts reflect the last confirmed database state.
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ERROR NOTICE (IF ANY)                                         */}
      {/* ------------------------------------------------------------- */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <span className="font-bold block">Telemetry Error</span>
            <span className="text-rose-800">{errorMsg}</span>
          </div>
          <button
            onClick={() => loadData(false)}
            className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LOADING STATE                                                 */}
      {/* ------------------------------------------------------------- */}
      {loading && !statusData ? (
        <div className="bg-white rounded-3xl border border-[#E2D7CB] p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-3 border-[#38A132] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#2C241D]">Loading inventory data...</p>
          <p className="text-xs text-[#7A6C5E] mt-1">Connecting to warehouse sensor ledger</p>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* TOP SUMMARY: HERO STOCK CARD + COMPACT METRICS                */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* HERO CARD: CURRENT STOCK (MAIN EMPHASIS) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-white to-[#FAF7F2] p-6 sm:p-8 rounded-3xl border-2 border-[#38A132]/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-[#38A132] tracking-wider font-mono bg-[#38A132]/10 px-2.5 py-1 rounded-lg">
                  Authoritative Stock
                </span>
                <Boxes className="w-6 h-6 text-[#38A132]/70" />
              </div>

              <div className="my-6">
                <span className="text-xs font-bold text-[#7A6C5E] block uppercase tracking-wider mb-1">
                  Current Furniture Stock
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl sm:text-7xl font-black text-[#2C241D] font-mono tracking-tight">
                    {currentStock}
                  </span>
                  <span className="text-sm font-bold text-[#7A6C5E]">units</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2D7CB]/60 flex items-center justify-between text-xs text-[#7A6C5E]">
                <span>Status:</span>
                <span className="font-bold text-[#2C241D]">
                  {currentStock === 0 ? 'Out of Stock' : `${currentStock} items in storage`}
                </span>
              </div>
            </div>

            {/* COMPACT METRIC CARDS (3 CARDS) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* CARD 1: TOTAL ENTRIES */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider font-mono">
                    Total Entries
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-black text-[#2C241D] font-mono block">
                    {totalEntries}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">Items received</span>
                </div>
                <span className="text-[10px] text-[#8F745D] font-medium block">
                  Detected entering storage
                </span>
              </div>

              {/* CARD 2: TOTAL EXITS */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider font-mono">
                    Total Exits
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-black text-[#2C241D] font-mono block">
                    {totalExits}
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold">Items dispatched</span>
                </div>
                <span className="text-[10px] text-[#8F745D] font-medium block">
                  Detected leaving storage
                </span>
              </div>

              {/* CARD 3: LAST MOVEMENT */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider font-mono">
                    Last Movement
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                    lastMovement?.direction === 'IN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : (lastMovement?.direction === 'OUT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                  }`}>
                    {lastMovement?.direction || 'NONE'}
                  </span>
                </div>
                <div className="my-3">
                  <span className="text-lg font-black text-[#2C241D] block">
                    {lastMovement?.direction === 'IN' ? 'Item Entered' : (lastMovement?.direction === 'OUT' ? 'Item Exited' : 'No movements')}
                  </span>
                  <span className="text-[11px] text-[#7A6C5E] font-medium block truncate">
                    {lastMovement?.timestamp ? formatDateTime(lastMovement.timestamp) : 'Awaiting sensor event'}
                  </span>
                </div>
                <span className="text-[10px] text-[#8F745D] font-medium block">
                  Sensor gate activity
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RECENT MOVEMENTS TABLE                                        */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E2D7CB] flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#2C241D] tracking-tight">
                  Recent Movements
                </h3>
                <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                  Latest furniture detected passing through the gate
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#7A6C5E] bg-[#FAF7F2] border border-[#E2D7CB] px-2.5 py-1 rounded-lg">
                {historyMovements.length} record{historyMovements.length !== 1 ? 's' : ''}
              </span>
            </div>

            {historyMovements.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="w-10 h-10 text-[#C4B29E] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2C241D]">No movements detected yet</p>
                <p className="text-xs text-[#7A6C5E] mt-1">
                  Items passing through the two FC-51 IR sensors will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] text-[#7A6C5E] uppercase text-[10px] font-mono font-black border-b border-[#E2D7CB]">
                    <tr>
                      <th className="py-3 px-5">Timestamp</th>
                      <th className="py-3 px-5">Direction</th>
                      <th className="py-3 px-5 text-right">Stock After Movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DE]">
                    {historyMovements.map((mov) => {
                      const isEntry = mov.direction === 'IN';
                      return (
                        <tr key={mov.movement_id} className="hover:bg-[#FCFAF7] transition-colors">
                          {/* TIMESTAMP */}
                          <td className="py-3.5 px-5 font-medium text-[#2C241D] whitespace-nowrap">
                            {formatDateTime(mov.created_at)}
                          </td>

                          {/* DIRECTION */}
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                              isEntry
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              {isEntry ? (
                                <>
                                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                  IN
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                                  OUT
                                </>
                              )}
                            </span>
                          </td>

                          {/* STOCK AFTER */}
                          <td className="py-3.5 px-5 text-right font-mono font-black text-sm text-[#2C241D] whitespace-nowrap">
                            {mov.stock_after}{' '}
                            <span className="text-[11px] font-normal text-[#7A6C5E]">units</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
