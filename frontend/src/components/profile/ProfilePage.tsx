import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Package
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { getCurrentUser, updateUserProfile, UserProfile } from '../../services/api';
import { getCartItems } from '../../utils/cartStorage';
import { getWishlistItems } from '../../utils/wishlistStorage';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Cart & Wishlist counts
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
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

  const fetchProfileFromDB = async () => {
    setLoading(true);
    try {
      const data = await getCurrentUser();
      if (data) {
        setUserProfile(data);
      } else {
        // Fallback reading from local stored auth user payload if token is offline
        const stored = localStorage.getItem('user');
        if (stored) {
          setUserProfile(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.error('Error loading database profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileFromDB();
    setCartCount(getCartItems().length);
    setWishlistCount(getWishlistItems().length);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const updated = await updateUserProfile({
        full_name: editForm.full_name,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        city: editForm.city || undefined,
        state: editForm.state || undefined,
        pincode: editForm.pincode || undefined,
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

                  {/* Edit Profile Action */}
                  <button
                    onClick={handleOpenEdit}
                    className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                </div>

                {/* Notification Toast */}
                {successMsg && (
                  <div className="bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] p-3 rounded-2xl text-xs font-bold text-center animate-fadeIn relative z-10">
                    {successMsg}
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

                    <div className="p-3.5 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-bold text-[#7A6C5E] uppercase block flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#48A63E]" /> Address
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#2C241D] block">
                        {userProfile?.customer?.address 
                          ? `${userProfile.customer.address}, ${userProfile.customer.city || ''}, ${userProfile.customer.state || ''} - ${userProfile.customer.pincode || ''}`
                          : 'Not Provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE7DE] relative z-10">
                  <Link
                    to="/orders"
                    className="px-6 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 transition-all inline-flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>My Orders & Feedback Studio</span>
                  </Link>

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

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E6DDD3] rounded-3xl p-6 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-[#9E9082] hover:text-[#2C241D] rounded-lg transition-colors"
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

              <div>
                <label className="block text-[#5C4E42] mb-1">Street Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="e.g. House No., Street, Landmark"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5C4E42] mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
                <div>
                  <label className="block text-[#5C4E42] mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    placeholder="Pincode"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#5C4E42] hover:bg-[#EAE0D4] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-bold shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 disabled:opacity-50"
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
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
