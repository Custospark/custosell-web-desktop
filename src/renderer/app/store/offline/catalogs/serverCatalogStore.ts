import { getOfflineDb } from '../core/offlineDb';

export type CatalogEntity =
  | 'products'
  | 'categories'
  | 'customers'
  | 'roles'
  | 'staff'
  | 'sales'
  | 'expenses'
  | 'expenseCategories'
  | 'locations'
  | 'dashboard'
  | 'quickNotes';

export type ProductCatalogKind = 'full' | 'active';

export interface ServerCatalogRecord<T = unknown> {
  key: string;
  businessId: number;
  entity: CatalogEntity;
  catalogKind: string;
  locationId: number | null;
  items: T[];
  syncedAt: string;
}

function catalogKey(entity: CatalogEntity, businessId: number, catalogKind: string, locationId: number | null = null): string {
  if (entity === 'products') {
    return `${entity}:${businessId}:${catalogKind}:loc-${locationId ?? 0}`;
  }
  return `${entity}:${businessId}:${catalogKind}`;
}

export const serverCatalogStore = {
  async save<T>(
    entity: CatalogEntity,
    businessId: number,
    items: T[],
    catalogKind = 'default',
    locationId: number | null = null,
  ): Promise<void> {
    const db = await getOfflineDb();
    const record: ServerCatalogRecord<T> = {
      key: catalogKey(entity, businessId, catalogKind, locationId),
      businessId,
      entity,
      catalogKind,
      locationId,
      items,
      syncedAt: new Date().toISOString(),
    };
    await db.put('serverCatalogs', record);
  },

  async load<T>(
    entity: CatalogEntity,
    businessId: number,
    catalogKind = 'default',
    locationId: number | null = null,
  ): Promise<T[] | null> {
    const db = await getOfflineDb();
    const record = await db.get('serverCatalogs', catalogKey(entity, businessId, catalogKind, locationId)) as
      | ServerCatalogRecord<T>
      | undefined;
    return record?.items ?? null;
  },

  async loadProducts(businessId: number, locationId: number | null = null): Promise<unknown[] | null> {
    const full = await this.load('products', businessId, 'full', locationId);
    if (full && full.length > 0) return full;
    return this.load('products', businessId, 'active', locationId);
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
