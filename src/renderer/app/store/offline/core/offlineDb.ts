import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { getMemoryDb, type MemoryDb } from './memoryDb';

export const OFFLINE_DB_NAME = 'CustosellOffline';
export const OFFLINE_DB_VERSION = 16;

/** Stores whose records carry a businessId and get a businessId index. */
const BUSINESS_SCOPED_STORES = [
  'mutations',
  'adjustments',
  'localSales',
  'localRefunds',
  'localShifts',
  'localProducts',
  'localCategories',
  'localCustomers',
  'localExpenses',
  'localExpenseCategories',
  'localRoles',
  'localStaff',
  'localBusinessSettings',
  'localOrders',
  'localGuideFeedback',
  'localQuickNotes',
];

const OPEN_TIMEOUT_MS = 8000;
const OPEN_RETRY_DELAY_MS = 3000;

let dbPromise: Promise<IDBPDatabase | MemoryDb> | null = null;

/**
 * Tracks whether the real IndexedDB is unavailable. When true, all reads/writes
 * route through an in-memory database so NOTHING is lost, and the real DB is
 * retried in the background; on recovery the memory DB is flushed into it.
 */
let dbBroken = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function isOfflineDbBroken(): boolean {
  return dbBroken;
}

/** Reset the offline DB module state (used by tests) so each case starts fresh. */
export function resetOfflineDbState(): void {
  dbBroken = false;
  dbPromise = null;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  getMemoryDb().clearAll();
}

/** Close the active IndexedDB connection (used by tests before deleting the DB). */
export async function closeOfflineDb(): Promise<void> {
  try {
    const db = await dbPromise;
    if (db && 'close' in db) db.close();
  } catch {
    /* ignore */
  }
  dbPromise = null;
}

/** Wipe every row from the real IndexedDB (used by tests between cases). */
export async function clearOfflineDbStores(): Promise<void> {
  try {
    const db = await getOfflineDb();
    for (const name of Array.from(db.objectStoreNames)) {
      await db.clear(name as never);
    }
  } catch (err) {
    console.warn('[OfflineDB] clear stores skipped (non-fatal):', err);
  }
}

export function markOfflineDbBroken(): void {
  dbBroken = true;
  dbPromise = null;
  scheduleRetryOpen();
}

/** Try to reopen the real IndexedDB and, on success, flush memory into it. */
function scheduleRetryOpen(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void retryOpenRealDb();
  }, OPEN_RETRY_DELAY_MS);
}

async function retryOpenRealDb(): Promise<void> {
  try {
    const real = await openOfflineDatabase();
    await flushMemoryDbIntoRealDb(real);
    dbBroken = false;
    dbPromise = Promise.resolve(real);
  } catch (err) {
    console.warn('[OfflineDB] Retry open failed, staying on in-memory DB (non-fatal):', err);
    scheduleRetryOpen();
  }
}

/** Copy all rows held in the in-memory DB into the real IndexedDB. */
async function flushMemoryDbIntoRealDb(real: IDBPDatabase): Promise<void> {
  try {
    const memory = getMemoryDb();
    const dump = memory.dumpAll();
    for (const [storeName, rows] of dump) {
      if (rows.length === 0) continue;
      if (!real.objectStoreNames.contains(storeName)) continue;
      for (const row of rows) {
        await real.put(storeName, row as never);
      }
    }
  } catch (err) {
    console.warn('[OfflineDB] Flush memory -> IndexedDB failed (non-fatal):', err);
  }
}

export type OfflineDbLike = IDBPDatabase | MemoryDb;

/**
 * Resolve the active database - the real IndexedDB when available, otherwise
 * the in-memory fallback. NEVER throws: a broken DB degrades to memory so every
 * offline write is recorded and queued, then flushed to IDB on recovery.
 */
export function getOfflineDb(): Promise<OfflineDbLike> {
  if (dbBroken) {
    return Promise.resolve(getMemoryDb());
  }
  if (!dbPromise) {
    dbPromise = Promise.race([
      openOfflineDatabase(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          markOfflineDbBroken();
          reject(new Error('IndexedDB open timed out'));
        }, OPEN_TIMEOUT_MS);
      }),
    ]).catch(() => {
      markOfflineDbBroken();
      return getMemoryDb();
    });
  }
  return dbPromise;
}

/**
 * Safe IndexedDB access layer. Every call is guarded so a broken/unavailable DB
 * (timeout, blocked, quota, corrupted) degrades to the in-memory database -
 * writes are recorded (never dropped) and reads return what's pending in memory.
 * Server-first reads already render before these run; these helpers make offline
 * overlays/pending reads non-fatal everywhere while preserving every mutation.
 */
export const safeStore = {
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await getOfflineDb();
    return (await db.getAll(storeName)) as T[];
  },

  async getAllFromIndex<T>(storeName: string, index: string, key: unknown): Promise<T[]> {
    const db = await getOfflineDb();
    if ('getAllFromIndex' in db) {
      return (await db.getAllFromIndex(storeName, index, key)) as T[];
    }
    const all = (await db.getAll(storeName)) as Array<Record<string, unknown>>;
    return all.filter((r) => r[index] === key) as T[];
  },  async get<T>(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
    const db = await getOfflineDb();
    return (await db.get(storeName, key)) as T | undefined;
  },

  async add(storeName: string, value: unknown): Promise<void> {
    const db = await getOfflineDb();
    await db.add(storeName, value as never);
  },

  async put(storeName: string, value: unknown): Promise<void> {
    const db = await getOfflineDb();
    await db.put(storeName, value as never);
  },

  async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<void> {
    const db = await getOfflineDb();
    await db.delete(storeName, key);
  },
};

function ensureObjectStores(db: IDBPDatabase): void {
  if (!db.objectStoreNames.contains('stock')) {
    const stockStore = db.createObjectStore('stock', { keyPath: ['businessId', 'productId'] });
    stockStore.createIndex('businessId', 'businessId');
    stockStore.createIndex('productId', 'productId');
  }
  if (!db.objectStoreNames.contains('adjustments')) {
    const adjStore = db.createObjectStore('adjustments', { keyPath: 'id' });
    adjStore.createIndex('syncStatus', 'syncStatus');
  }
  if (!db.objectStoreNames.contains('mutations')) {
    db.createObjectStore('mutations', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('localSales')) {
    const salesStore = db.createObjectStore('localSales', { keyPath: 'localId' });
    salesStore.createIndex('syncStatus', 'syncStatus');
    salesStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localRefunds')) {
    const refundStore = db.createObjectStore('localRefunds', { keyPath: 'localId' });
    refundStore.createIndex('syncStatus', 'syncStatus');
    refundStore.createIndex('saleId', 'saleId');
    refundStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localShifts')) {
    const shiftStore = db.createObjectStore('localShifts', { keyPath: 'localId' });
    shiftStore.createIndex('syncStatus', 'syncStatus');
    shiftStore.createIndex('mutationId', 'mutationId');
    shiftStore.createIndex('shiftId', 'shiftId');
  }
  if (!db.objectStoreNames.contains('localProducts')) {
    const prodStore = db.createObjectStore('localProducts', { keyPath: 'localId' });
    prodStore.createIndex('syncStatus', 'syncStatus');
    prodStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localCategories')) {
    const catStore = db.createObjectStore('localCategories', { keyPath: 'localId' });
    catStore.createIndex('syncStatus', 'syncStatus');
    catStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localCustomers')) {
    const custStore = db.createObjectStore('localCustomers', { keyPath: 'localId' });
    custStore.createIndex('syncStatus', 'syncStatus');
    custStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localExpenses')) {
    const expStore = db.createObjectStore('localExpenses', { keyPath: 'localId' });
    expStore.createIndex('syncStatus', 'syncStatus');
    expStore.createIndex('mutationId', 'mutationId');
    expStore.createIndex('expenseCategoryId', 'expenseCategoryId');
  }
  if (!db.objectStoreNames.contains('localExpenseCategories')) {
    const expCatStore = db.createObjectStore('localExpenseCategories', { keyPath: 'localId' });
    expCatStore.createIndex('syncStatus', 'syncStatus');
    expCatStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localRoles')) {
    const rolesStore = db.createObjectStore('localRoles', { keyPath: 'localId' });
    rolesStore.createIndex('syncStatus', 'syncStatus');
    rolesStore.createIndex('mutationId', 'mutationId');
    rolesStore.createIndex('roleId', 'roleId');
  }
  if (!db.objectStoreNames.contains('localStaff')) {
    const staffStore = db.createObjectStore('localStaff', { keyPath: 'localId' });
    staffStore.createIndex('syncStatus', 'syncStatus');
    staffStore.createIndex('mutationId', 'mutationId');
    staffStore.createIndex('staffId', 'staffId');
    staffStore.createIndex('roleId', 'roleId');
  }
  if (!db.objectStoreNames.contains('localBusinessSettings')) {
    const businessStore = db.createObjectStore('localBusinessSettings', { keyPath: 'localId' });
    businessStore.createIndex('syncStatus', 'syncStatus');
    businessStore.createIndex('mutationId', 'mutationId');
    businessStore.createIndex('businessId', 'businessId');
  }
  if (!db.objectStoreNames.contains('localAuth')) {
    const authStore = db.createObjectStore('localAuth', { keyPath: 'localId' });
    authStore.createIndex('normalizedEmail', 'normalizedEmail');
    authStore.createIndex('syncStatus', 'syncStatus');
    authStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localGuideFeedback')) {
    const feedbackStore = db.createObjectStore('localGuideFeedback', { keyPath: 'localId' });
    feedbackStore.createIndex('syncStatus', 'syncStatus');
    feedbackStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localQuickNotes')) {
    const notesStore = db.createObjectStore('localQuickNotes', { keyPath: 'localId' });
    notesStore.createIndex('syncStatus', 'syncStatus');
    notesStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('localOrders')) {
    const ordersStore = db.createObjectStore('localOrders', { keyPath: 'localId' });
    ordersStore.createIndex('syncStatus', 'syncStatus');
    ordersStore.createIndex('mutationId', 'mutationId');
  }
  if (!db.objectStoreNames.contains('secureSecrets')) {
    db.createObjectStore('secureSecrets', { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains('secureKeys')) {
    db.createObjectStore('secureKeys', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('serverCatalogs')) {
    const catalogStore = db.createObjectStore('serverCatalogs', { keyPath: 'key' });
    catalogStore.createIndex('businessId', 'businessId');
    catalogStore.createIndex('entity', 'entity');
  }
  if (!db.objectStoreNames.contains('entityIdMappings')) {
    const idMapStore = db.createObjectStore('entityIdMappings', { keyPath: ['entity', 'oldId'] });
    idMapStore.createIndex('businessId', 'businessId');
    idMapStore.createIndex('createdAt', 'createdAt');
  }
}

function openOfflineDatabase(): Promise<IDBPDatabase> {
  return openDB(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      ensureObjectStores(db);

      if (oldVersion < 15) {
        await migrateToV15(db, transaction);
      }
    },
    blocked() {
      console.warn('[OfflineDB] Upgrade blocked - close other tabs using Custosell');
    },
    blocking() {
      console.warn('[OfflineDB] Blocking older connection for upgrade');
    },
  });
}

/**
 * v14 → v15: business-scope the offline stores so work entered for one business
 * can never leak into another when users share a machine. The `stock` store is
 * re-keyed to ['businessId','productId'] (a keyPath cannot be changed in place,
 * so it is recreated). Existing stock rows are carried across by resolving each
 * productId's businessId from the server catalog and local pending products, so
 * no offline quantity is lost even if the device is offline at upgrade time.
 * A `businessId` index is added to every business-scoped store, and existing
 * records are backfilled from the record's own business_id (products, shifts)
 * or from a linked mutation's businessId.
 */
async function migrateToV15(
  db: IDBPDatabase,
  txn: IDBPTransaction<unknown, string[], 'versionchange'>,
): Promise<void> {
  let oldStockRows: Array<{ productId: number; quantity: number }> = [];
  try {
    if (db.objectStoreNames.contains('stock')) {
      const rows = (await txn.objectStore('stock').getAll()) as
        | Array<{ productId: number; quantity: number }>
        | undefined;
      oldStockRows = rows ?? [];
    }
  } catch (err) {
    console.warn('[OfflineDB] v15 old stock read skipped:', err);
  }

  const productBusiness = await buildProductBusinessMap(txn);

  try {
    if (db.objectStoreNames.contains('stock')) {
      db.deleteObjectStore('stock');
    }
    const stockStore = db.createObjectStore('stock', { keyPath: ['businessId', 'productId'] });
    stockStore.createIndex('businessId', 'businessId');
    stockStore.createIndex('productId', 'productId');
  } catch (err) {
    console.warn('[OfflineDB] v15 stock re-key skipped:', err);
  }

  await reseedStockStore(txn, oldStockRows, productBusiness);

  const scoped = BUSINESS_SCOPED_STORES.filter((s) => db.objectStoreNames.contains(s) && s !== 'stock');
  for (const storeName of scoped) {
    const store = txn.objectStore(storeName);
    if (store && !store.indexNames.contains('businessId')) {
      store.createIndex('businessId', 'businessId');
    }
  }

  await backfillBusinessIds(txn, scoped);
}

/** Map every locally-known productId to its businessId, from the server catalog
 *  snapshots (products) and the local pending product records. */
async function buildProductBusinessMap(
  txn: IDBPTransaction<unknown, string[], 'versionchange'>,
): Promise<Map<number, number>> {
  const map = new Map<number, number>();

  try {
    if (txn.objectStoreNames.contains('serverCatalogs')) {
      const records = (await txn.objectStore('serverCatalogs').getAll()) as
        | Array<{ entity?: string; items?: Array<{ id: number; business_id?: number }> }>
        | undefined;
      for (const record of records ?? []) {
        if (record.entity !== 'products') continue;
        for (const item of record.items ?? []) {
          if (item.id && item.business_id) map.set(item.id, item.business_id);
        }
      }
    }
  } catch (err) {
    console.warn('[OfflineDB] v15 product business map (catalog) skipped:', err);
  }

  try {
    if (txn.objectStoreNames.contains('localProducts')) {
      const records = (await txn.objectStore('localProducts').getAll()) as
        | Array<{ product?: { id: number; business_id?: number } }>
        | undefined;
      for (const record of records ?? []) {
        if (record.product?.id && record.product.business_id) {
          map.set(record.product.id, record.product.business_id);
        }
      }
    }
  } catch (err) {
    console.warn('[OfflineDB] v15 product business map (local) skipped:', err);
  }

  return map;
}

/** Re-populate the re-keyed stock store from the old rows (best-effort) so no
 *  offline quantity is lost during an offline upgrade. Products whose businessId
 *  cannot be resolved are left for the server catalog re-seed on next sync. */
async function reseedStockStore(
  txn: IDBPTransaction<unknown, string[], 'versionchange'>,
  oldStockRows: Array<{ productId: number; quantity: number }>,
  productBusiness: Map<number, number>,
): Promise<void> {
  if (oldStockRows.length === 0) return;

  try {
    const store = txn.objectStore('stock');
    const now = new Date().toISOString();

    for (const row of oldStockRows) {
      const businessId = productBusiness.get(row.productId);
      if (businessId == null || businessId <= 0) continue;
      await store.put({
        businessId,
        productId: row.productId,
        quantity: Math.max(0, row.quantity),
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('[OfflineDB] v15 stock re-seed skipped:', err);
  }
}

/** Stamp businessId on legacy records lacking it, using each row's own
 *  business_id (products/shifts) or the linked mutation's businessId. */
async function backfillBusinessIds(
  txn: IDBPTransaction<unknown, string[], 'versionchange'>,
  scoped: string[],
): Promise<void> {
  const mutationsStore = txn.objectStoreNames.contains('mutations') ? txn.objectStore('mutations') : null;

  const readMutationBusiness = async (mutationId: string | undefined): Promise<number | undefined> => {
    if (!mutationId || !mutationsStore) return undefined;
    const m = (await mutationsStore.get(mutationId)) as { businessId?: number } | undefined;
    return m?.businessId;
  };

  for (const storeName of scoped) {
    const store = txn.objectStore(storeName);
    const all = await store.getAll();

    for (const rec of all as Array<Record<string, unknown>>) {
      if (rec.businessId != null) continue;

      let businessId: number | undefined;

      if (storeName === 'localProducts' || storeName === 'localShifts') {
        const nested = rec.product as { business_id?: number } | undefined;
        const shift = rec.shift as { business_id?: number } | undefined;
        businessId = nested?.business_id ?? shift?.business_id;
      }

      if (businessId == null) {
        businessId = await readMutationBusiness(rec.mutationId as string | undefined);
      }

      if (businessId == null) continue;
      rec.businessId = businessId;
      if (store) await store.put(rec);
    }
  }
}

