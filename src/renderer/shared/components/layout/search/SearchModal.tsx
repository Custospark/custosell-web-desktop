import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useSearchCache } from './useSearchCache';
import { useSearchFilter } from './useSearchFilter';
import type { SearchableNavItem } from './searchTypes';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KbdHint: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
    {label}
  </span>
);

function SearchModalInner({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const navigate = useNavigate();

  const { accessibleItems, filteredResults } = useSearchFilter(query);

  const {
    cache,
    addRecentSearch,
    removeRecentSearch,
    clearAllHistory,
    recordItemVisit,
    getTopItemIds,
  } = useSearchCache();

  // ── Frequent items (top 5 accessible, ranked by visit count) ─────────────
  const frequentItems = useMemo<SearchableNavItem[]>(() => {
    const topIds = getTopItemIds(5);
    return topIds
      .map((id) => accessibleItems.find((m) => m.id === id))
      .filter((m): m is SearchableNavItem => !!m);
  }, [accessibleItems, getTopItemIds]);

  // ── Total navigable count for arrow-key cycling ───────────────────────────
  const navigableCount = useMemo(() => {
    if (query.trim()) return filteredResults.length;
    return Math.min(cache.recentSearches.length, 6) + frequentItems.length;
  }, [query, filteredResults.length, cache.recentSearches.length, frequentItems.length]);

  // ── Scroll active item into view ──────────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= 0) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // ── Gate body-scroll lock on isOpen so the palette doesn't freeze the app ──
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Reset query when the palette closes ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset palette query when it closes
      setQuery('');
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (item: SearchableNavItem) => {
      addRecentSearch(query.trim() || item.label);
      recordItemVisit(item.id);
      navigate(item.route);
      onClose();
    },
    [query, addRecentSearch, recordItemVisit, navigate, onClose],
  );

  const handleSelectRecentSearch = useCallback((q: string) => {
    setQuery(q);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  // ── Query change — reset index ────────────────────────────────────────────
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setActiveIndex(-1);
  }, []);

  const handleEnterPress = useCallback(() => {
    if (query.trim()) {
      const m = filteredResults[activeIndex];
      if (m) handleNavigate(m);
      return;
    }
    const recentCount = Math.min(cache.recentSearches.length, 6);
    if (activeIndex < recentCount) {
      const recent = cache.recentSearches[activeIndex];
      if (recent) handleSelectRecentSearch(recent.query);
    } else {
      const m = frequentItems[activeIndex - recentCount];
      if (m) handleNavigate(m);
    }
  }, [
    query,
    filteredResults,
    activeIndex,
    cache.recentSearches,
    frequentItems,
    handleNavigate,
    handleSelectRecentSearch,
  ]);

  // ── Modal-scoped keyboard handling (Esc, arrows, Enter) ───────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => (navigableCount === 0 ? -1 : (i + 1) % navigableCount));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) =>
            navigableCount === 0 ? -1 : i <= 0 ? navigableCount - 1 : i - 1,
          );
          break;

        case 'Enter':
          if (activeIndex < 0) break;
          e.preventDefault();
          handleEnterPress();
          break;

        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, navigableCount, handleEnterPress, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[20000] bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Palette card ── */}
          <motion.div
            key="modal"
            role="dialog"
            aria-label="Global search"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[10%] z-[20000] w-full max-w-2xl -translate-x-1/2 px-4"
          >
            <div
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
              style={{ maxHeight: '75vh' }}
            >
              {/* ── Input area ── */}
              <SearchInput
                value={query}
                onChange={handleQueryChange}
                isFocused={isFocused}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                inputRef={inputRef}
                resultCount={filteredResults.length}
              />

              {/* ── Divider ── */}
              <div className="h-px bg-gray-100" />

              {/* ── Results panel (scrollable) ── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <SearchResults
                  query={query}
                  results={filteredResults}
                  recentSearches={cache.recentSearches}
                  frequentItems={frequentItems}
                  activeIndex={activeIndex}
                  itemRefs={itemRefs}
                  onNavigate={handleNavigate}
                  onSelectRecentSearch={handleSelectRecentSearch}
                  onRemoveRecentSearch={removeRecentSearch}
                  onClearAllHistory={clearAllHistory}
                />
              </div>

              {/* ── Keyboard hints footer ── */}
              <div className="mx-1.5 mb-1.5 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { keys: ['↑', '↓'], hint: 'navigate' },
                    { keys: ['↵'], hint: 'open' },
                    { keys: ['Esc'], hint: 'close' },
                  ].map(({ keys, hint }) => (
                    <span key={hint} className="flex items-center gap-1 text-[11px] text-gray-400">
                      {keys.map((k) => <KbdHint key={k} label={k} />)}
                      <span>{hint}</span>
                    </span>
                  ))}
                </div>
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-[10px] font-medium text-transparent">
                  Custosell Search
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Thin portal wrapper — renders the palette at document root regardless of
 *  where it sits in the DOM tree. */
export const SearchModal: React.FC<SearchModalProps> = (props) =>
  createPortal(<SearchModalInner {...props} />, document.body);
