'use client';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/80">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`w-full bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400/60 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 backdrop-blur-md transition-all ${
              icon ? 'pl-11' : ''
            } ${error ? 'border-danger/50' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
