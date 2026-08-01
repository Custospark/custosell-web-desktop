import { useEffect, useState } from 'react';
import type { SearchableNavItem } from './searchTypes';
import { useSearchIndex } from './searchIndex';

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 150;

/**
 * Robust matcher: a result wins on the exact phrase OR when every
 * whitespace-separated token of the query appears somewhere in its searchable
 * text. The token fallback captures intents like "new product" or "record
 * expense" even when the words aren't stored as one contiguous phrase.
 */
function matchesQuery(item: SearchableNavItem, term: string): boolean {
  const haystack = [item.label, item.group, item.description, ...item.keywords]
    .join(' ')
    .toLowerCase();
  if (haystack.includes(term)) return true;
  return term.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

/**
 * Returns:
 * - `accessibleItems`  — the full access-filtered searchable catalog
 * - `filteredResults`  — debounced, query-filtered subset (max 8)
 */
export function useSearchFilter(query: string) {
  const accessibleItems = useSearchIndex();
  const [filteredResults, setFilteredResults] = useState<SearchableNavItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const term = query.trim().toLowerCase();
      if (!term) {
        setFilteredResults([]);
        return;
      }
      const results = accessibleItems
        .filter((m) => matchesQuery(m, term))
        .slice(0, MAX_RESULTS);
      setFilteredResults(results);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, accessibleItems]);

  return { accessibleItems, filteredResults };
}
