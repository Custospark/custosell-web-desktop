import { openDB, type IDBPDatabase } from 'idb';

export const OFFLINE_DB_NAME = 'CustosellOffline';
export const OFFLINE_DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getOfflineDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db, oldVersion) {
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
        if (oldVersion < 4 && !db.objectStoreNames.contains('localSales')) {
          const salesStore = db.createObjectStore('localSales', { keyPath: 'localId' });
          salesStore.createIndex('syncStatus', 'syncStatus');
          salesStore.createIndex('mutationId', 'mutationId');
        }
      },
    });
  }
  return dbPromise;
}
