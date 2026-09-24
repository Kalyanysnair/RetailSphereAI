import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  MapPin,
  Building2,
  Phone,
  X,
  Maximize2,
  Clock,
  Compass,
  AlertCircle,
  RefreshCw,
  Route,
  CheckCircle2
} from 'lucide-react';

// Prioritized Kerala Towns & Coordinates for accurate instant routing
const KERALA_LOCATIONS: Array<{ match: string; coords: [number, number] }> = [
  // Specific Towns in Kottayam / Central Kerala (Checked FIRST before general districts)
  { match: 'ettumanoor', coords: [9.6698, 76.5623] },
  { match: 'pala', coords: [9.7099, 76.6835] },
  { match: 'palai', coords: [9.7099, 76.6835] },
  { match: 'changanassery', coords: [9.4447, 76.5413] },
  { match: 'changanacherry', coords: [9.4447, 76.5413] },
  { match: 'kanjirappally', coords: [9.5583, 76.7867] },
  { match: 'kanjirapally', coords: [9.5583, 76.7867] },
  { match: 'kaduthuruthy', coords: [9.7667, 76.4833] },
  { match: 'vaikom', coords: [9.7497, 76.3958] },
  { match: 'erattupetta', coords: [9.6917, 76.7833] },
  { match: 'kuravilangad', coords: [9.7562, 76.5667] },
  { match: 'piravom', coords: [9.8700, 76.4900] },
  { match: 'thalayolaparambu', coords: [9.7900, 76.4500] },
  { match: 'athirampuzha', coords: [9.6600, 76.5300] },
  { match: 'gandhinagar', coords: [9.6300, 76.5300] },
  { match: 'manarcad', coords: [9.5800, 76.5800] },
  { match: 'pampady', coords: [9.5700, 76.6400] },
  { match: 'ponkunnam', coords: [9.5600, 76.7500] },
  { match: 'kumarakom', coords: [9.6175, 76.4302] },
  { match: 'thodupuzha', coords: [9.8959, 76.7184] },
  { match: 'aluva', coords: [10.1076, 76.3516] },
  { match: 'kakkanad', coords: [10.0159, 76.3419] },
  { match: 'angamaly', coords: [10.1960, 76.3860] },
  { match: 'perumbavoor', coords: [10.1147, 76.4829] },
  { match: 'tripunithura', coords: [9.9490, 76.3420] },
  { match: 'cherthala', coords: [9.6845, 76.3323] },
  // Districts (Checked AFTER specific sub-towns)
  { match: 'kottayam', coords: [9.5916, 76.5222] },
  { match: 'ernakulam', coords: [9.9816, 76.2999] },
  { match: 'kochi', coords: [9.9312, 76.2673] },
  { match: 'cochin', coords: [9.9312, 76.2673] },
  { match: 'alappuzha', coords: [9.4981, 76.3388] },
  { match: 'alleppey', coords: [9.4981, 76.3388] },
  { match: 'thrissur', coords: [10.5276, 76.2144] },
  { match: 'trichur', coords: [10.5276, 76.2144] },
  { match: 'kollam', coords: [8.8932, 76.6141] },
  { match: 'quilon', coords: [8.8932, 76.6141] },
  { match: 'thiruvananthapuram', coords: [8.5241, 76.9366] },
  { match: 'trivandrum', coords: [8.5241, 76.9366] },
  { match: 'kozhikode', coords: [11.2588, 75.7804] },
  { match: 'calicut', coords: [11.2588, 75.7804] },
  { match: 'palakkad', coords: [10.7867, 76.6548] },
  { match: 'malappuram', coords: [11.0510, 76.0711] },
  { match: 'kannur', coords: [11.8745, 75.3704] }
];

// RetailSphere Operations & Manufacturing Facility Coordinates (Ettumanoor, Kottayam)
const DEFAULT_OPERATIONS_COORDS: [number, number] = [9.6698, 76.5623];

interface DeliveryRouteMapProps {
  orderId: string;
  trackingNumber: string;
  pickupAddress?: string | null;
  destinationAddress: string;
  customerName: string;
  customerPhone?: string | null;
  distanceKm?: number | null;
  deliveryStatus?: string | null;
  onClose: () => void;
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  orderId,
  trackingNumber,
  pickupAddress,
  destinationAddress,
  customerName,
  customerPhone,
  distanceKm,
  deliveryStatus,
  onClose
}) => {
  // Normalize origin operations address to Ettumanoor facility
  const normalizedPickup =
    !pickupAddress || pickupAddress.includes('Industrial Zone') || pickupAddress.includes('686001')
      ? 'RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala - 686631'
      : pickupAddress;

  const finalPickup = normalizedPickup;
  const finalDist = distanceKm || 18.5;
  const finalStatus = deliveryStatus || 'In Transit';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: number;
    durationMins: number;
    originName: string;
    destinationName: string;
  }>({
    distanceKm: finalDist,
    durationMins: Math.round(finalDist * 2.2 + 5),
    originName: 'RetailSphere Operations Facility, Ettumanoor',
    destinationName: destinationAddress
  });

  // Resolve coordinates from text or lookup dictionary
  const resolveCoordinates = (addressText: string, fallbackCoords: [number, number]): [number, number] => {
    if (!addressText) return fallbackCoords;
    const lower = addressText.toLowerCase();

    // If it mentions RetailSphere, Operations, or Ettumanoor, resolve to Ettumanoor Facility
    if (lower.includes('retailsphere') || lower.includes('ettumanoor') || lower.includes('operation') || lower.includes('facility')) {
      return DEFAULT_OPERATIONS_COORDS; // [9.6698, 76.5623]
    }

    for (const item of KERALA_LOCATIONS) {
      if (lower.includes(item.match)) {
        return item.coords;
      }
    }
    return fallbackCoords;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Determine Origin and Destination coords
    const originCoords = resolveCoordinates(finalPickup, DEFAULT_OPERATIONS_COORDS);
    
    // For destination: try to match in dictionary, else calculate realistic coordinates
    let destCoords = resolveCoordinates(destinationAddress, [
      originCoords[0] + (finalDist ? finalDist * 0.007 : 0.11),
      originCoords[1] + (finalDist ? finalDist * 0.008 : 0.14)
    ]);

    // Prevent direct overlap if destination matches origin coordinates
    if (Math.abs(destCoords[0] - originCoords[0]) < 0.005 && Math.abs(destCoords[1] - originCoords[1]) < 0.005) {
      destCoords = [originCoords[0] + 0.065, originCoords[1] + 0.075];
    }

    // Initialize Leaflet Map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView(originCoords, 12);

    mapInstanceRef.current = map;

    // Add OpenStreetMap High-Resolution Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom Origin Operations Marker (Green)
    const originIcon = L.divIcon({
      className: 'custom-map-marker-origin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
          <div style="position: absolute; width: 40px; height: 40px; background: rgba(46, 125, 50, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 32px; height: 32px; background: #2E7D32; border: 2.5px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/>
              <path d="M10 10h4"/>
              <path d="M10 14h4"/>
              <path d="M10 18h4"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    // Custom Destination Marker (Red)
    const destIcon = L.divIcon({
      className: 'custom-map-marker-destination',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
          <div style="position: absolute; width: 40px; height: 40px; background: rgba(220, 38, 38, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 32px; height: 32px; background: #DC2626; border: 2.5px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    // Add Operations Origin Marker (Ettumanoor)
    const originMarker = L.marker(originCoords, { icon: originIcon })
      .addTo(map)
      .bindTooltip("🏭 RetailSphere Operations (Ettumanoor)", {
        permanent: true,
        direction: 'top',
        offset: [0, -22],
        className: 'font-bold text-[11px] text-[#2E7D32] bg-white/95 px-2.5 py-1 rounded-xl shadow-md border border-emerald-200'
      })
      .bindPopup(`
        <div style="font-family: sans-serif; padding: 3px;">
          <strong style="color: #2E7D32; font-size: 12px; display: block; margin-bottom: 2px;">🏭 RetailSphere Operations Facility</strong>
          <span style="font-size: 11px; color: #374151;">${finalPickup}</span>
        </div>
      `);

    // Add Destination Marker
    const destMarker = L.marker(destCoords, { icon: destIcon })
      .addTo(map)
      .bindTooltip(`📍 Delivery Drop-Off: ${customerName}`, {
        permanent: true,
        direction: 'top',
        offset: [0, -22],
        className: 'font-bold text-[11px] text-[#DC2626] bg-white/95 px-2.5 py-1 rounded-xl shadow-md border border-red-200'
      })
      .bindPopup(`
        <div style="font-family: sans-serif; padding: 3px;">
          <strong style="color: #DC2626; font-size: 12px; display: block; margin-bottom: 2px;">📍 Delivery Drop-Off Location</strong>
          <span style="font-size: 11px; color: #1F2937; font-weight: bold; display: block;">${destinationAddress}</span>
          <span style="font-size: 10px; color: #4B5563;">Recipient: ${customerName}</span>
        </div>
      `);

    // Fetch Real Road Route from OSRM
    const fetchRealRoute = async () => {
      setIsLoading(true);
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates: [number, number][] = route.geometry.coordinates.map(
              (coord: [number, number]) => [coord[1], coord[0]]
            );

            // Draw Highway Road Polyline
            const roadPolyline = L.polyline(coordinates, {
              color: '#2563EB',
              weight: 5,
              opacity: 0.92,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);

            // Glowing outline underneath
            const glowPolyline = L.polyline(coordinates, {
              color: '#60A5FA',
              weight: 9,
              opacity: 0.35,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
            glowPolyline.bringToBack();

            routePolylineRef.current = roadPolyline;

            // Fit map bounds with generous padding
            map.fitBounds(roadPolyline.getBounds(), {
              padding: [50, 50],
              maxZoom: 15
            });

            const realDistKm = +(route.distance / 1000).toFixed(1);
            const realDurationMins = Math.round(route.duration / 60);

            setRouteSummary({
              distanceKm: realDistKm,
              durationMins: realDurationMins,
              originName: finalPickup,
              destinationName: destinationAddress
            });

            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('OSRM live routing fallback triggered:', err);
      }

      // Fallback Direct Route
      const directPoints: [number, number][] = [
        originCoords,
        [(originCoords[0] + destCoords[0]) / 2 + 0.008, (originCoords[1] + destCoords[1]) / 2 + 0.005],
        destCoords
      ];

      const fallbackPolyline = L.polyline(directPoints, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(map);

      routePolylineRef.current = fallbackPolyline;

      const group = L.featureGroup([originMarker, destMarker, fallbackPolyline]);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });

      setIsLoading(false);
    };

    fetchRealRoute();

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [finalPickup, destinationAddress, finalDist, customerName]);

  const fitRouteBounds = () => {
    if (mapInstanceRef.current && routePolylineRef.current) {
      mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [50, 50],
        maxZoom: 15
      });
    }
  };

  const googleMapsGpsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    finalPickup
  )}&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E2D7CB] p-5 sm:p-7 max-w-5xl w-full shadow-2xl flex flex-col gap-4 my-auto max-h-[94vh]">
        {/* Modal Top Header with Live GPS Action */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E2D7CB]/70 flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs flex-shrink-0">
              <Navigation className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[#2C241D] tracking-tight">
                  Operations to Delivery Route Navigation
                </h3>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  {orderId}
                </span>
              </div>
              <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                Waybill: <span className="font-mono font-bold text-[#2C241D]">{trackingNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={googleMapsGpsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-[#2E7D32] hover:bg-[#256628] text-white font-extrabold text-xs shadow-md shadow-[#2E7D32]/25 cursor-pointer flex items-center justify-center gap-2 transition-all"
              title="Open full turn-by-turn driving directions in Google Maps"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Live GPS Navigation</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-[#E2D7CB]"
              title="Close Route Map"
            >
              <X className="w-5.5 h-5.5" />
            </button>
          </div>
        </div>

        {/* Spacious 3-Column Top Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 text-xs">
          {/* Column 1: Origin Operations Facility (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-black text-emerald-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Origin: Operations Facility</span>
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200/90 text-emerald-900 border border-emerald-300/60">
                Ettumanoor
              </span>
            </div>
            <p className="font-bold text-[#2C241D] text-xs leading-relaxed">
              {finalPickup}
            </p>
            <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Central Production, Manufacturing & Dispatch Facility</span>
            </div>
          </div>

          {/* Column 2: Destination Drop-Off Location (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 flex flex-col justify-between gap-2 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-black text-blue-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span>Destination Drop-Off</span>
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-200/90 text-blue-900 border border-blue-300/60">
                Customer Location
              </span>
            </div>
            <p className="font-bold text-[#2C241D] text-xs leading-relaxed truncate">
              {destinationAddress}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#5C4E42] pt-1 border-t border-blue-200/60">
              <span>Recipient: <strong className="text-[#2C241D]">{customerName}</strong></span>
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold hover:bg-blue-200 flex items-center gap-1 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>

          {/* Column 3: Trip Metrics Strip (3 cols) */}
          <div className="lg:col-span-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex flex-col justify-between gap-2 shadow-xs text-center">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E2D7CB]/70">
              <div>
                <span className="text-[9px] uppercase font-black text-[#7A6C5E] block">Road Distance</span>
                <span className="text-base font-mono font-black text-[#2E7D32]">
                  {routeSummary.distanceKm} km
                </span>
              </div>
              <div className="border-l border-[#E2D7CB]/70 pl-2">
                <span className="text-[9px] uppercase font-black text-[#7A6C5E] block">Est. Drive Time</span>
                <span className="text-base font-mono font-black text-[#2C241D]">
                  ~{routeSummary.durationMins}m
                </span>
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-[#7A6C5E] block">Delivery Transit</span>
              <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full inline-block mt-0.5 border border-amber-200">
                {finalStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Wide Interactive Leaflet Route Map Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-[#E2D7CB] shadow-inner bg-[#F5ECE1] h-[360px] sm:h-[400px] w-full flex-shrink-0">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center gap-2.5 text-xs font-bold text-[#2C241D] z-10">
              <RefreshCw className="w-4.5 h-4.5 animate-spin text-emerald-600" />
              <span>Calculating live highway route from Operations Facility...</span>
            </div>
          )}

          {/* Map Overlay Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              onClick={fitRouteBounds}
              type="button"
              className="px-3 py-1.5 bg-white/95 hover:bg-white text-[#2C241D] text-xs font-bold rounded-xl shadow-md border border-[#E2D7CB] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Fit Full Route In View"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Center Route</span>
            </button>
          </div>

          {/* Route Legend Badge */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl border border-[#E2D7CB] shadow-md flex items-center gap-3.5 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
              <span>Operations Facility (Ettumanoor)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded-full bg-[#2563EB]" />
              <span>Highway Route</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Delivery Drop-Off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRouteMap;
