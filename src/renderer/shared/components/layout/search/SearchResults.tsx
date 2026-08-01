import type { MutableRefObject } from 'react';
import {
  ArrowRight,
  Clock,
  CornerDownLeft,
  Filter,
  Flame,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import type { SearchableNavItem } from './searchTypes';
import type { CachedSearch } from './useSearchCache';

interface SearchResultsProps {
  query: string;
  results: SearchableNavItem[];
  recentSearches: CachedSearch[];
  frequentItems: SearchableNavItem[];
  activeIndex: number;
  itemRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  onNavigate: (item: SearchableNavItem) => void;
  onSelectRecentSearch: (query: string) => void;
  onRemoveRecentSearch: (query: string) => void;
  onClearAllHistory: () => void;
}

/** Bold the matching substring inside `text`. */
function HighlightMatch({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query) return <span className={className}>{text}</span>;

  const lower = text.toLowerCase();
  const lQuery = query.toLowerCase();
  const idx = lower.indexOf(lQuery);
  if (idx === -1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {text.slice(0, idx)}
      <span className="font-bold text-blue-600">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

const sectionTitle = 'mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400';

const baseItem =
  'group w-full cursor-pointer text-left flex items-start gap-3 px-4 py-3 transition-all duration-100 focus:outline-none';

const groupChip = 'flex-shrink-0 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500';

/**
 * Renders three mutually exclusive states:
 *  A) No query  → recent searches + frequently visited items
 *  B) Has query → filtered results list (with keyboard-nav highlight)
 *  C) Has query but no matches → empty state
 */
export function SearchResults({
  query,
  results,
  recentSearches,
  frequentItems,
  activeIndex,
  itemRefs,
  onNavigate,
  onSelectRecentSearch,
  onRemoveRecentSearch,
  onClearAllHistory,
}: SearchResultsProps) {
  const hasQuery = query.trim().length > 0;
  const hasHistory = recentSearches.length > 0 || frequentItems.length > 0;

  // ── A: No query — show history / tips ─────────────────────────────────────
  if (!hasQuery) {
    if (!hasHistory) {
      return (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Search className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mb-1 text-sm font-semibold text-gray-700">Start typing to search</p>
          <p className="text-xs text-gray-400">Jump to any module or page instantly</p>
        </div>
      );
    }

    return (
      <div className="py-3">
        {recentSearches.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between px-4">
              <span className={sectionTitle}>Recent Searches</span>
              <button
                type="button"
                onClick={onClearAllHistory}
                className="flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[10px] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            </div>

            <div className="space-y-0.5">
              {recentSearches.slice(0, 6).map((s, i) => (
                <div
                  key={s.query}
                  className="mx-2 flex items-center justify-between rounded-lg pr-2 transition-colors hover:bg-gray-50"
                >
                  <button
                    ref={(el) => { itemRefs.current[i] = el; }}
                    type="button"
                    onClick={() => onSelectRecentSearch(s.query)}
                    className={cn(
                      'flex flex-1 cursor-pointer items-center gap-3 px-2 py-2.5 text-left',
                      activeIndex === i ? 'text-blue-600' : '',
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span
                      className={cn(
                        'truncate text-sm',
                        activeIndex === i ? 'font-medium text-blue-600' : 'text-gray-700',
                      )}
                    >
                      {s.query}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveRecentSearch(s.query); }}
                    aria-label={`Remove "${s.query}" from history`}
                    className="cursor-pointer rounded p-1 text-gray-400 opacity-0 transition-colors hover:text-gray-600 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {frequentItems.length > 0 && (
          <div>
            <div className={sectionTitle}>Frequently Visited</div>
            <div className="space-y-0.5 px-2">
              {frequentItems.map((m, i) => {
                const refIdx = recentSearches.slice(0, 6).length + i;
                const isActive = activeIndex === refIdx;
                return (
                  <motion.button
                    key={m.id}
                    ref={(el) => { itemRefs.current[refIdx] = el; }}
                    type="button"
                    onClick={() => onNavigate(m)}
                    whileHover={{ x: 2 }}
                    className={cn(
                      baseItem,
                      'rounded-lg border-l-2',
                      isActive
                        ? 'border-blue-500 bg-blue-50/80'
                        : 'border-transparent hover:bg-gray-50',
                    )}
                  >
                    <Flame className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            isActive ? 'text-blue-700' : 'text-gray-800',
                          )}
                        >
                          {m.label}
                        </span>
                        <span className={groupChip}>{m.group}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 self-center text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── B: Has query but no results ──────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-10 text-center">
        <div className="mx-auto mb-3 inline-flex rounded-full bg-gray-100 p-3">
          <Filter className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mb-1 text-sm font-semibold text-gray-800">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-xs text-gray-400">Try different keywords or check the spelling</p>
      </motion.div>
    );
  }

  // ── C: Results list ──────────────────────────────────────────────────────────
  return (
    <div className="py-2">
      <div className={sectionTitle}>Results — {results.length} found</div>
      <AnimatePresence>
        {results.map((m, i) => {
          const isActive = activeIndex === i;
          return (
            <motion.button
              key={m.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              onClick={() => onNavigate(m)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ x: 2 }}
              className={cn(
                baseItem,
                'mx-2 rounded-lg border-l-2',
                isActive
                  ? 'border-blue-500 bg-blue-50/80'
                  : 'border-transparent hover:bg-gray-50',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center self-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
                )}
              >
                {isActive ? <CornerDownLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <HighlightMatch
                    text={m.label}
                    query={query}
                    className={cn(
                      'truncate text-sm font-semibold',
                      isActive ? 'text-blue-700' : 'text-gray-900',
                    )}
                  />
                  <span className={groupChip}>{m.group}</span>
                </div>
                <HighlightMatch text={m.route} query={query} className="truncate text-xs text-gray-400" />
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
