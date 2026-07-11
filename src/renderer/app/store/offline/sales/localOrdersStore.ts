import { getOfflineDb } from '../core/offlineDb';
import type { CreateOrderPayload, PosOrder, UpdateOrderPayload } from '../../../../modules/sales/api/orders/orderTypes';

export type OrderWithSyncMeta = PosOrder & {
  _pendingSync?: boolean;
  _localId?: string;
  _syncError?: string;
};

export interface LocalOrderRecord {
  localId: string;
  order: OrderWithSyncMeta;
  payload: CreateOrderPayload | UpdateOrderPayload | { id: number };
  mutationId: string;
  mutationType: 'create' | 'update' | 'cancel';
  syncStatus: 'pending' | 'failed';
  createdAt: string;
}

export const localOrdersStore = {
  async save(
    order: OrderWithSyncMeta,
    payload: CreateOrderPayload | UpdateOrderPayload | { id: number },
    mutationId: string,
    mutationType: 'create' | 'update' | 'cancel',
  ): Promise<string> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('localOrders')) {
      throw new Error('localOrders store unavailable — refresh the app to upgrade offline DB');
    }
    const localId = order._localId ?? `order-${order.id}`;
    const record: LocalOrderRecord = {
      localId,
      order: { ...order, _localId: localId, _pendingSync: true },
      payload,
      mutationId,
      mutationType,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.put('localOrders', record);
    return localId;
  },

  async getPending(): Promise<LocalOrderRecord[]> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('localOrders')) {
      return [];
    }
    return db.getAll('localOrders');
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('localOrders')) return;
    const all = await db.getAll('localOrders');
    await Promise.all(
      all.filter((r) => r.mutationId === mutationId).map((r) => db.delete('localOrders', r.localId)),
    );
  },

  async markFailedByMutationId(mutationId: string, message?: string): Promise<void> {
    const db = await getOfflineDb();
    if (!db.objectStoreNames.contains('localOrders')) return;
    const all = await db.getAll('localOrders');
    for (const r of all) {
      if (r.mutationId !== mutationId) continue;
      r.syncStatus = 'failed';
      r.order._syncError = message;
      await db.put('localOrders', r);
    }
  },
};

export function toOrderWithSyncMeta(record: LocalOrderRecord): OrderWithSyncMeta {
  return {
    ...record.order,
    _pendingSync: true,
    _localId: record.localId,
    _syncError: record.syncStatus === 'failed' ? record.order._syncError : undefined,
  };
}
