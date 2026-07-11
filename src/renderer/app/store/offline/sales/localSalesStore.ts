import { getOfflineDb } from '../core/offlineDb';
import type { CreateSalePayload, Sale } from '../../../../modules/sales/api/salesTypes';

export type LocalSaleSyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalSaleRecord {
  localId: string;
  mutationId: string;
  sale: Sale;
  payload: CreateSalePayload;
  syncStatus: LocalSaleSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type SaleWithSyncMeta = Sale & {
  _pendingSync?: boolean;
  _pendingRefundSync?: boolean;
  _localId?: string;
};

export function toSaleWithSyncMeta(record: LocalSaleRecord): SaleWithSyncMeta {
  return {
    ...record.sale,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localSalesStore = {
  async save(
    sale: Sale,
    payload: CreateSalePayload,
    mutationId: string,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalSaleRecord = {
      localId,
      mutationId,
      sale,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localSales', record);
    return localId;
  },

  async getAll(): Promise<LocalSaleRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localSales');
  },

  async getPending(): Promise<LocalSaleRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async getByShiftId(shiftId: number): Promise<LocalSaleRecord[]> {
    const pending = await this.getPending();
    return pending.filter((r) => r.payload.shift_id === shiftId);
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverSale?: Partial<Sale>,
  ): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;

    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverSale) {
      record.sale = { ...record.sale, ...serverSale, id: serverId ?? record.sale.id };
    } else if (serverId) {
      record.sale = { ...record.sale, id: serverId };
    }
    await db.put('localSales', record);
  },

  async getByMutationId(mutationId: string): Promise<LocalSaleRecord | undefined> {
    const all = await this.getAll();
    return all.find((r) => r.mutationId === mutationId);
  },

  async removeByMutationId(mutationId: string): Promise<LocalSaleRecord | undefined> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localSales', record.localId);
    }
    return record;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localSales', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localSales', record.localId);
      }
    }
  },

  async getTodayPendingSales(): Promise<LocalSaleRecord[]> {
    const pending = await this.getPending();
    const today = new Date().toISOString().slice(0, 10);
    return pending.filter((r) => r.sale.sale_date.slice(0, 10) === today);
  },

  async updateShiftIdInPending(oldShiftId: number, newShiftId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    for (const record of all) {
      if (record.payload.shift_id === oldShiftId) {
        record.payload.shift_id = newShiftId;
        record.sale.shift_id = newShiftId;
        await db.put('localSales', record);
      }
    }
  },

  async updateOrderIdInPending(oldOrderId: number, newOrderId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localSales');
    for (const record of all) {
      if (record.payload.order_id === oldOrderId) {
        record.payload.order_id = newOrderId;
        record.sale.order_id = newOrderId;
        await db.put('localSales', record);
      }
    }
  },
};
