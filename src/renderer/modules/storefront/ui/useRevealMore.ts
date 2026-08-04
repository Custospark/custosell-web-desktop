import { useCallback, useEffect, useRef, useState } from 'react';

type UseRevealMoreOptions = {
  /** How many items to reveal per sentinel pass (and per manual reveal). */
  chunk?: number;
  /** Total items currently loaded. */
  count: number;
  /** More pages exist on the server. */
  hasNextPage: boolean;
  /** Bump when the list identity changes (e.g. a new search) to reset visibility. */
  resetKey?: string;
  /** Fetch the next server page when the feed runs dry. */
  onLoadMore?: () => void;
};

/**
 * Progressive "feed"-style reveal (like a shopping/YouTube list): renders the
 * first `chunk` items, then reveals more as the sentinel scrolls into view and
 * asks for the next page only once everything already loaded is showing.
 */
export function useRevealMore({
  chunk = 36,
  count,
  hasNextPage,
  resetKey,
  onLoadMore,
}: UseRevealMoreOptions) {
  const [visible, setVisible] = useState(chunk);
  const [sentinelVisible, setSentinelVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const seenResetKey = useRef(resetKey);
  useEffect(() => {
    if (seenResetKey.current !== resetKey) {
      seenResetKey.current = resetKey;
      setVisible(chunk);
      setSentinelVisible(false);
    }
  }, [resetKey, chunk]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSentinelVisible(true);
            setVisible((n) => n + chunk);
          } else {
            setSentinelVisible(false);
          }
        }
      },
      { rootMargin: '700px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [chunk]);

  // Keep scrolling once fresh pages land — but only while the sentinel is on screen.
  useEffect(() => {
    if (sentinelVisible && visible >= count && hasNextPage) {
      onLoadMore?.();
    }
  }, [sentinelVisible, visible, count, hasNextPage, onLoadMore]);

  const revealMore = useCallback(() => {
    setVisible((n) => n + chunk);
    if (count > 0 && visible >= count && hasNextPage) {
      onLoadMore?.();
    }
  }, [chunk, count, visible, hasNextPage, onLoadMore]);

  return { visible, sentinelRef, revealMore };
}