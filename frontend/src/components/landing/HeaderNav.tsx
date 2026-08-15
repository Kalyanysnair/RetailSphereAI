import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export const HeaderNav: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const prevScrollPosRef = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Collection', hash: '#categories' },
    { name: 'About', hash: '#about' },
    { name: 'Contact Us', hash: '#contact' },
  ];

  // Smart Hide on Scroll Down, Show Instantly on Scroll Up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const prevScrollPos = prevScrollPosRef.current;
      const delta = prevScrollPos - currentScrollPos;

      if (currentScrollPos <= 15) {
        setVisible(true);
      } else if (delta > 0) {
        setVisible(true);
      } else if (delta < -4) {
        setVisible(false);
      }

      prevScrollPosRef.current = currentScrollPos;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate(`/${hash}`);
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 px-4 sm:px-8 pt-3 pb-1 transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="max-w-7xl mx-auto h-16 rounded-full bg-white/95 backdrop-blur-2xl border-2 border-[#E2D7CB] shadow-xl px-6 sm:px-8 flex items-center justify-between transition-all">
        {/* Brand Logo */}
        <Link to="/" className="text-lg sm:text-xl font-black tracking-tight text-[#1A1410] hover:opacity-90 transition-opacity">
          RetailSphere <span className="text-[#38A132]">AI</span>
        </Link>

        {/* Navigation Links (Center) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-black text-[#1A1410]">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={`/${link.hash}`}
              onClick={(e) => handleNavClick(e, link.hash)}
              className="hover:text-[#38A132] transition-colors relative py-1 group"
            >
              <span>{link.name}</span>
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#38A132] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right CTA Actions (Log in & Get Started) */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            to="/login"
            className={`text-xs font-black transition-colors ${
              location.pathname === '/login' ? 'text-[#38A132]' : 'text-[#1A1410] hover:text-[#38A132]'
            }`}
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-[#38A132] hover:bg-[#32922D] px-5 py-2.5 rounded-full transition-all duration-300 shadow-md shadow-[#38A132]/25"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-[#2C241D] hover:bg-[#EFECE8] focus:outline-none transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 mx-2 p-5 rounded-3xl bg-[#FAF7F2]/95 backdrop-blur-2xl border border-[#E2D7CB] shadow-2xl space-y-4 animate-fadeIn">
          <nav className="flex flex-col gap-3 text-sm font-bold text-[#524538]">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={`/${link.hash}`}
                onClick={(e) => handleNavClick(e, link.hash)}
                className="py-2 px-3 rounded-xl hover:bg-[#EFECE8] hover:text-[#38A132] transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#E2D7CB] flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-extrabold text-[#524538] hover:text-[#38A132] rounded-xl hover:bg-[#EFECE8]"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-extrabold text-white bg-[#38A132] hover:bg-[#32922D] rounded-xl shadow-md shadow-[#38A132]/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
