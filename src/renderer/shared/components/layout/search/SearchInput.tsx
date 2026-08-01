import type { RefObject } from 'react';
import { Command, Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  resultCount: number;
}

/** Search input — the centrepiece of the command palette. Deliberately has no
 *  knowledge of routing or store state; purely controlled UI. */
export function SearchInput({
  value,
  onChange,
  isFocused,
  onFocus,
  onBlur,
  inputRef,
  resultCount,
}: SearchInputProps) {
  return (
    <div className="relative p-4">
      <div
        className={cn(
          'relative flex items-center overflow-hidden rounded-xl border bg-white transition-all',
          isFocused
            ? 'border-blue-500 ring-4 ring-blue-100'
            : 'border-gray-200 ring-1 ring-gray-100',
        )}
      >
        <Search
          className={cn(
            'pointer-events-none absolute left-4 h-5 w-5 flex-shrink-0 transition-colors',
            isFocused ? 'text-blue-500' : 'text-gray-400',
          )}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus
          placeholder="Search modules and pages..."
          aria-label="Global navigation search"
          aria-autocomplete="list"
          className={cn(
            'w-full bg-transparent py-4 pl-12 pr-32 text-[15px] text-gray-900',
            'placeholder:text-sm placeholder:text-gray-400 focus:outline-none',
          )}
        />

        <div className="absolute right-3 flex items-center gap-2">
          {value && resultCount > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-blue-600 ring-1 ring-blue-200">
              {resultCount}
            </span>
          )}

          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="hidden select-none items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 sm:flex">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
