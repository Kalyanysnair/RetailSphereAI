import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOptionItem {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

export type SelectOption = SelectOptionItem | string;

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  name,
  id,
  required = false,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options into { value, label } format
  const normalizedOptions: SelectOptionItem[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation & accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
    }

    if (!isOpen) return;

    const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % normalizedOptions.length;
      onChange(normalizedOptions[nextIndex].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
      onChange(normalizedOptions[prevIndex].value);
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-xs select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native form compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value}
          required={required}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id ? `${id}-btn` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 bg-[#FAF5ED] hover:bg-[#FCF8F2] border border-[#DACAB8] hover:border-[#38A132] focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 rounded-xl font-bold text-[#2C241D] flex items-center justify-between gap-2 shadow-xs transition-all cursor-pointer ${
          isOpen ? 'border-[#38A132] ring-2 ring-[#38A132]/20 bg-[#FCF8F2]' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-[#EFE7DE]' : ''} ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {icon && <span className="text-[#38A132] flex-shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${!selectedOption ? 'text-[#8C7C6D] font-medium' : 'text-[#2C241D]'}`}>
            {displayLabel}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 text-[#38A132] flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#2E8529]' : ''
          }`}
        />
      </button>

      {/* Floating Artisan Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#FAF5ED]/98 backdrop-blur-xl border border-[#DACAB8] rounded-2xl p-1.5 shadow-2xl max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
          style={{ minWidth: '100%' }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl font-bold transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#38A132] text-white shadow-xs font-black'
                    : 'text-[#2C241D] hover:bg-[#38A132]/12 hover:text-[#166534]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EAE0D4] text-[#5C4E42]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
