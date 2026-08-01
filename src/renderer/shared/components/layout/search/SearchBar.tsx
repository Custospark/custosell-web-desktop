import { useCallback } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useSearchKeyboard } from './useSearchKeyboard';

/**
 * SearchBar — Navbar trigger button styled as a search field.
 *
 * Intentionally a thin trigger. The <SearchModal> itself is rendered once from
 * Layout.tsx (always mounted) so ⌘K keeps working even when this button is not
 * in the DOM. Both read from the same module-level singleton in useSearchKeyboard.
 */
export function SearchBar() {
  const { openSearch } = useSearchKeyboard();

  const handleTriggerClick = useCallback(() => {
    openSearch();
  }, [openSearch]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <button
      type="button"
      onClick={handleTriggerClick}
      aria-label="Open global search"
      data-tour="navbar-search"
      className={cn(
        'flex h-9 flex-1 min-w-0 max-w-md shrink items-center gap-2 rounded-lg border border-gray-200',
        'bg-slate-50/80 px-3 text-sm text-gray-400 transition-all duration-150',
        'hover:border-gray-300 hover:bg-white hover:text-gray-600',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">Search modules and pages…</span>
      <span className="hidden shrink-0 items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-400 sm:inline-flex">
        {isMac ? '⌘' : 'Ctrl'}
        <span className="font-bold">K</span>
      </span>
    </button>
  );
}
