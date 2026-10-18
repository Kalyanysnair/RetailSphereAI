import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Check, RefreshCw, X, AlertCircle } from 'lucide-react';

export const QUICK_KERALA_PRESETS = [
  { name: 'Kottayam Central', lat: 9.5916, lng: 76.5222, address: 'Central Junction, Kottayam, Kerala - 686001', city: 'Kottayam', pincode: '686001' },
  { name: 'Ettumanoor (Hub)', lat: 9.6698, lng: 76.5623, address: 'RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala - 686631', city: 'Kottayam', pincode: '686631' },
  { name: 'Kanjirappally (AJCE)', lat: 9.5583, lng: 76.7914, address: 'Kanjirappally, Kottayam, Kerala - 686507', city: 'Kottayam', pincode: '686507' },
  { name: 'Pala', lat: 9.7099, lng: 76.6836, address: 'Main Road, Pala, Kottayam, Kerala - 686575', city: 'Kottayam', pincode: '686575' },
  { name: 'Changanassery', lat: 9.4449, lng: 76.5385, address: 'Town Center, Changanassery, Kerala - 686101', city: 'Kottayam', pincode: '686101' },
  { name: 'Kochi / Ernakulam', lat: 9.9816, lng: 76.2999, address: 'MG Road, Ernakulam, Kochi, Kerala - 682016', city: 'Ernakulam', pincode: '682016' },
];

interface LeafletMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    pincode: string;
  }) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export const LeafletMapPicker: React.FC<LeafletMapPickerProps> = ({
  initialLat = 9.5916,
  initialLng = 76.5222,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState<string>('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Load Leaflet CSS and JS dynamically if not present
  useEffect(() => {
    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Reverse Geocode helper via Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.village || '';
        const houseNumber = addr.house_number ? `${addr.house_number}, ` : '';
        const suburb = addr.suburb || addr.town || addr.county || '';
        const state = addr.state || 'Kerala';
        const city = addr.city || addr.town || addr.district || addr.county || 'Kottayam';
        const pincode = addr.postcode || '686631';

        const fullAddr = `${houseNumber}${road}${road && suburb ? ', ' : ''}${suburb}, ${city}, ${state} - ${pincode}`.trim();
        const displayAddr = fullAddr || data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

        setSelectedAddressText(displayAddr);
        onLocationSelect({
          lat,
          lng,
          address: displayAddr,
          city,
          pincode,
        });
      }
    } catch (err) {
      console.warn('Nominatim Reverse Geocoding Error:', err);
      const fallbackAddr = `Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}, Kottayam`;
      setSelectedAddressText(fallbackAddr);
      onLocationSelect({
        lat,
        lng,
        address: fallbackAddr,
        city: 'Kottayam',
        pincode: '686631',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Move map & marker to coordinates
  const moveMapTo = (lat: number, lng: number, zoom = 16) => {
    setCoords({ lat, lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom);
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: true,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Custom marker icon
      const customIcon = window.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = window.L.marker([coords.lat, coords.lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup('Drag pin to exact location').openPopup();

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        const lat = Number(position.lat.toFixed(5));
        const lng = Number(position.lng.toFixed(5));
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      map.on('click', (e: any) => {
        const lat = Number(e.latlng.lat.toFixed(5));
        const lng = Number(e.latlng.lng.toFixed(5));
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Initial reverse geocode
      reverseGeocode(coords.lat, coords.lng);
    } else {
      mapInstanceRef.current.setView([coords.lat, coords.lng], 15);
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([coords.lat, coords.lng]);
      }
    }
  }, [isLeafletLoaded]);

  // Handle Search for City/Town
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q + ', Kerala, India'
        )}&countrycodes=in&limit=4`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          // Try without forced Kerala if user searched generic
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=4`
          );
          if (fallbackRes.ok) {
            setSearchResults(await fallbackRes.json());
          }
        }
      }
    } catch (err) {
      console.warn('Search geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = Number(parseFloat(item.lat).toFixed(5));
    const lng = Number(parseFloat(item.lon).toFixed(5));
    moveMapTo(lat, lng, 16);
    setSearchResults([]);
    setSearchQuery('');
    setGpsNotice(`📍 Selected from search: ${item.display_name.split(',')[0]}`);
    reverseGeocode(lat, lng);
  };

  const handleSelectQuickPreset = (preset: typeof QUICK_KERALA_PRESETS[0]) => {
    moveMapTo(preset.lat, preset.lng, 16);
    setSelectedAddressText(preset.address);
    setGpsNotice(`📍 Pinned to: ${preset.name}`);
    onLocationSelect({
      lat: preset.lat,
      lng: preset.lng,
      address: preset.address,
      city: preset.city,
      pincode: preset.pincode,
    });
  };

  // Exact GPS High Accuracy Handler
  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeocoding(true);
    setGpsNotice('Requesting GPS satellite signal...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        moveMapTo(lat, lng, 17);

        if (accuracy > 1500) {
          setGpsNotice(
            `⚠️ Browser provided an ISP/network estimate (±${Math.round(accuracy / 1000)} km range). If this placed you in Trivandrum or another city, pick your actual town using the quick buttons or search above.`
          );
        } else {
          setGpsNotice(`✓ High-accuracy location detected (±${accuracy} meters).`);
        }

        reverseGeocode(lat, lng);
      },
      (err) => {
        console.warn('GPS error:', err);
        setIsGeocoding(false);
        setGpsNotice('Could not retrieve GPS signal. Please search your locality or click on the map.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="bg-white border-2 border-[#E2D7CB] rounded-2xl p-3 space-y-3 shadow-md">
      {/* Map Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E2D7CB] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#2C241D]">
          <MapPin className="w-4 h-4 text-[#48A63E]" />
          <span>Interactive Pin & Locality Search</span>
        </div>

        <button
          type="button"
          onClick={handleGPSDetect}
          disabled={isGeocoding}
          className="px-3 py-1 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <Navigation className={`w-3.5 h-3.5 ${isGeocoding ? 'animate-spin' : ''}`} />
          <span>{isGeocoding ? 'Locating...' : 'Auto-Detect GPS'}</span>
        </button>
      </div>

      {/* Search Input for Town / Landmark */}
      <form onSubmit={handleSearch} className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#7A6C5E] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search town, landmark, street (e.g. Kanjirappally, Pala, Kottayam)..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[#D6C9B9] bg-[#FAF7F2] text-xs font-semibold text-[#1C1814] focus:outline-none focus:border-[#48A63E]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A6C5E] hover:text-[#1C1814]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="px-3 py-1.5 rounded-xl bg-[#2C241D] hover:bg-[#1C1814] text-white text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          {isSearching ? 'Searching...' : 'Find on Map'}
        </button>
      </form>

      {/* Search Results Dropdown List */}
      {searchResults.length > 0 && (
        <div className="bg-[#FAF7F2] border border-[#D6C9B9] rounded-xl p-1.5 space-y-1 animate-fadeIn max-h-40 overflow-y-auto">
          <span className="text-[10px] font-bold text-[#7A6C5E] px-2 block">Matching Locations (Click to jump):</span>
          {searchResults.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSearchResult(item)}
              className="w-full text-left p-1.5 rounded-lg hover:bg-white text-xs font-semibold text-[#2C241D] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#48A63E] shrink-0" />
              <span className="truncate">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Town Jump Presets */}
      <div className="space-y-1">
        <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">
          Quick Town Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_KERALA_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSelectQuickPreset(p)}
              className="px-2 py-0.5 rounded-lg bg-[#FAF7F2] hover:bg-[#E8F5E9] hover:text-[#48A63E] border border-[#D6C9B9] text-[10px] font-bold text-[#5C4E42] transition-colors cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map Canvas Div */}
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-[#D9CEBF]">
        {!isLeafletLoaded ? (
          <div className="w-full h-full bg-[#FAF7F2] flex items-center justify-center text-xs font-bold text-[#7A6C5E] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#48A63E]" />
            Loading Leaflet OpenStreetMap...
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        )}
      </div>

      {/* GPS Notice / Warning Bar */}
      {gpsNotice && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-semibold text-amber-900 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{gpsNotice}</span>
        </div>
      )}

      {/* Selected Location Telemetry Bar */}
      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-xs space-y-1">
        <div className="flex items-center justify-between font-bold text-[#2C241D]">
          <span className="text-[10px] text-[#48A63E] font-extrabold uppercase">Pinned Location Address:</span>
          <span className="font-mono text-[10px] text-[#7A6C5E]">
            {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
          </span>
        </div>
        <p className="font-extrabold text-[#2C241D] text-[11px] line-clamp-2">
          {selectedAddressText || 'Click any point on the Leaflet map to set your address...'}
        </p>
      </div>
    </div>
  );
};
