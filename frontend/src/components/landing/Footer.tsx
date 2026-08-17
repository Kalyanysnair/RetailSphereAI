import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FAF7F2]/90 backdrop-blur-xl text-[#2C241D] pt-16 pb-10 border-t border-[#E2D7CB] relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-12 border-b border-[#E2D7CB]">
          {/* Clean Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <Logo to="/" size="lg" />
            <p className="text-xs text-[#524538] font-bold leading-relaxed max-w-sm">
              Handcrafting sustainable contemporary furniture engineered for timeless architectural spaces.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#38A132] mb-4">
              Collections
            </h4>
            <ul className="space-y-2.5 text-xs text-[#524538] font-bold">
              <li><a href="#categories" className="hover:text-[#38A132] transition-colors">Living Room Edit</a></li>
              <li><a href="#categories" className="hover:text-[#38A132] transition-colors">Dining Table Series</a></li>
              <li><a href="#categories" className="hover:text-[#38A132] transition-colors">Bedroom Sanctuaries</a></li>
              <li><a href="#categories" className="hover:text-[#38A132] transition-colors">Lighting & Art Objects</a></li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#38A132] mb-4">
              Studio Portals
            </h4>
            <ul className="space-y-2.5 text-xs text-[#524538] font-bold">
              <li><Link to="/login" className="hover:text-[#38A132] transition-colors">Client Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-[#38A132] transition-colors">Register Studio Account</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#38A132] transition-colors">Store Management Dashboard</Link></li>
              <li><a href="#customization" className="hover:text-[#38A132] transition-colors">Bespoke 3D Studio</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#38A132] mb-4">
              Newsletter
            </h4>
            <p className="text-xs text-[#524538] font-bold mb-3">
              Receive quarterly design lookbooks and exclusive custom drops.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <input
                type="email"
                placeholder="Enter email address"
                className="w-full bg-[#FAF7F2] border border-[#E2D7CB] rounded-full py-2.5 pl-4 pr-10 text-xs text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 shadow-xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#38A132] text-white hover:bg-[#32922D] flex items-center justify-center transition-colors shadow-sm"
                title="Subscribe"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B5C4D] font-bold">
          <p>© {new Date().getFullYear()} RetailSphere AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-[#38A132] transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-[#38A132] transition-colors">Terms of Service</a>
            <a href="#contact" className="hover:text-[#38A132] transition-colors">Consultation Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
