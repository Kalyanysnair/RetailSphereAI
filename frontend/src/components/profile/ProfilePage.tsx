import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  X, 
  ShoppingBag, 
  Heart, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  Package,
  Tag,
  Bell,
  Copy,
  Check,
  Gift,
  KeyRound,
  Navigation,
  Plus,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { getCurrentUser, updateUserProfile, UserProfile } from '../../services/api';
import { getCartItems } from '../../utils/cartStorage';
import { getWishlistItems } from '../../utils/wishlistStorage';
import { getCustomerNotificationsApi, CustomerNotification } from '../../services/api_coupons';
import { ChangePasswordModal } from '../common/ChangePasswordModal';
import { validatePhoneNumber } from '../auth/SignupForm';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAddressRequired = searchParams.get('address_required') === 'true';

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Cart & Wishlist counts
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Edit Profile & Password Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delivery Address Dedicated Feature State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressErrorMsg, setAddressErrorMsg] = useState<string | null>(null);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  const fetchProfileFromDB = async () => {
    setLoading(true);
    try {
      const data = await getCurrentUser();
      if (data) {
        setUserProfile(data);
        if (isAddressRequired && (!data.customer?.address || !data.customer.address.trim())) {
          handleOpenAddressModal(data);
        }
      } else {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserProfile(parsed);
          if (isAddressRequired && (!parsed.customer?.address || !parsed.customer.address.trim())) {
            handleOpenAddressModal(parsed);
          }
        }
      }
    } catch (err) {
      console.error('Error loading database profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const [myNotifs, setMyNotifs] = useState<CustomerNotification[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const refreshCustomerNotifs = async () => {
    try {
      const notifs = await getCustomerNotificationsApi();
      setMyNotifs(notifs);
    } catch {
      setMyNotifs([]);
    }
  };

  useEffect(() => {
    fetchProfileFromDB();
    setCartCount(getCartItems().length);
    setWishlistCount(getWishlistItems().length);

    refreshCustomerNotifs();
    window.addEventListener('customer-notifications-updated', refreshCustomerNotifs);
    window.addEventListener('storage', refreshCustomerNotifs);
    return () => {
      window.removeEventListener('customer-notifications-updated', refreshCustomerNotifs);
      window.removeEventListener('storage', refreshCustomerNotifs);
    };
  }, []);

  const handleOpenEdit = () => {
    if (!userProfile) return;
    setEditForm({
      full_name: userProfile.full_name || '',
      phone: userProfile.phone || '',
      address: userProfile.customer?.address || '',
      city: userProfile.customer?.city || '',
      state: userProfile.customer?.state || '',
      pincode: userProfile.customer?.pincode || '',
    });
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleOpenAddressModal = (profileOverride?: UserProfile | null) => {
    const prof = profileOverride || userProfile;
    if (!prof) return;

    const existingAddr = prof.customer?.address || '';
    let line1 = existingAddr;
    let line2 = '';
    let lmark = '';

    if (existingAddr.includes('(Landmark:')) {
      const match = existingAddr.match(/^(.*?)(?:\s*\((?:Landmark:\s*)?(.*?)\))?$/i);
      if (match) {
        line1 = match[1] || existingAddr;
        lmark = match[2] || '';
      }
    }

    if (line1.includes(',')) {
      const parts = line1.split(',').map((p) => p.trim());
      line1 = parts[0] || '';
      line2 = parts.slice(1).join(', ') || '';
    }

    setAddressForm({
      full_name: prof.full_name || '',
      phone: prof.phone || '',
      address_line1: line1,
      address_line2: line2,
      city: prof.customer?.city || '',
      state: prof.customer?.state || '',
      pincode: prof.customer?.pincode || '',
      landmark: lmark,
    });
    setAddressErrorMsg(null);
    setLocationStatus(null);
    setIsAddressModalOpen(true);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setAddressErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationStatus('Requesting location permission...');
    setAddressErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setLocationStatus('Obtaining address details from coordinates...');
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error('Could not fetch location details.');
          const data = await res.json();
          const addressObj = data.address || {};
          
          const road = addressObj.road || addressObj.pedestrian || addressObj.suburb || addressObj.neighbourhood || '';
          const cityVal = addressObj.city || addressObj.town || addressObj.village || addressObj.county || '';
          const stateVal = addressObj.state || '';
          const pinVal = addressObj.postcode ? addressObj.postcode.replace(/\D/g, '').slice(0, 6) : '';

          setAddressForm((prev) => ({
            ...prev,
            address_line1: road || prev.address_line1 || 'Current Location',
            city: cityVal || prev.city,
            state: stateVal || prev.state,
            pincode: pinVal || prev.pincode,
          }));

          setLocationStatus('✓ Location details loaded! Please review and click Save.');
        } catch (err: any) {
          setAddressErrorMsg('Could not auto-determine address from coordinates. Please enter manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (geoError) => {
        setIsLocating(false);
        setLocationStatus(null);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setAddressErrorMsg('Location permission denied. Please enter your address manually.');
        } else {
          setAddressErrorMsg('Could not determine location. Please enter your address manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressErrorMsg(null);

    const name = addressForm.full_name.trim();
    const phone = addressForm.phone.trim();
    const line1 = addressForm.address_line1.trim();
    const city = addressForm.city.trim();
    const state = addressForm.state.trim();
    const pincode = addressForm.pincode.trim();

    if (!name) {
      setAddressErrorMsg('Full Name is required.');
      return;
    }
    if (!phone) {
      setAddressErrorMsg('Phone Number is required.');
      return;
    }
    const phoneErr = validatePhoneNumber(phone);
    if (phoneErr) {
      setAddressErrorMsg(phoneErr);
      return;
    }

    if (!line1) {
      setAddressErrorMsg('Address Line 1 is required.');
      return;
    }
    if (!city) {
      setAddressErrorMsg('City is required.');
      return;
    }
    if (!state) {
      setAddressErrorMsg('State is required.');
      return;
    }
    if (!pincode) {
      setAddressErrorMsg('PIN Code is required.');
      return;
    }
    if (!/^\d{6}$/.test(pincode)) {
      setAddressErrorMsg('PIN Code must be a valid 6-digit postal code (e.g. 686001).');
      return;
    }

    let finalAddress = line1;
    if (addressForm.address_line2.trim()) {
      finalAddress += `, ${addressForm.address_line2.trim()}`;
    }
    if (addressForm.landmark.trim()) {
      finalAddress += ` (Landmark: ${addressForm.landmark.trim()})`;
    }

    setAddressSubmitting(true);
    try {
      const updated = await updateUserProfile({
        full_name: name,
        phone: phone,
        address: finalAddress,
        city: city,
        state: state,
        pincode: pincode,
      });

      setUserProfile(updated);
      setIsAddressModalOpen(false);
      setAddressSuccessMsg('Delivery address saved successfully!');
      setTimeout(() => setAddressSuccessMsg(null), 4000);

      if (searchParams.get('address_required')) {
        navigate('/profile', { replace: true });
      }
    } catch (err: any) {
      setAddressErrorMsg(err.message || 'Failed to save delivery address.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameTrim = editForm.full_name.trim();
    if (!nameTrim) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (nameTrim.length < 2 || !/^[a-zA-Z\s.'-]+$/.test(nameTrim)) {
      setErrorMsg('Full Name must be at least 2 characters long and contain letters only (e.g. Alex Smith).');
      return;
    }

    if (editForm.phone && editForm.phone.trim()) {
      const phoneErr = validatePhoneNumber(editForm.phone);
      if (phoneErr) {
        setErrorMsg(phoneErr);
        return;
      }
    }

    if (editForm.pincode && editForm.pincode.trim()) {
      const pinClean = editForm.pincode.trim();
      if (!/^\d{6}$/.test(pinClean)) {
        setErrorMsg('Pincode must be a valid 6-digit postal code (e.g. 686001).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const updated = await updateUserProfile({
        full_name: nameTrim,
        phone: editForm.phone ? editForm.phone.trim() : undefined,
        address: editForm.address ? editForm.address.trim() : undefined,
        city: editForm.city ? editForm.city.trim() : undefined,
        state: editForm.state ? editForm.state.trim() : undefined,
        pincode: editForm.pincode ? editForm.pincode.trim() : undefined,
      });

      setUserProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const userInitials = userProfile?.full_name
    ? userProfile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'CU';

  const hasSavedAddress = Boolean(userProfile?.customer?.address && userProfile.customer.address.trim());

  return (
    <div className="relative min-h-screen text-[#2C241D] flex flex-col selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Ambient Warm Luxury Living Room Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />

      {/* Lighter Translucent Warm Cream Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Floating Header Navigation */}
        <Header cartCount={cartCount} wishlistCount={wishlistCount} />

        {/* Main Central Semi-Transparent Glass Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto pt-3">
          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-5 lg:p-6 pt-3 sm:pt-4 space-y-4 relative overflow-hidden">
            {/* Glossy Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {loading ? (
              <div className="py-20 text-center space-y-3 relative z-10">
                <Loader2 className="w-8 h-8 text-[#48A63E] animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#2C241D]">Loading profile data...</p>
              </div>
            ) : (
              <>
                {/* Required Address Banner (After Order if No Address Saved) */}
                {isAddressRequired && !hasSavedAddress && (
                  <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 p-4 rounded-2xl text-xs font-extrabold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-fadeIn relative z-10">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-black">Delivery Address Required for Order</p>
                        <p className="text-xs font-semibold text-amber-800 mt-0.5">
                          Please add your delivery address to continue with your order.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenAddressModal()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-xs shrink-0 cursor-pointer"
                    >
                      Add Address Now
                    </button>
                  </div>
                )}

                {/* Profile Header Banner */}
                <div className="relative z-10 ultra-glass-card rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {/* Large Avatar */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-[#48A63E]/30 border-2 border-white">
                      {userInitials}
                    </div>

                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
                        {userProfile?.full_name}
                      </h1>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium flex items-center gap-2 justify-center sm:justify-start">
                        <span>{userProfile?.email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
                    <button
                      onClick={() => setIsChangePasswordOpen(true)}
                      className="px-4 py-2 rounded-xl bg-white border border-[#E2D7CB] hover:bg-[#FAF7F2] text-[#2C241D] text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-[#48A63E]" /> Change Password
                    </button>
                    <button
                      onClick={handleOpenEdit}
                      className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  </div>
                </div>

                {/* Notification Toasts */}
                {successMsg && (
                  <div className="bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] p-3 rounded-2xl text-xs font-bold text-center animate-fadeIn relative z-10">
                    {successMsg}
                  </div>
                )}
                {addressSuccessMsg && (
                  <div className="bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] p-3 rounded-2xl text-xs font-bold text-center animate-fadeIn relative z-10 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                    <span>{addressSuccessMsg}</span>
                  </div>
                )}

                {/* Detailed Personal Information Card */}
                <div className="relative z-10 ultra-glass-card rounded-3xl p-4 sm:p-5 space-y-4">
                  <h2 className="text-base font-extrabold text-[#2C241D] border-b border-[#EFE7DE] pb-2.5 flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-[#48A63E]" /> Personal Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-bold text-[#7A6C5E] uppercase block flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#48A63E]" /> Full Name
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#2C241D] block">
                        {userProfile?.full_name || 'Not Provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-bold text-[#7A6C5E] uppercase block flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#48A63E]" /> Registered Email ID
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#2C241D] block">
                        {userProfile?.email || 'Not Provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-bold text-[#7A6C5E] uppercase block flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#48A63E]" /> Phone Number
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#2C241D] block">
                        {userProfile?.phone || 'Not Provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dedicated Delivery Address Section */}
                <div className="relative z-10 ultra-glass-card rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                    <h2 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5 text-[#48A63E]" /> Delivery Address
                    </h2>
                    {hasSavedAddress && (
                      <button
                        onClick={() => handleOpenAddressModal()}
                        className="px-3.5 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Address
                      </button>
                    )}
                  </div>

                  {hasSavedAddress ? (
                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-2">
                        <span className="font-extrabold text-sm text-[#2C241D]">
                          {userProfile?.full_name}
                        </span>
                        <span className="text-xs font-bold text-[#6B5C4D]">
                          {userProfile?.phone || 'No phone'}
                        </span>
                      </div>
                      <div className="text-xs text-[#2C241D] space-y-1">
                        <p className="font-semibold text-[#2C241D]">{userProfile?.customer?.address}</p>
                        <p className="font-extrabold text-[#48A63E]">
                          {userProfile?.customer?.city}, {userProfile?.customer?.state} - {userProfile?.customer?.pincode}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#2C241D]">Delivery address not added</h3>
                        <p className="text-xs text-[#7A6C5E] mt-0.5 font-medium max-w-md mx-auto">
                          Add a saved delivery address to complete orders and receive delivery shipments.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddressModal()}
                        className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-md shadow-[#48A63E]/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Delivery Address
                      </button>
                    </div>
                  )}
                </div>

                {/* My Notifications & Exclusive Coupons Section */}
                <div className="relative z-10 ultra-glass-card rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                    <h2 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                      <Bell className="w-4.5 h-4.5 text-[#48A63E]" /> My Notifications & Exclusive Coupons
                    </h2>
                    <span className="text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-md border border-[#48A63E]/20">
                      {myNotifs.length} Active Notifications
                    </span>
                  </div>

                  {myNotifs.length === 0 ? (
                    <div className="py-6 text-center text-[#7A6C5E] space-y-1 bg-[#F9F6F0] rounded-2xl border border-[#E2D7CB]">
                      <Bell className="w-8 h-8 text-[#9E9082] mx-auto opacity-50" />
                      <p className="font-extrabold text-xs text-[#2C241D]">No notifications or coupons assigned yet</p>
                      <p className="text-[11px]">Exclusive discount coupon codes issued by retail staff & admin will appear here!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myNotifs.map((n) => (
                        <div key={n.id} className="p-4 rounded-2xl bg-white border-2 border-[#48A63E]/30 space-y-2.5 shadow-sm hover:border-[#48A63E] transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs uppercase tracking-wider text-[#48A63E] flex items-center gap-1.5 bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg">
                              <Tag className="w-3.5 h-3.5" /> Exclusive Discount
                            </span>
                            <span className="text-[10px] font-mono text-[#8C7C6D]">{n.createdDate}</span>
                          </div>

                          <p className="text-xs font-bold text-[#2C241D] leading-snug">{n.message}</p>

                          <div className="pt-1.5 flex items-center justify-between border-t border-[#EFE7DE]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-sm text-[#48A63E] bg-[#48A63E]/15 px-3 py-1 rounded-xl border border-[#48A63E]/30">
                                {n.couponCode}
                              </span>
                              <span className="text-xs font-extrabold text-[#2C241D]">
                                {n.discountPercent}% OFF
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(n.couponCode);
                                setCopiedCode(n.couponCode);
                                setTimeout(() => setCopiedCode(null), 3000);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-extrabold text-white bg-[#48A63E] hover:bg-[#3D9134] px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              {copiedCode === n.couponCode ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE7DE] relative z-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/orders"
                      className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 transition-all inline-flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>My Orders & Tracking</span>
                    </Link>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#2C241D] border border-[#E2D7CB] text-xs font-bold transition-all cursor-pointer"
                  >
                    Back to Furniture Store
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Dedicated Delivery Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E6DDD3] rounded-3xl p-6 shadow-2xl space-y-5 text-[#2C241D] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#48A63E]" />
                <h3 className="text-lg font-extrabold text-[#2C241D]">
                  {hasSavedAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 text-[#9E9082] hover:text-[#2C241D] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Location Option */}
            <div className="bg-[#F9F6F0] border border-[#E2D7CB] p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[#2C241D] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#48A63E]" /> Quick Fill with Current Location
                </p>
                <p className="text-[11px] text-[#7A6C5E] mt-0.5 font-medium">
                  Use your device location to pre-fill address fields. You can edit details before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#48A63E]/40 hover:bg-[#48A63E]/10 text-[#48A63E] text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Locating...
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" /> Use My Current Location
                  </>
                )}
              </button>
            </div>

            {locationStatus && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs font-bold">
                {locationStatus}
              </div>
            )}

            {addressErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold">
                {addressErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5C4E42] mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5C4E42] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="10-digit Mobile Number"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5C4E42] mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={addressForm.address_line1}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                  placeholder="House No., Building Name, Street Name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5C4E42] mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addressForm.address_line2}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                  placeholder="Apartment, Suite, Unit, Area"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5C4E42] mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="e.g. Near Central Park"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
                <div>
                  <label className="block text-[#5C4E42] mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5C4E42] mb-1">State *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5C4E42] mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="6-digit PIN Code"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#5C4E42] hover:bg-[#EAE0D4] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="px-6 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {addressSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Address'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E6DDD3] rounded-3xl p-6 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-[#9E9082] hover:text-[#2C241D] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#5C4E42] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5C4E42] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#48A63E] bg-[#48A63E]/10 hover:bg-[#48A63E]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" /> Change Password
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#5C4E42] hover:bg-[#EAE0D4] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
