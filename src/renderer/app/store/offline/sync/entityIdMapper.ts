import { getOfflineDb } from '../core/offlineDb';

export type EntityIdKind = 'order' | 'sale' | 'category' | 'role' | 'shift' | 'expense-category';

export interface EntityIdMappingRecord {
  entity: EntityIdKind;
  oldId: number;
  newId: number;
  businessId?: number;
  createdAt: string;
}

const MAPPING_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Durable temp->server id map for every offline entity with a dependency chain
 * (order, sale, category, role, shift, expense-category). Survives passes so a
 * mutation that is enqueued AFTER its create commits can still resolve the
 * server id instead of waiting for a create remap that will never arrive
 * (infinite "Updating inventory" state). Entries are pruned after TTL to keep
 * the store bounded.
 */
export const entityIdMapper = {
  async rememberId(entity: EntityIdKind, oldId: number, newId: number, businessId?: number): Promise<void> {
    if (!Number.isInteger(oldId) || !Number.isInteger(newId)) return;
    await this.pruneMappings();
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('entityIdMappings')) return;
    await db.put('entityIdMappings', {
      entity,
      oldId,
      newId,
      businessId,
      createdAt: new Date().toISOString(),
    } satisfies EntityIdMappingRecord);
  },

  async resolveId(entity: EntityIdKind, oldId: number, businessId?: number): Promise<number | undefined> {
    if (!Number.isInteger(oldId)) return undefined;
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('entityIdMappings')) return undefined;
    const record = await db.get('entityIdMappings', [entity, oldId]);
    if (!record) return undefined;
    if (businessId != null && record.businessId != null && record.businessId !== businessId) {
      return undefined;
    }
    return record.newId;
  },

  async remapBusinessId(oldBusinessId: number, newBusinessId: number): Promise<void> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('entityIdMappings')) return;
    const all = await db.getAll('entityIdMappings');
    for (const record of all) {
      if (record.businessId === oldBusinessId) {
        record.businessId = newBusinessId;
        await db.put('entityIdMappings', record);
      }
    }
  },

  async pruneMappings(): Promise<void> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('entityIdMappings')) return;
    const cutoff = Date.now() - MAPPING_TTL_MS;
    const all = await db.getAll('entityIdMappings');
    for (const record of all) {
      const createdAt = Date.parse(record.createdAt ?? '');
      if (Number.isNaN(createdAt) || createdAt < cutoff) {
        await db.delete('entityIdMappings', [record.entity, record.oldId]);
      }
    }
  },
};