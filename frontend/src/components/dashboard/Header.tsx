import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Heart, LogOut, Plus, User, Package, ChevronDown, Bell, Tag, Gift } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCartCount } from '../../utils/cartStorage';
import { getWishlistCount } from '../../utils/wishlistStorage';
import { getCustomerNotificationsApi, CustomerNotification } from '../../services/api_coupons';
import { Logo } from '../common/Logo';

interface HeaderProps {
  cartCount?: number;
  wishlistCount?: number;
  onOpenCustomOrder?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, wishlistCount, onOpenCustomOrder }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown & notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Collection', hash: '#catalog-section' },
    { name: 'Custom Orders', hash: '#custom-order-section' },
    { name: 'Contact Us', hash: '#contact-section' },
  ];

  const handleOpenCustomOrder = () => {
    if (onOpenCustomOrder) {
      onOpenCustomOrder();
    } else {
      const el = document.getElementById('custom-order-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Header behavior: Always visible at top (scrollY <= 40). Scrolling down hides it; any push back (scrolling up) shows it instantly.
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY;

      if (currentScrollY <= 40) {
        setVisible(true);
      } else if (diff < 0) {
        // Push back detected (scrolling up) -> Show header instantly
        setVisible(true);
      } else if (diff > 5) {
        // Scrolling down -> Hide header
        setVisible(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string, linkName?: string) => {
    e.preventDefault();

    if (linkName === 'Custom Orders' || hash === '#custom-order-section') {
      if (onOpenCustomOrder) {
        onOpenCustomOrder();
      }
      setTimeout(() => {
        const el = document.querySelector('#custom-order-form') || document.querySelector('#custom-order-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (location.pathname !== '/dashboard') {
      navigate(`/dashboard${hash}`);
      return;
    }

    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeCartCount = cartCount !== undefined ? cartCount : getCartCount();
  const activeWishlistCount = wishlistCount !== undefined ? wishlistCount : getWishlistCount();

  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [userNotifs, setUserNotifs] = useState<CustomerNotification[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const refreshNotifs = async () => {
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      setUserProfile(parsed);
      const notifs = await getCustomerNotificationsApi();
      setUserNotifs(notifs);
    } catch (e) {
      setUserNotifs([]);
    }
  };

  useEffect(() => {
    refreshNotifs();
    window.addEventListener('customer-notifications-updated', refreshNotifs);
    window.addEventListener('allotments-updated', refreshNotifs);
    window.addEventListener('coupons-updated', refreshNotifs);
    window.addEventListener('storage', refreshNotifs);
    window.addEventListener('user-logged-in', refreshNotifs);
    return () => {
      window.removeEventListener('customer-notifications-updated', refreshNotifs);
      window.removeEventListener('allotments-updated', refreshNotifs);
      window.removeEventListener('coupons-updated', refreshNotifs);
      window.removeEventListener('storage', refreshNotifs);
      window.removeEventListener('user-logged-in', refreshNotifs);
    };
  }, []);

  const unreadNotifCount = userNotifs.filter(n => !n.read).length;

  useEffect(() => {
    const handleCartUpdate = () => {
      if (cartCount === undefined) {
        // force re-render for helper
      }
    };
    const handleWishlistUpdate = () => {
      if (wishlistCount === undefined) {
        // force re-render for helper
      }
    };
    handleCartUpdate();
    handleWishlistUpdate();
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('storage', handleCartUpdate);
    window.addEventListener('storage', handleWishlistUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('storage', handleCartUpdate);
      window.removeEventListener('storage', handleWishlistUpdate);
    };
  }, [location.pathname]);

  const userName = userProfile?.full_name || userProfile?.name || 'Customer';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('wishlist-updated'));
    navigate('/login');
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 px-4 sm:px-8 pt-4 pb-1 transition-all duration-300 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
    >


      <div className="max-w-7xl mx-auto h-16 rounded-full ultra-glass-pill px-6 sm:px-8 flex items-center justify-between transition-all gap-4">


        {/* Simple Clean Logo */}
        <Logo to="/dashboard" size="md" />

        {/* Center Navigation Links (Collection, Contact Us) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#6B5C4D]">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.hash}
              onClick={(e) => handleNavClick(e, link.hash || '#', link.name)}
              className="hover:text-[#2C241D] transition-colors relative py-1 group cursor-pointer"
            >
              <span>{link.name}</span>
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#48A63E] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right Logged-In Customer Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="relative p-2.5 rounded-full bg-[#F5ECE1]/80 hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] transition-all block"
            title="Saved Wishlist"
          >
            <Heart className="w-4 h-4 text-rose-600 fill-rose-600/20" />
            {activeWishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border border-white shadow-sm leading-none">
                {activeWishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications Bell with Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2.5 rounded-full bg-[#F5ECE1]/80 hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] transition-all block cursor-pointer"
              title="Notifications & Coupons"
            >
              <Bell className="w-4 h-4 text-[#2C241D]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#48A63E] text-white text-[10px] font-extrabold flex items-center justify-center border border-white shadow-sm leading-none animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-2xl p-4 shadow-2xl space-y-3 z-[100] animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                  <h4 className="font-extrabold text-xs text-[#2C241D]">Dashboard Notifications</h4>
                  <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md">
                    {userNotifs.length} Received
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                  {userNotifs.length === 0 ? (
                    <div className="py-6 text-center text-[#7A6C5E] space-y-1">
                      <Bell className="w-6 h-6 text-[#9E9082] mx-auto opacity-50" />
                      <p className="font-bold text-xs">No notifications yet</p>
                      <p className="text-[10px]">Coupon code notifications from staff & admin will appear here!</p>
                    </div>
                  ) : (
                    userNotifs.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-white border border-[#E2D7CB] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[10px] uppercase tracking-wider text-[#48A63E] flex items-center gap-1">
                            <Tag className="w-3 h-3 text-[#48A63E]" /> Exclusive Coupon
                          </span>
                          <span className="text-[9px] font-mono text-[#8C7C6D]">{n.createdDate}</span>
                        </div>
                        <p className="text-xs font-bold text-[#2C241D] leading-snug">{n.message}</p>
                        <div className="pt-1 flex items-center justify-between">
                          <span className="font-mono font-extrabold text-xs text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">
                            {n.couponCode}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(n.couponCode);
                              setCopiedCode(n.couponCode);
                              setTimeout(() => setCopiedCode(null), 2500);
                            }}
                            className={`text-[10px] font-extrabold transition-colors ${copiedCode === n.couponCode ? 'text-[#38A132] font-black' : 'text-[#48A63E] hover:underline'}`}
                          >
                            {copiedCode === n.couponCode ? 'Copied! ✓' : 'Copy Code'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cart */}
          <Link
            to="/cart"
            className="relative p-2.5 rounded-full bg-[#F5ECE1]/80 hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] transition-all block"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#2C241D]" />
            {activeCartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#48A63E] text-white text-[10px] font-extrabold flex items-center justify-center border border-white shadow-sm leading-none">
                {activeCartCount}
              </span>
            )}
          </Link>


          {/* User Profile Section with Dropdown Menu */}
          <div className="relative pl-2 border-l border-[#E6DDD3]" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity p-1 rounded-full hover:bg-[#F5ECE1]/60 cursor-pointer"
              title="User Account Menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#38A132] text-white font-extrabold text-xs flex items-center justify-center shadow-md shadow-[#38A132]/20">
                {userInitials}
              </div>
              <span className="hidden xl:block font-extrabold text-xs text-[#2C241D] max-w-[110px] truncate" title={userName}>
                {userName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A6C5E] hidden xl:block" />
            </button>

            {/* Dropdown Menu - High Visibility & Solid Contrast */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-56 bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-2xl p-2 shadow-2xl space-y-1 z-[100] animate-fadeIn">
                <Link
                  to="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-extrabold text-[#1F1812] hover:bg-[#EAE0D4] rounded-xl transition-all"
                >
                  <User className="w-4 h-4 text-[#38A132]" />
                  <span>View Profile</span>
                </Link>

                <Link
                  to="/orders"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-extrabold text-[#1F1812] hover:bg-[#EAE0D4] rounded-xl transition-all"
                >
                  <Package className="w-4 h-4 text-[#38A132]" />
                  <span>My Orders & Tracking</span>
                </Link>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 bg-rose-50/60 rounded-xl transition-all text-left cursor-pointer border border-rose-200 mt-1"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );


};
