import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl text-white whitespace-nowrap';

  const variantStyles = {
    primary: 'btn-reference-gradient',
    secondary: 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30',
    outline: 'border border-white/40 bg-transparent text-white hover:bg-white/10',
    ghost: 'text-white/80 hover:text-white hover:bg-white/10',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
          <span>{loadingText || 'Loading...'}</span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-1.5">
          {leftIcon}
          {children}
          {rightIcon}
        </span>
      )}
    </button>
  );
};
