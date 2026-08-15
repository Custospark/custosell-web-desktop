import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openDB: vi.fn(),
}));

vi.mock('idb', () => ({
  openDB: mocks.openDB,
}));

import {
  getOfflineDb,
  isOfflineDbBroken,
  markOfflineDbBroken,
  safeStore,
} from '../offlineDb';

/**
 * Locks the permanent broken-DB fix: when IndexedDB fails to open (timeout,
 * blocked, quota), getOfflineDb resolves to a no-op stub and every store read
 * returns safe defaults - it never throws, so queries always fall back to
 * server data instead of erroring out.
 */

describe('offlineDb broken-DB resilience', () => {
  beforeEach(() => {
    mocks.openDB.mockReset();
    // Reset the module-level dbBroken flag between tests.
    // (dbBroken is module state; markOfflineDbBroken sets it true.)
    vi.resetModules();
  });

  it('getOfflineDb resolves to a stub (does not reject) when DB is marked broken', async () => {
    markOfflineDbBroken();
    const db = await getOfflineDb();
    expect(db).toBeTruthy();
    expect(isOfflineDbBroken()).toBe(true);
  });

  it('getAll on a broken DB returns an empty array', async () => {
    markOfflineDbBroken();
    const rows = await safeStore.getAll('localQuickNotes');
    expect(rows).toEqual([]);
  });

  it('get on a broken DB returns undefined', async () => {
    markOfflineDbBroken();
    const row = await safeStore.get('localQuickNotes', 'anything');
    expect(row).toBeUndefined();
  });

  it('add/put/delete on a broken DB do not throw', async () => {
    markOfflineDbBroken();
    await expect(safeStore.add('localQuickNotes', { id: 1 })).resolves.toBeUndefined();
    await expect(safeStore.put('localQuickNotes', { id: 1 })).resolves.toBeUndefined();
    await expect(safeStore.delete('localQuickNotes', 1)).resolves.toBeUndefined();
  });
});
