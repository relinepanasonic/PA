'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-text-secondary px-3">
        {currentPage + 1} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
