import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { MODAL_NESTED_PORTAL_Z_INDEX_CLASS } from '../modals/Modal';

export interface SearchableSelectOption {
  value: string;
  label: string;
  group?: string;
}

const SEARCH_HEADER_PX = 52;
const OPTION_ROW_PX = 40;

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  emptyOption?: SearchableSelectOption;
  otherOption?: SearchableSelectOption;
  maxVisibleOptions?: number;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  label,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  options,
  value,
  onChange,
  emptyOption = { value: '', label: 'All' },
  otherOption,
  maxVisibleOptions = 5,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listMaxHeight = maxVisibleOptions * OPTION_ROW_PX;
  const panelHeight = SEARCH_HEADER_PX + listMaxHeight;
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, panelHeight });

  const allOptions = useMemo(
    () => [emptyOption, ...options],
    [emptyOption, options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [allOptions, query]);

  const selectedLabel = useMemo(() => {
    if (value && value !== (emptyOption?.value ?? '')) {
      const match = allOptions.find((opt) => opt.value === value) ?? otherOption;
      if (match) return match.label;
      if (otherOption && value === otherOption.value) return otherOption.label;
    }
    if (otherOption && value === otherOption.value) return otherOption.label;
    return value || placeholder;
  }, [allOptions, value, placeholder, otherOption, emptyOption]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.min(panelHeight, openUp ? spaceAbove : spaceBelow);
    setPosition({
      top: openUp ? rect.top - availableHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      panelHeight: Math.max(SEARCH_HEADER_PX + OPTION_ROW_PX, availableHeight),
    });
  }, [panelHeight]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, panelHeight, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selectOption = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  let lastGroup: string | null = null;

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700" id={`${listId}-label`}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${listId}-label` : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left shadow-sm transition-colors',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          !selectedLabel && 'text-gray-500',
          disabled && 'cursor-not-allowed bg-gray-50 text-gray-400 hover:border-gray-300',
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className={cn(
            'fixed overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl',
            MODAL_NESTED_PORTAL_Z_INDEX_CLASS,
          )}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.panelHeight,
          }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <ul
            role="listbox"
            aria-label={label || 'Options'}
            className="overflow-y-auto overflow-x-hidden py-1"
            style={{ maxHeight: listMaxHeight }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No matches found</li>
            ) : (
              filtered.map((opt) => {
                const selected = opt.value === value;
                const showHeader = opt.group && opt.group !== lastGroup;
                lastGroup = opt.group ?? null;
                return (
                  <li key={opt.value || '__all__'}>
                    {showHeader && (
                      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => selectOption(opt.value)}
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-left text-sm transition-colors',
                        selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })
            )}
            {otherOption && (
              <li>
                <div className="mx-3 my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => selectOption(otherOption.value)}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm font-medium italic transition-colors',
                    value === otherOption.value ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <span className="truncate">{otherOption.label}</span>
                </button>
              </li>
            )}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
