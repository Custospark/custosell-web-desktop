import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [5, 10, 15, 25, 50, 100];

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  if (totalItems === 0) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 mt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{' '}
          <span className="font-medium">{totalItems}</span>
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400">|</span>
            <select
              value={pageSize}
              onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              className="text-sm text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} per page</option>)}
            </select>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pages.map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors ${
                  page === currentPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- pagination hook colocated with component
export function usePagination<T>(data: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset to page 1 when data or pageSize changes
  const safePage = page > totalPages ? 1 : page;
  const paginatedData = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    data: paginatedData,
    page: safePage,
    totalPages,
    totalItems: data.length,
    pageSize,
    setPage: (p: number) => setPage(Math.min(p, totalPages)),
    setPageSize: (s: number) => { setPageSize(s); setPage(1); },
  };
}
