import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'light' | 'dark' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  to?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showText = true,
  to = '/',
  className = '',
}) => {
  const sizeClasses = {
    sm: { img: 'w-7 h-7', text: 'text-base', badge: 'text-[9px] px-1.5 py-0.2' },
    md: { img: 'w-9 h-9', text: 'text-lg', badge: 'text-[10px] px-2 py-0.5' },
    lg: { img: 'w-11 h-11', text: 'text-xl', badge: 'text-xs px-2.5 py-0.5' },
    xl: { img: 'w-16 h-16', text: 'text-3xl', badge: 'text-sm px-3 py-1' },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  const logoContent = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Emblem Icon Container with luxury glow */}
      <div className="relative flex-shrink-0">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#48A63E] via-[#D4AF37] to-[#3D9134] opacity-50 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-300" />
        <img
          src="/retailsphere_logo.jpg"
          alt="RetailSphere AI Logo"
          className={`${currentSize.img} relative rounded-full object-cover border border-[#E2D7CB]/60 shadow-md group-hover:scale-105 transition-transform duration-300`}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex items-center gap-1.5 font-extrabold tracking-tight">
          <span
            className={`tracking-tight font-black ${
              variant === 'dark'
                ? 'text-white'
                : 'text-[#1A1410]'
            }`}
          >
            RetailSphere
          </span>
          <span className="bg-gradient-to-r from-[#48A63E] to-[#2E7D26] bg-clip-text text-transparent font-black">
            AI
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to}>{logoContent}</Link>;
  }

  return logoContent;
};
