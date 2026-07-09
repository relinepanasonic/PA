'use client';
import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Sheet / Modal Container */}
      <div className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-slate-950/95 border-t sm:border border-white/20 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-15px_60px_rgba(0,0,0,0.85)] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.03]">
          <h2 className="text-base font-extrabold text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.08] text-slate-400 hover:text-white hover:bg-white/15 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body with generous bottom padding so buttons are NEVER hidden */}
        <div className="p-6 overflow-y-auto max-h-[calc(88vh-4.5rem)] pb-12 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
