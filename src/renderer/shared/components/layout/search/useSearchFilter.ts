import { useEffect, useState } from 'react';
import type { SearchableNavItem } from './searchTypes';
import { useSearchIndex } from './searchIndex';

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 150;

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
        .filter((m) => [m.label, m.group, ...m.keywords].join(' ').toLowerCase().includes(term))
        .slice(0, MAX_RESULTS);
      setFilteredResults(results);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, accessibleItems]);

  return { accessibleItems, filteredResults };
}
