'use client';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Sheet / Modal Container above everything */}
      <div className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-slate-950 border-t sm:border border-white/20 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-20px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-slide-up z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.04]">
          <h2 className="text-base font-extrabold text-white tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.08] text-slate-400 hover:text-white hover:bg-white/15 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(88vh-4.5rem)] pb-12 space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
