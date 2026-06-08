import { openDB, type IDBPDatabase } from 'idb';

export const OFFLINE_DB_NAME = 'CustosellOffline';
export const OFFLINE_DB_VERSION = 10;

const OPEN_TIMEOUT_MS = 8000;

let dbPromise: Promise<IDBPDatabase> | null = null;

function ensureObjectStores(db: IDBPDatabase): void {
  if (!db.objectStoreNames.contains('stock')) {
    db.createObjectStore('stock', { keyPath: 'productId' });
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
  if (!db.objectStoreNames.contains('secureSecrets')) {
    db.createObjectStore('secureSecrets', { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains('secureKeys')) {
    db.createObjectStore('secureKeys', { keyPath: 'id' });
  }
}

function openOfflineDatabase(): Promise<IDBPDatabase> {
  return openDB(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
    upgrade(db) {
      ensureObjectStores(db);
    },
    blocked() {
      console.warn('[OfflineDB] Upgrade blocked — close other tabs using Custosell');
    },
    blocking() {
      console.warn('[OfflineDB] Blocking older connection for upgrade');
    },
  });
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
