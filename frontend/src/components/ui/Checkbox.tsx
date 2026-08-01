import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = '', checked, onChange, ...props }, ref) => {
    const checkboxId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <label htmlFor={checkboxId} className="inline-flex items-center gap-2 cursor-pointer group select-none">
        <div className="relative flex items-center justify-center">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded-md border transition-all duration-200 flex items-center justify-center ${
              checked
                ? 'bg-[#84cc16] border-[#84cc16] text-slate-900 shadow-sm'
                : 'bg-white/20 border-white/40 group-hover:border-white/70 group-hover:bg-white/30'
            }`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>
        <span className="text-xs font-medium text-white/90 group-hover:text-white transition-colors">
          {label}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
