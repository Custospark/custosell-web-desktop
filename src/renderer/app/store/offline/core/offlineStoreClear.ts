import { getOfflineDb } from './offlineDb';

/** Stores that hold auth/session/encryption and must NEVER be wiped - wiping
 *  them would log the user out (the session + its encryption key live here). */
const AUTH_SECURE_STORES = new Set(['secureKeys', 'secureSecrets', 'localAuth']);

/** Wipe every row from the real IndexedDB (used by tests between cases). */
export async function clearOfflineDbStores(): Promise<void> {
  try {
    const db = await getOfflineDb();
    const names = Array.from((db as unknown as { objectStoreNames: Iterable<string> }).objectStoreNames);
    for (const name of names) {
      await db.clear(name as never);
    }
  } catch (err) {
    console.warn('[OfflineDB] clear stores skipped (non-fatal):', err);
  }
}

/**
 * Wipe every business-data store while preserving auth/secure stores. Used on
 * account switch so the new account starts clean (no previous-account data)
 * without destroying the freshly-persisted session or its encryption key.
 */
export async function clearBusinessOfflineStores(): Promise<void> {
  try {
    const db = await getOfflineDb();
    const names = Array.from((db as unknown as { objectStoreNames: Iterable<string> }).objectStoreNames);
    for (const name of names) {
      if (AUTH_SECURE_STORES.has(name)) continue;
      await db.clear(name as never);
    }
  } catch (err) {
    console.warn('[OfflineDB] clear business stores skipped (non-fatal):', err);
  }
}
