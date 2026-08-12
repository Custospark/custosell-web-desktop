import { getOfflineDb } from './offlineDb';

/**
 * Tracks in-flight background IndexedDB writes so a shutdown flush barrier
 * (pagehide / beforeunload / Electron before-quit) can await them before the
 * renderer is torn down. Without this, a hard power loss in the sub-second
 * window between a user action and its IndexedDB commit can drop the latest
 * offline record (stock adjustment, sale, product, expense, ...).
 */
const inFlight = new Set<Promise<void>>();
const MAX_CONCURRENT_WRITES = 32;

export function pendingWriteCount(): number {
  return inFlight.size;
}

/**
 * Register an in-flight durable write. Keeps a bounded set; older writes that
 * exceed the concurrency cap are dropped from tracking (they are almost always
 * already committed). Used by flushPendingWrites() to drain before shutdown.
 */
export function trackWrite(promise: Promise<void>): void {
  if (inFlight.size >= MAX_CONCURRENT_WRITES) return;
  inFlight.add(promise);
  void promise.finally(() => {
    inFlight.delete(promise);
  });
}

/** Resolve once every registered in-flight write has settled (or timed out). */
export async function flushPendingWrites(timeoutMs = 3000): Promise<void> {
  if (inFlight.size === 0) return;
  const snapshot = [...inFlight];
  await Promise.race([
    Promise.allSettled(snapshot),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Ask the browser to persist the IndexedDB backing store so it is exempt from
 * automatic eviction under storage pressure. Best-effort: never blocks boot.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Opens the DB once so IndexedDB has a live connection to flush writes on. */
export function primeOfflineConnection(): void {
  void getOfflineDb().catch(() => undefined);
}
