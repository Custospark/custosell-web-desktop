import { getOfflineDb } from './offlineDb';
import type { RefundData, Sale } from '../../../modules/sales/api/salesTypes';
import type { SaleWithSyncMeta } from './localSalesStore';

export type LocalRefundSyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalRefundRecord {
  localId: string;
  mutationId: string;
  saleId: number;
  refundData: RefundData;
  updatedSale: Sale;
  syncStatus: LocalRefundSyncStatus;
  createdAt: string;
  syncedAt?: string;
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localRefundsStore = {
  async save(
    saleId: number,
    refundData: RefundData,
    updatedSale: Sale,
    mutationId: string,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalRefundRecord = {
      localId,
      mutationId,
      saleId,
      refundData,
      updatedSale,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localRefunds', record);
    return localId;
  },

  async getAll(): Promise<LocalRefundRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localRefunds');
  },

  async getPending(): Promise<LocalRefundRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRefunds');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'synced';
    record.syncedAt = new Date().toISOString();
    await db.put('localRefunds', record);
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRefunds');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localRefunds', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRefunds');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localRefunds', record.localId);
      }
    }
  },
};

/** Apply latest pending refund snapshot per sale id. */
export function mergePendingRefunds(sales: SaleWithSyncMeta[], refunds: LocalRefundRecord[]): SaleWithSyncMeta[] {
  if (refunds.length === 0) return sales;

  const latestBySaleId = new Map<number, LocalRefundRecord>();
  for (const record of refunds) {
    const existing = latestBySaleId.get(record.saleId);
    if (!existing || record.createdAt > existing.createdAt) {
      latestBySaleId.set(record.saleId, record);
    }
  }

  return sales.map((sale) => {
    const refund = latestBySaleId.get(sale.id);
    if (!refund) return sale;
    return {
      ...refund.updatedSale,
      _pendingRefundSync: refund.syncStatus === 'pending' || refund.syncStatus === 'failed',
      _pendingSync: sale._pendingSync,
      _localId: sale._localId,
    };
  });
}
