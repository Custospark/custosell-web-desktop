import { getOfflineDb } from '../core/offlineDb';
import type { CreateCustomerData, UpdateCustomerData, Customer } from '../../../../modules/customers/api/customers/CustomerTypes';

export type LocalCustomerSyncStatus = 'pending' | 'synced' | 'failed';

export type CustomerMutationType = 'create' | 'update' | 'delete';

export interface LocalCustomerRecord {
  localId: string;
  mutationId: string;
  mutationType: CustomerMutationType;
  customer: Customer;
  payload: CreateCustomerData | UpdateCustomerData | { id: number };
  syncStatus: LocalCustomerSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type CustomerWithSyncMeta = Customer & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toCustomerWithSyncMeta(record: LocalCustomerRecord): CustomerWithSyncMeta {
  return {
    ...record.customer,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localCustomersStore = {
  async save(
    customer: Customer,
    payload: CreateCustomerData | UpdateCustomerData | { id: number },
    mutationId: string,
    mutationType: CustomerMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalCustomerRecord = {
      localId,
      mutationId,
      mutationType,
      customer,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localCustomers', record);
    return localId;
  },

  async getAll(): Promise<LocalCustomerRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localCustomers');
  },

  async getPending(): Promise<LocalCustomerRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverCustomer?: Partial<Customer>,
  ): Promise<number | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCustomers');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return null;

    const oldId = record.customer.id;
    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverCustomer) {
      record.customer = { ...record.customer, ...serverCustomer, id: serverId ?? record.customer.id };
    } else if (serverId) {
      record.customer = { ...record.customer, id: serverId };
    }
    await db.put('localCustomers', record);
    return oldId;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCustomers');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localCustomers', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCustomers');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localCustomers', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCustomers');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localCustomers', record.localId);
    }
  },

  async removeByCustomerId(customerId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCustomers');
    const record = all.find((r) => r.customer.id === customerId);
    if (record) {
      await db.delete('localCustomers', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
