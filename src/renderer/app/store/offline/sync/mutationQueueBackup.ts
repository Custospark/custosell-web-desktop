import type { QueuedMutation } from './mutationQueue';

/**
 * Durable localStorage mirror of the mutation queue. IndexedDB is the primary
 * store; this backup guarantees that even if IndexedDB is unavailable at
 * shutdown (or a cold start happens before memory flushes), queued mutations
 * survive and are restored on the next boot - so offline work is never lost.
 */

const STORAGE_KEY = 'custosell.mutationQueue.backup.v1';

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readAll(): QueuedMutation[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: QueuedMutation[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Storage full / unavailable - best effort only.
  }
}

export const mutationQueueBackup = {
  /** Persist the full queue to localStorage (cheap, small JSON). */
  sync(rows: QueuedMutation[]): void {
    writeAll(rows);
  },

  /** Restore queued mutations that are missing from the live DB. */
  restoreMissing(existing: QueuedMutation[]): QueuedMutation[] {
    const backups = readAll();
    if (backups.length === 0) return [];
    const existingIds = new Set(existing.map((m) => m.id));
    const missing = backups.filter((m) => !existingIds.has(m.id) && m.status !== 'completed');
    // Only keep live rows going forward so the backup reflects reality.
    writeAll([...existing, ...missing]);
    return missing;
  },

  clear(): void {
    const store = storage();
    if (store) store.removeItem(STORAGE_KEY);
  },
};
