import { getOfflineDb } from './offlineDb';
import type { Business, UpdateBusinessData } from '../../../modules/settings/api/settings/BusinessTypes';

export type LocalBusinessSettingsSyncStatus = 'pending' | 'synced' | 'failed';

export type BusinessSettingsMutationType = 'update';

export interface LocalBusinessSettingsRecord {
  localId: string;
  mutationId: string;
  mutationType: BusinessSettingsMutationType;
  businessId: number;
  business: Business;
  payload: UpdateBusinessData;
  syncStatus: LocalBusinessSettingsSyncStatus;
  createdAt: string;
  syncedAt?: string;
}

export type BusinessWithSyncMeta = Business & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toBusinessWithSyncMeta(record: LocalBusinessSettingsRecord): BusinessWithSyncMeta {
  return {
    ...record.business,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localBusinessSettingsStore = {
  async save(
    business: Business,
    payload: UpdateBusinessData,
    mutationId: string,
    mutationType: BusinessSettingsMutationType = 'update',
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalBusinessSettingsRecord = {
      localId,
      mutationId,
      mutationType,
      businessId: business.id,
      business,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localBusinessSettings', record);
    return localId;
  },

  async getAll(): Promise<LocalBusinessSettingsRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localBusinessSettings');
  },

  async getPending(): Promise<LocalBusinessSettingsRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async getLatestPending(): Promise<LocalBusinessSettingsRecord | null> {
    const pending = await this.getPending();
    return pending.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverBusiness?: Partial<Business>,
  ): Promise<Business | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localBusinessSettings');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return null;

    record.syncStatus = 'synced';
    record.syncedAt = new Date().toISOString();
    if (serverBusiness) {
      record.business = { ...record.business, ...serverBusiness };
      record.businessId = record.business.id;
    }
    await db.put('localBusinessSettings', record);
    return record.business;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localBusinessSettings');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localBusinessSettings', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localBusinessSettings');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localBusinessSettings', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localBusinessSettings');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localBusinessSettings', record.localId);
    }
  },
};
