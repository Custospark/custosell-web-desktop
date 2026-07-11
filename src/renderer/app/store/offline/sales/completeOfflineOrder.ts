import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { localOrdersStore, type OrderWithSyncMeta } from './localOrdersStore';
import type { CreateOrderPayload, PosOrder, UpdateOrderPayload } from '../../../../modules/sales/api/orders/orderTypes';

export function shouldCompleteOrderLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalOrder(payload: CreateOrderPayload): OrderWithSyncMeta {
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;
  const itemCount = payload.items.reduce((sum, item) => sum + item.quantity, 0);
  const now = new Date().toISOString();

  const order: PosOrder = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    user_id: authUser?.id ?? 0,
    customer_id: payload.customer_id ?? null,
    customer_name: payload.customer_name ?? 'Guest',
    shift_id: payload.shift_id ?? null,
    order_number: `LOCAL-${Math.abs(localIdNum)}`,
    status: 'open',
    subtotal: payload.subtotal ?? 0,
    tax_total: payload.tax_total ?? 0,
    discount_amount: payload.discount_amount ?? 0,
    total_amount: payload.total_amount ?? 0,
    notes: payload.notes ?? null,
    sale_id: null,
    item_count: itemCount,
    items: payload.items.map((item, index) => ({
      id: -(index + 1),
      product_id: item.product_id ?? null,
      product_name: item.product_name ?? 'Item',
      product_price: item.product_price ?? item.unit_price,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal ?? item.unit_price * item.quantity,
      tax_amount: item.tax_amount ?? 0,
      discount_amount: item.discount_amount ?? 0,
    })),
    held_at: now,
    created_at: now,
    updated_at: now,
  };

  return { ...order, _pendingSync: true };
}

export async function persistOfflineOrderInBackground(
  order: OrderWithSyncMeta,
  payload: CreateOrderPayload | UpdateOrderPayload | { id: number },
  mutationType: 'create' | 'update' | 'cancel',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'PUT' = 'POST';
  let url = '/orders';
  let data: unknown = payload;

  if (mutationType === 'create') {
    method = 'POST';
    url = '/orders';
  } else if (mutationType === 'update') {
    method = 'PUT';
    url = `/orders/${order.id}`;
  } else {
    method = 'POST';
    url = `/orders/${order.id}/cancel`;
    data = {};
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineOrder] Enqueue failed:', err);
  }

  try {
    const localId = await localOrdersStore.save(order, payload, mutationId, mutationType);
    order._localId = localId;
  } catch (err) {
    console.error('[OfflineOrder] Local store save failed:', err);
  }
}

export function completeOfflineCreateOrderInstant(payload: CreateOrderPayload): OrderWithSyncMeta {
  const order = buildLocalOrder(payload);
  void persistOfflineOrderInBackground(order, payload, 'create').catch((err) => {
    console.error('[OfflineOrder] Background create failed:', err);
  });
  return order;
}

export function completeOfflineUpdateOrderInstant(
  order: PosOrder,
  payload: UpdateOrderPayload,
): OrderWithSyncMeta {
  const updated: OrderWithSyncMeta = {
    ...order,
    ...payload,
    customer_name: payload.customer_name ?? order.customer_name,
    notes: payload.notes ?? order.notes,
    items: payload.items
      ? payload.items.map((item, index) => ({
          id: -(index + 1),
          product_id: item.product_id ?? null,
          product_name: item.product_name ?? 'Item',
          product_price: item.product_price ?? item.unit_price,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal ?? item.unit_price * item.quantity,
          tax_amount: item.tax_amount ?? 0,
          discount_amount: item.discount_amount ?? 0,
        }))
      : order.items,
    updated_at: new Date().toISOString(),
    held_at: new Date().toISOString(),
    _pendingSync: true,
  };
  void persistOfflineOrderInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineOrder] Background update failed:', err);
  });
  return updated;
}

export function completeOfflineCancelOrderInstant(order: PosOrder): OrderWithSyncMeta {
  const cancelled: OrderWithSyncMeta = {
    ...order,
    status: 'cancelled',
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  void persistOfflineOrderInBackground(cancelled, { id: order.id }, 'cancel').catch((err) => {
    console.error('[OfflineOrder] Background cancel failed:', err);
  });
  return cancelled;
}
