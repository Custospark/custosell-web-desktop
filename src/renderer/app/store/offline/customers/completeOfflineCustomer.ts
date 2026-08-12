import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localCustomersStore, type CustomerWithSyncMeta } from './localCustomersStore';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import type { CreateCustomerData, UpdateCustomerData, Customer } from '../../../../modules/customers/api/customers/CustomerTypes';

export function shouldCompleteCustomerLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalCustomer(payload: CreateCustomerData): CustomerWithSyncMeta {
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const customer: Customer = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    name: payload.name,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    total_purchases: '0',
    last_purchase_at: null,
  };

  return { ...customer, _pendingSync: true };
}

export async function persistOfflineCustomerInBackground(
  customer: CustomerWithSyncMeta,
  payload: CreateCustomerData | UpdateCustomerData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/customers';

  if (mutationType === 'create') {
    method = 'POST';
    url = '/customers';
  } else if (mutationType === 'update') {
    method = 'PUT';
    url = `/customers/${customer.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/customers/${(payload as { id: number }).id}`;
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineCustomer] Enqueue failed:', err);
  }

  try {
    const localId = await localCustomersStore.save(customer, payload, mutationId, mutationType);
    customer._localId = localId;
  } catch (err) {
    console.error('[OfflineCustomer] Local store save failed:', err);
  }
}

export function completeOfflineCreateCustomerInstant(payload: CreateCustomerData): CustomerWithSyncMeta {
  const customer = buildLocalCustomer(payload);
  const persist = persistOfflineCustomerInBackground(customer, payload, 'create').catch((err) => {
    console.error('[OfflineCustomer] Background persist failed:', err);
  });
  trackWrite(persist);
  return customer;
}

export function completeOfflineUpdateCustomerInstant(customer: Customer, payload: UpdateCustomerData): CustomerWithSyncMeta {
  const updated: CustomerWithSyncMeta = {
    ...customer,
    ...payload,
    email: payload.email ?? customer.email,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  } as CustomerWithSyncMeta;
  const persist = persistOfflineCustomerInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineCustomer] Background persist failed:', err);
  });
  trackWrite(persist);
  return updated;
}

export function completeOfflineDeleteCustomerInstant(id: number): void {
  const customer: CustomerWithSyncMeta = {
    id,
    business_id: 0,
    name: '',
    phone: '',
    email: null,
    total_purchases: '0',
    last_purchase_at: null,
    _pendingSync: true,
  };
  const persist = persistOfflineCustomerInBackground(customer, { id }, 'delete').catch((err) => {
    console.error('[OfflineCustomer] Background persist failed:', err);
  });
  trackWrite(persist);
}
