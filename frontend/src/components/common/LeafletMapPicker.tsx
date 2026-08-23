import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Check, RefreshCw } from 'lucide-react';

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

        const fullAddr = `${houseNumber}${road}${road && suburb ? ', ' : ''}${suburb}, ${city}, ${state}`.trim();
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
  }, [isLeafletLoaded, coords.lat, coords.lng]);

  // Exact GPS High Accuracy Handler
  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ lat, lng });

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          markerInstanceRef.current.setLatLng([lat, lng]);
        }

        reverseGeocode(lat, lng);
      },
      (err) => {
        console.warn('GPS error:', err);
        setIsGeocoding(false);
        alert('Could not retrieve exact GPS. Please click or drag the pin on the Leaflet map.');
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
          <span>Leaflet OpenStreetMap Interactive Pin</span>
        </div>

        <button
          type="button"
          onClick={handleGPSDetect}
          disabled={isGeocoding}
          className="px-3 py-1 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <Navigation className={`w-3.5 h-3.5 ${isGeocoding ? 'animate-spin' : ''}`} />
          <span>{isGeocoding ? 'Locating...' : 'My Live GPS Pin'}</span>
        </button>
      </div>

      {/* Leaflet Map Canvas Div */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden border border-[#D9CEBF]">
        {!isLeafletLoaded ? (
          <div className="w-full h-full bg-[#FAF7F2] flex items-center justify-center text-xs font-bold text-[#7A6C5E] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#48A63E]" />
            Loading Leaflet OpenStreetMap...
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        )}
      </div>

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
