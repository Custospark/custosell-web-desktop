import { getOfflineDb } from '../core/offlineDb';

export type CatalogEntity = 'products' | 'categories' | 'customers' | 'roles' | 'staff' | 'sales';

export type ProductCatalogKind = 'full' | 'active';

export interface ServerCatalogRecord<T = unknown> {
  key: string;
  businessId: number;
  entity: CatalogEntity;
  catalogKind: string;
  items: T[];
  syncedAt: string;
}

function catalogKey(entity: CatalogEntity, businessId: number, catalogKind: string): string {
  return `${entity}:${businessId}:${catalogKind}`;
}

export const serverCatalogStore = {
  async save<T>(
    entity: CatalogEntity,
    businessId: number,
    items: T[],
    catalogKind = 'default',
  ): Promise<void> {
    const db = await getOfflineDb();
    const record: ServerCatalogRecord<T> = {
      key: catalogKey(entity, businessId, catalogKind),
      businessId,
      entity,
      catalogKind,
      items,
      syncedAt: new Date().toISOString(),
    };
    await db.put('serverCatalogs', record);
  },

  async load<T>(
    entity: CatalogEntity,
    businessId: number,
    catalogKind = 'default',
  ): Promise<T[] | null> {
    const db = await getOfflineDb();
    const record = await db.get('serverCatalogs', catalogKey(entity, businessId, catalogKind)) as
      | ServerCatalogRecord<T>
      | undefined;
    return record?.items ?? null;
  },

  async loadProducts(businessId: number): Promise<unknown[] | null> {
    const full = await this.load('products', businessId, 'full');
    if (full && full.length > 0) return full;
    return this.load('products', businessId, 'active');
  },

  async clearBusiness(entity: CatalogEntity, businessId: number): Promise<void> {
    const db = await getOfflineDb();
    const prefix = `${entity}:${businessId}:`;
    const all = await db.getAll('serverCatalogs') as ServerCatalogRecord[];
    const tx = db.transaction('serverCatalogs', 'readwrite');
    for (const record of all) {
      if (record.key.startsWith(prefix)) {
        await tx.store.delete(record.key);
      }
    }
    await tx.done;
  },
};
