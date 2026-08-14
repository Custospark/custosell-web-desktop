import { useCallback, useEffect, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CACHE_KEY = 'custosell_global_search_v1';
const MAX_RECENT_SEARCHES = 8;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CachedSearch {
  query: string;
  timestamp: number;
}

interface ItemHit {
  itemId: string;
  count: number;
  lastVisited: number;
}

interface CacheData {
  recentSearches: CachedSearch[];
  itemHits: Record<string, ItemHit>;
}

// ─── Default / empty cache ────────────────────────────────────────────────────
const EMPTY_CACHE: CacheData = {
  recentSearches: [],
  itemHits: {},
};

// ─── Singleton store (shared across hook instances) ───────────────────────────
let globalCache: CacheData = EMPTY_CACHE;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function persist(data: CacheData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
  }
}

function hydrate(): CacheData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    return JSON.parse(raw) as CacheData;
  } catch {
    return EMPTY_CACHE;
  }
}

// Initialise the singleton once on module load
globalCache = hydrate();

// ─── Mutator ──────────────────────────────────────────────────────────────────
function mutate(updater: (prev: CacheData) => CacheData): void {
  globalCache = updater(globalCache);
  persist(globalCache);
  notifyListeners();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSearchCache() {
  // Local tick to trigger re-render when the singleton changes
  const [, tick] = useState(0);

  useEffect(() => {
    const rerender = () => tick((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  // ── Write: push a query to recent searches (deduped, most-recent-first) ──
  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    mutate((prev) => {
      const deduped = prev.recentSearches.filter(
        (s) => s.query.toLowerCase() !== trimmed.toLowerCase(),
      );
      return {
        ...prev,
        recentSearches: [
          { query: trimmed, timestamp: Date.now() },
          ...deduped,
        ].slice(0, MAX_RECENT_SEARCHES),
      };
    });
  }, []);

  // ── Write: remove a single recent search entry ────────────────────────────
  const removeRecentSearch = useCallback((query: string) => {
    mutate((prev) => ({
      ...prev,
      recentSearches: prev.recentSearches.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase(),
      ),
    }));
  }, []);

  // ── Write: wipe everything (recent + item hits) ───────────────────────────
  const clearAllHistory = useCallback(() => {
    mutate(() => EMPTY_CACHE);
  }, []);

  // ── Write: increment visit count for a nav item ───────────────────────────
  const recordItemVisit = useCallback((itemId: string) => {
    mutate((prev) => {
      const existing = prev.itemHits[itemId];
      return {
        ...prev,
        itemHits: {
          ...prev.itemHits,
          [itemId]: {
            itemId,
            count: (existing?.count ?? 0) + 1,
            lastVisited: Date.now(),
          },
        },
      };
    });
  }, []);

  // ── Read: top N item ids by visit count ───────────────────────────────────
  const getTopItemIds = useCallback(
    (count: number): string[] =>
      Object.values(globalCache.itemHits)
        .sort((a, b) => b.count - a.count || b.lastVisited - a.lastVisited)
        .slice(0, count)
        .map((h) => h.itemId),
    [], // intentionally empty - we read from the singleton directly
  );

  return {
    cache: globalCache,
    addRecentSearch,
    removeRecentSearch,
    clearAllHistory,
    recordItemVisit,
    getTopItemIds,
  };
}
