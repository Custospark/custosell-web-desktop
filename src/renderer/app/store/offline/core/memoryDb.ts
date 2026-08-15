/**
 * In-memory IndexedDB-compatible database used as the durable fallback when
 * the real IndexedDB cannot be opened. Every offline store routes through the
 * same API (getAll/get/getAllFromIndex/add/put/delete/count/clear/transaction),
 * so when IDB is down the app keeps working with zero data loss - writes land
 * here instead of being silently dropped. When the real DB opens again, the
 * records are flushed into IndexedDB (see flushMemoryDbIntoRealDb).
 */

type Key = IDBValidKey | IDBKeyRange;

const STORE_KEY_PATHS: Record<string, string | string[] | null> = {
  stock: ['businessId', 'productId'],
  adjustments: 'id',
  mutations: 'id',
  localSales: 'localId',
  localRefunds: 'localId',
  localShifts: 'localId',
  localProducts: 'localId',
  localCategories: 'localId',
  localCustomers: 'localId',
  localExpenses: 'localId',
  localExpenseCategories: 'localId',
  localRoles: 'localId',
  localStaff: 'localId',
  localBusinessSettings: 'localId',
  localAuth: 'localId',
  localGuideFeedback: 'localId',
  localOrders: 'localId',
  localQuickNotes: 'localId',
  secureSecrets: 'key',
  secureKeys: 'id',
  serverCatalogs: 'key',
  entityIdMappings: ['entity', 'oldId'],
};

/** Known stores (objectStoreNames.contains must be true for these). */
const KNOWN_STORES = Object.keys(STORE_KEY_PATHS);

function resolveKey(storeName: string, value: unknown): string {
  const keyPath = STORE_KEY_PATHS[storeName];
  if (!keyPath) return String(value && typeof value === 'object' && 'localId' in (value as object) ? (value as { localId?: unknown }).localId : value ?? '');
  if (Array.isArray(keyPath)) {
    const record = value as Record<string, unknown>;
    return keyPath.map((p) => String(record[p])).join('\u0000');
  }
  const record = value as Record<string, unknown>;
  return String(record[keyPath]);
}

class MemoryStore {
  private rows = new Map<string, unknown>();

  getAll(): unknown[] {
    return Array.from(this.rows.values());
  }

  getAllFromIndex(_index: string, key: unknown): unknown[] {
    if (key == null) return this.getAll();
    return this.getAll().filter((row) => (row as Record<string, unknown>)?.businessId === key);
  }

  get(key: Key): unknown {
    if (key && typeof key === 'object' && 'range' in (key as object)) {
      return undefined;
    }
    if (Array.isArray(key)) {
      return this.rows.get(key.map(String).join('\u0000'));
    }
    return this.rows.get(String(key));
  }

  add(value: unknown): void {
    const key = resolveKey(this.storeName, value);
    this.rows.set(key, value);
  }

  put(value: unknown): void {
    const key = resolveKey(this.storeName, value);
    this.rows.set(key, value);
  }

  delete(key: Key): void {
    if (key && typeof key === 'object' && 'range' in (key as object)) return;
    const k = Array.isArray(key) ? key.map(String).join('\u0000') : String(key);
    this.rows.delete(k);
  }

  count(): number {
    return this.rows.size;
  }

  clear(): void {
    this.rows.clear();
  }

  private readonly storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }
}

class MemoryTransaction {
  private readonly db: MemoryDb;
  readonly storeNames: string[];

  constructor(db: MemoryDb, storeNames: string[]) {
    this.db = db;
    this.storeNames = storeNames;
  }

  objectStore(name: string): MemoryStore {
    return this.db.getStore(name);
  }

  get done(): Promise<void> {
    return Promise.resolve();
  }
}

export class MemoryDb {
  private stores = new Map<string, MemoryStore>();

  /** Shared store instance for this db (transactions see writes made outside). */
  getStore(name: string): MemoryStore {
    let store = this.stores.get(name);
    if (!store) {
      store = new MemoryStore(name);
      this.stores.set(name, store);
    }
    return store;
  }

  get name(): string {
    return 'CustosellOffline';
  }

  get version(): number {
    return 16;
  }

  get objectStoreNames(): { contains: (name: string) => boolean } {
    return { contains: (name) => KNOWN_STORES.includes(name) };
  }

  getAll(storeName: string): Promise<unknown[]> {
    return Promise.resolve(this.getStore(storeName).getAll());
  }

  getAllFromIndex(storeName: string, index: string, key: unknown): Promise<unknown[]> {
    return Promise.resolve(this.getStore(storeName).getAllFromIndex(index, key));
  }

  get(storeName: string, key: Key): Promise<unknown> {
    return Promise.resolve(this.getStore(storeName).get(key));
  }

  add(storeName: string, value: unknown): Promise<void> {
    this.getStore(storeName).add(value);
    return Promise.resolve();
  }

  put(storeName: string, value: unknown): Promise<void> {
    this.getStore(storeName).put(value);
    return Promise.resolve();
  }

  delete(storeName: string, key: Key): Promise<void> {
    this.getStore(storeName).delete(key);
    return Promise.resolve();
  }

  count(storeName: string): Promise<number> {
    return Promise.resolve(this.getStore(storeName).count());
  }

  clear(storeName: string): Promise<void> {
    this.getStore(storeName).clear();
    return Promise.resolve();
  }

  transaction(storeNames: string | string[], _mode?: string): MemoryTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MemoryTransaction(this, names);
  }

  /** All rows across all stores - used to flush memory into the real IDB. */
  dumpAll(): Map<string, unknown[]> {
    const out = new Map<string, unknown[]>();
    for (const [name, store] of this.stores) {
      out.set(name, store.getAll());
    }
    return out;
  }

  /** Drop all rows (used by tests). */
  clearAll(): void {
    this.stores.clear();
  }

  close(): void {
    /* no-op */
  }
}

let memoryDbSingleton: MemoryDb | null = null;

export function getMemoryDb(): MemoryDb {
  if (!memoryDbSingleton) {
    memoryDbSingleton = new MemoryDb();
  }
  return memoryDbSingleton;
}

/** Reset the in-memory DB (used by tests). */
export function resetMemoryDb(): void {
  memoryDbSingleton = null;
}
