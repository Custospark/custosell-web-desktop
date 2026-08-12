import { openDB, type IDBPDatabase } from 'idb';

export const OFFLINE_DB_NAME = 'CustosellOffline';
export const OFFLINE_DB_VERSION = 15;

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
];

const OPEN_TIMEOUT_MS = 8000;

let dbPromise: Promise<IDBPDatabase> | null = null;

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
    async upgrade(db, oldVersion) {
      ensureObjectStores(db);

      if (oldVersion < 15) {
        await migrateToV15(db);
      }
    },
    blocked() {
      console.warn('[OfflineDB] Upgrade blocked — close other tabs using Custosell');
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
 * so it is recreated; it is re-seeded from the server catalog on next sync).
 * A `businessId` index is added to every business-scoped store, and existing
 * records are backfilled from the record's own business_id (products, shifts)
 * or from a linked mutation's businessId.
 */
async function migrateToV15(db: IDBPDatabase): Promise<void> {
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

  const scoped = BUSINESS_SCOPED_STORES.filter((s) => db.objectStoreNames.contains(s));
  if (scoped.length > 0) {
    const txn = db.transaction(scoped, 'readwrite');

    for (const storeName of scoped) {
      const store = txn.objectStore(storeName);
      if (!store.indexNames.contains('businessId')) {
        store.createIndex('businessId', 'businessId');
      }
    }

    await backfillBusinessIds(txn, scoped);
    await txn.done;
  }
}

/** Stamp businessId on legacy records lacking it, using each row's own
 *  business_id (products/shifts) or the linked mutation's businessId. */
async function backfillBusinessIds(
  txn: IDBPTransaction,
  scoped: string[],
): Promise<void> {
  const mutationsStore = txn.db.objectStoreNames.contains('mutations')
    ? txn.db.transaction('mutations', 'readonly').objectStore('mutations')
    : null;

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
      await store.put(rec);
    }
  }
}

export function getOfflineDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = Promise.race([
      openOfflineDatabase(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('IndexedDB open timed out')), OPEN_TIMEOUT_MS);
      }),
    ]).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
