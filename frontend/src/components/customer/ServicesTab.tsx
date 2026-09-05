import React, { useState, useEffect } from 'react';
import { Wrench, Plus, MapPin, Calendar, Clock, CheckCircle2, User, Phone, FileText, Navigation, Map, Compass, Check } from 'lucide-react';
import { LeafletMapPicker } from '../common/LeafletMapPicker';
import { openRazorpayCheckout } from '../../services/razorpay';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';

export interface ServiceItem {
  service_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_category: string;
  description: string;
  photos?: string;
  address: string;
  city: string;
  pincode: string;
  preferred_date?: string;
  preferred_time?: string;
  estimated_price?: number;
  status: string; // PENDING, QUOTED, APPROVED, PAID, WORKER_ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  payment_status?: string;
  jobs?: any[];
  created_at?: string;
}

const LOCATION_PRESETS = [
  { name: 'Ettumanoor, Kottayam', address: 'Ettumanoor Town Center, MC Road', city: 'Kottayam', pincode: '686631', lat: 9.5916, lng: 76.5222 },
  { name: 'Kanjikuzhy, Kottayam', address: 'Near Ruby Arena, Kanjikuzhy', city: 'Kottayam', pincode: '686004', lat: 9.5852, lng: 76.5412 },
  { name: 'Pala, Kottayam', address: 'Main Bus Stand Area, Pala', city: 'Kottayam', pincode: '686575', lat: 9.7107, lng: 76.6841 },
  { name: 'Changanassery, Kottayam', address: 'Bypass Junction, Changanassery', city: 'Kottayam', pincode: '686101', lat: 9.4450, lng: 76.5400 },
  { name: 'Thiruvalla Town', address: 'TK Road, Thiruvalla', city: 'Pathanamthitta', pincode: '689101', lat: 9.3834, lng: 76.5741 },
];

export const ServicesTab: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form State
  const [category, setCategory] = useState('On-Site Carpentry & Structural Repair');
  const [description, setDescription] = useState('Dining table leg repair and drawer slide realignment.');
  const [address, setAddress] = useState('Ettumanoor, Kottayam, Kerala');
  const [city, setCity] = useState('Kottayam');
  const [pincode, setPincode] = useState('686631');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (9 AM - 1 PM)');
  const [photos, setPhotos] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Location / Map Picker State
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 9.5916, lng: 76.5222 });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const uEmail = user?.email || '';

      const res = await fetch(`/api/services/requests?customer_email=${encodeURIComponent(uEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (err) {
      console.warn('Error fetching service requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusMessage('Acquiring high-accuracy GPS satellite signal...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setSelectedCoords({ lat, lng });

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
            const fetchedCity = addr.city || addr.town || addr.district || addr.county || 'Kottayam';
            const fetchedPincode = addr.postcode || '686631';

            const fullAddr = `${houseNumber}${road}${road && suburb ? ', ' : ''}${suburb}, ${fetchedCity}, ${state}`.trim();
            const finalAddress = fullAddr || `GPS Pin (${lat}, ${lng})`;
            
            setAddress(finalAddress);
            setCity(fetchedCity);
            setPincode(fetchedPincode);
            setIsDetectingGps(false);
            setGpsStatusMessage(`📍 Exact Live GPS Address: ${finalAddress}`);
            return;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setAddress(`GPS Pin (${lat}, ${lng}), Ettumanoor, Kottayam`);
        setCity('Kottayam');
        setPincode('686631');
        setIsDetectingGps(false);
        setGpsStatusMessage(`📍 Live GPS Coordinates Pinned: ${lat}° N, ${lng}° E`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsDetectingGps(false);
        setSelectedCoords({ lat: 9.5916, lng: 76.5222 });
        setAddress('Ettumanoor Town Center, Kottayam, Kerala');
        setCity('Kottayam');
        setPincode('686631');
        setGpsStatusMessage('📍 Default Pin Set: Ettumanoor, Kottayam (9.5916° N, 76.5222° E). Use Leaflet map below to adjust.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSelectPresetLocation = (preset: typeof LOCATION_PRESETS[0]) => {
    setSelectedCoords({ lat: preset.lat, lng: preset.lng });
    setAddress(preset.address);
    setCity(preset.city);
    setPincode(preset.pincode);
    setGpsStatusMessage(`📍 Map Pinned: ${preset.name} (${preset.lat}° N, ${preset.lng}° E)`);
  };

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;

      const payload = {
        customer_id: user?.customer_id || user?.user_id || 1,
        customer_email: user?.email || '',
        service_category: category,
        description,
        address,
        city,
        pincode,
        preferred_date: preferredDate || new Date().toISOString().split('T')[0],
        preferred_time: preferredTime,
        photos,
      };

      const res = await fetch('/api/services/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsBookModalOpen(false);
        fetchServices();
      }
    } catch (err) {
      console.error('Failed to book service:', err);
    }
  };

  const handlePayService = async (s: ServiceItem) => {
    try {
      const rawUser = localStorage.getItem('user');
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      const amountInPaise = Math.round((s.estimated_price || 0) * 100);

      await openRazorpayCheckout({
        amount: amountInPaise,
        name: 'RetailSphere On-Site Services',
        description: `Service Payment for SRV-#${s.service_id} (${s.service_category})`,
        prefill: {
          name: userObj?.full_name || userObj?.username || 'Valued Customer',
          email: userObj?.email || 'customer@retailsphere.com',
          contact: userObj?.phone || '9876543210'
        },
        onSuccess: async (paymentId) => {
          try {
            const res = await fetch(`/api/services/requests/${s.service_id}/pay`, { method: 'PUT' });
            if (res.ok) {
              fetchServices();
            }
          } catch (err) {
            console.error('Payment confirmation error:', err);
          }
        },
        onFailure: (reason) => {
          console.warn('Service payment cancelled/failed:', reason);
        }
      });
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#2C241D] via-[#4A3B2C] to-[#2C241D] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#48A63E] bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/30 font-bold">
            On-Site Skilled Services
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">Artisan On-Site Service Platform</h2>
          <p className="text-xs text-[#D9CEBF] mt-1 max-w-xl">
            Book certified workshop artisans for home carpentry, sofa upholstery repair, furniture assembly, door installation & polishing. Staff verified worker matching.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-lg shadow-[#48A63E]/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Book On-Site Service
        </button>
      </div>

      {/* Services List Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading your service bookings...</div>
      ) : services.length === 0 ? (
        <div className="bg-white/80 border-2 border-[#E2D7CB] rounded-3xl p-12 text-center space-y-4 backdrop-blur-md">
          <Wrench className="w-12 h-12 text-[#9E9082] mx-auto opacity-50" />
          <h3 className="text-base font-extrabold text-[#2C241D]">No Service Bookings Found</h3>
          <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
            Need an artisan at your home for furniture repair, assembly, or re-upholstery? Schedule a visit with your preferred date and time.
          </p>
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all cursor-pointer shadow-sm"
          >
            Book On-Site Service Visit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <div key={s.service_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#48A63E] rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                  <span className="font-mono text-[10px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-md border border-[#48A63E]/20">
                    SRV-#{s.service_id}
                  </span>
                  <span className={`${getStatusBadgeColor(s.status)} text-[10px] font-extrabold px-2.5 py-1 rounded-full border`}>
                    {s.payment_status === 'Paid' ? 'Paid ✓' : formatStatusLabel(s.status)}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-[#2C241D]">{s.service_category}</h4>
                  <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#48A63E]" /> {s.address}, {s.city}
                  </p>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6C5E] flex items-center gap-1"><Calendar className="w-3 h-3 text-[#48A63E]" /> Preferred Date:</span>
                    <span className="font-bold text-[#2C241D]">{s.preferred_date || 'Flexible'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7A6C5E] flex items-center gap-1"><Clock className="w-3 h-3 text-[#48A63E]" /> Preferred Time:</span>
                    <span className="font-semibold text-[#2C241D]">{s.preferred_time}</span>
                  </div>

                  {s.jobs && s.jobs.length > 0 && (
                    <div className="pt-2 border-t border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] text-[#48A63E] font-extrabold uppercase">Assigned Artisan:</span>
                      <p className="font-extrabold text-[#2C241D]">{s.jobs[0].worker_name}</p>
                    </div>
                  )}

                  {s.estimated_price && (
                    <div className="flex justify-between pt-1 border-t border-[#E2D7CB]">
                      <span className="text-[#7A6C5E]">Service Quote:</span>
                      <span className="font-extrabold text-[#48A63E]">₹{s.estimated_price.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] italic">
                  "{s.description}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-between">
                <span className="text-[10px] text-[#9E9082] font-semibold">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                </span>
                {s.estimated_price && s.status === 'QUOTED' && s.payment_status !== 'Paid' && (
                  <button
                    onClick={() => handlePayService(s)}
                    className="px-4 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold cursor-pointer shadow-sm"
                  >
                    Approve & Pay ₹{s.estimated_price.toLocaleString('en-IN')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Service Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Book On-Site Skilled Artisan</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Home carpentry, upholstery, assembly, repair & polishing.</p>
              </div>
              <button onClick={() => setIsBookModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleBookService} className="space-y-4 text-xs font-semibold text-[#2C241D]">
              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Service Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="On-Site Carpentry & Structural Repair">On-Site Carpentry & Structural Repair</option>
                  <option value="Sofa Upholstery & Foam Repair">Sofa Upholstery & Foam Repair</option>
                  <option value="Furniture Assembly & Fitting">Furniture Assembly & Fitting</option>
                  <option value="Furniture Repair & Polish Refinishing">Furniture Repair & Polish Refinishing</option>
                  <option value="Door & Modular Cabinet Installation">Door & Modular Cabinet Installation</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Issue Description / Work Required</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required placeholder="Describe damaged parts, furniture dimensions, or assembly requirements..." className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              {/* SERVICE LOCATION / ADDRESS WITH DETECT GPS & MAP PICKER */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase">Service Location / Address</label>

                  <div className="flex items-center gap-2">
                    {/* Detect GPS Button */}
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isDetectingGps}
                      className="px-2.5 py-1 rounded-lg bg-[#48A63E]/10 hover:bg-[#48A63E]/20 text-[#48A63E] border border-[#48A63E]/30 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                      title="Detect current location using GPS"
                    >
                      <Navigation className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                      <span>{isDetectingGps ? 'Detecting...' : 'Detect GPS'}</span>
                    </button>

                    {/* Pick on Map Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(!isMapOpen)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                        isMapOpen
                          ? 'bg-[#2C241D] text-white border-[#2C241D]'
                          : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <Map className="w-3 h-3 text-[#48A63E]" />
                      <span>{isMapOpen ? 'Hide Map' : 'Pick on Map 🗺️'}</span>
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Street address, house number, area..."
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-semibold text-xs"
                />

                {/* GPS Status Message Feedback */}
                {gpsStatusMessage && (
                  <p className="text-[10px] text-[#48A63E] font-bold flex items-center gap-1 bg-[#48A63E]/10 p-2 rounded-lg border border-[#48A63E]/20">
                    <Compass className="w-3 h-3" />
                    <span>{gpsStatusMessage}</span>
                  </p>
                )}

                {/* REAL LEAFLET OPENSTREETMAP INTERACTIVE MAP PICKER */}
                {isMapOpen && (
                  <LeafletMapPicker
                    initialLat={selectedCoords.lat}
                    initialLng={selectedCoords.lng}
                    onLocationSelect={(loc) => {
                      setSelectedCoords({ lat: loc.lat, lng: loc.lng });
                      setAddress(loc.address);
                      setCity(loc.city);
                      setPincode(loc.pincode);
                      setGpsStatusMessage(`📍 Leaflet Location Pinned: ${loc.address}`);
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Pincode</label>
                  <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Preferred Date</label>
                  <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Preferred Time Window</label>
                  <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                    <option value="Morning (9 AM - 1 PM)">Morning (9 AM - 1 PM)</option>
                    <option value="Afternoon (1 PM - 5 PM)">Afternoon (1 PM - 5 PM)</option>
                    <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Photo of Furniture / Issue (Optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="text-xs text-[#7A6C5E] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#48A63E] file:text-white cursor-pointer" />
                  {isUploading && <span className="text-[10px] text-[#48A63E] font-bold animate-pulse">Uploading...</span>}
                </div>
                {photos && <p className="text-[10px] text-[#48A63E] font-bold mt-1">Photo attached ✓</p>}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button type="button" onClick={() => setIsBookModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-white cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md cursor-pointer">Book Service Visit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
