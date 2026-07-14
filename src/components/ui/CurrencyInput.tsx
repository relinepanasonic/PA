'use client';
import React, { forwardRef, useState, useEffect, ChangeEvent, InputHTMLAttributes } from 'react';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  icon?: React.ReactNode;
}

const formatToIDR = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const num = Number(digits);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className = '', label, error, value = '', onChange, onValueChange, icon, id, placeholder = '0', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>(() => formatToIDR(value));

    useEffect(() => {
      setDisplayValue(formatToIDR(value));
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawText = e.target.value;
      const digits = rawText.replace(/\D/g, '');
      const formatted = digits ? Number(digits).toLocaleString('id-ID') : '';
      setDisplayValue(formatted);

      if (onValueChange) {
        onValueChange(digits);
      }
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: digits,
            name: props.name || id || '',
          },
        } as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-300 tracking-wide uppercase mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
            {icon ? (
              <span className="text-blue-400/80">{icon}</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-extrabold font-mono tracking-tight border border-emerald-500/30">
                Rp
              </span>
            )}
          </div>
          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 rounded-2xl py-3 pr-4 text-sm font-bold font-mono text-white placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-md transition-all ${
              icon ? 'pl-11' : 'pl-14'
            } ${error ? 'border-danger/50' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
export default CurrencyInput;
