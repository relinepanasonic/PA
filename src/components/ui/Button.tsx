'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-300 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none tracking-wide';
    
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_30px_rgba(59,130,246,0.6)] hover:brightness-110 border border-blue-400/30',
      secondary: 'bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white backdrop-blur-xl shadow-lg',
      ghost: 'text-slate-300 hover:text-white hover:bg-white/[0.08]',
      danger: 'bg-danger/15 text-red-400 border border-danger/30 hover:bg-danger/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    };
    
    const sizes = {
      sm: 'text-xs px-3.5 py-2 gap-1.5 rounded-xl',
      md: 'text-sm px-5 py-3 gap-2',
      lg: 'text-base px-7 py-3.5 gap-2.5 rounded-full',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
