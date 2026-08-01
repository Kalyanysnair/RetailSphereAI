import React from 'react';
import { 
  Armchair, 
  ShoppingBag, 
  Sparkles, 
  SlidersHorizontal,
  Settings, 
  LogOut,
  ChevronRight,
  Heart,
  Home,
  Grid,
  PackageCheck
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = React.useState<any>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUserProfile(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const userName = userProfile?.full_name || userProfile?.name || 'Customer';
  const userRole = userProfile?.role_name || 'Customer';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  const navItems = [
    { name: 'Home Storefront', icon: Home, path: '/' },
    { name: 'Browse Furniture', icon: Grid, path: '/dashboard' },
    { name: 'AI Recommendations', icon: Sparkles, path: '/dashboard' },
    { name: 'Custom Studio', icon: SlidersHorizontal, path: '/dashboard' },
    { name: 'My Cart & Orders', icon: ShoppingBag, path: '/cart' },
    { name: 'Saved Wishlist', icon: Heart, path: '/wishlist' },
    { name: 'Account Settings', icon: Settings, path: '/dashboard' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('wishlist-updated'));
    navigate('/login');
  };

  return (
    <>
      {/* Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#FBF9F5] border-r border-[#E6E1DA] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="h-16 px-6 border-b border-[#E6E1DA] flex items-center justify-between">
            <Link to="/dashboard" className="font-extrabold text-slate-900 text-base tracking-tight">
              RetailSphere <span className="text-[#C5A880]">AI</span>
            </Link>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#E6E1DA]/50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    onClose?.();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#2C4A3E] text-white shadow-md shadow-[#2C4A3E]/20 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#F2ECE1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#E6E1DA]">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E1DCD5] shadow-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#2C4A3E] text-amber-200 font-bold text-xs flex items-center justify-center">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate" title={userName}>{userName}</p>
                <p className="text-[10px] text-slate-500 truncate capitalize">{userRole}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
