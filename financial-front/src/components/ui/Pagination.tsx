import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, totalElements, size, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-slate-600">
      <span>
        {from}–{to} de {totalElements}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 font-medium">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
