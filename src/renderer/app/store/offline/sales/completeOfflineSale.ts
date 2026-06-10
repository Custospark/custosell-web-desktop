import { queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { stockLedger } from '../inventory/stockLedger';
import { localSalesStore, type SaleWithSyncMeta } from './localSalesStore';
import { buildStockSeedMap } from '../inventory/offlineStockOverlay';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { generateLocalReceiptNumber } from './receiptGenerator';
import { inventoryKeys } from '../../../../modules/inventory/api/products/ProductQueries';
import type { CreateSalePayload, Sale } from '../../../../modules/sales/api/salesTypes';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';

/** True when completely offline — complete sale locally. */
export function shouldCompleteSaleLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalSale(payload: CreateSalePayload): SaleWithSyncMeta {
  const receiptNumber = generateLocalReceiptNumber();
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const sale: Sale = {
    id: localIdNum,
    receipt_number: receiptNumber,
    total_amount: payload.total_amount.toString(),
    payment_method: payload.payment_method,
    payment_status: 'paid',
    subtotal: payload.subtotal.toString(),
    tax_total: (payload.tax_total ?? 0).toString(),
    discount_amount: (payload.discount_amount || 0).toString(),
    created_at: now,
    updated_at: now,
    business_id: authUser?.business_id ?? 0,
    user_id: authUser?.id ?? 0,
    customer_id: payload.customer_id ?? null,
    shift_id: payload.shift_id ?? null,
    amount_tendered: payload.amount_tendered ? payload.amount_tendered.toString() : null,
    change_given: payload.change_given ? payload.change_given.toString() : null,
    notes: payload.notes ?? null,
    sale_date: now,
    sale_items: payload.items.map((item, i) => ({
      id: localIdNum - i,
      sale_id: localIdNum,
      product_id: item.product_id,
      product_name: '',
      product_price: item.unit_price.toString(),
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      subtotal: (item.quantity * item.unit_price).toString(),
      tax_amount: '0',
      discount_amount: '0',
      refunded_quantity: 0,
      refunded_amount: '0',
    })),
  };

  return {
    ...sale,
    _pendingSync: true,
  };
}

/** Persist to IndexedDB in the background — must not block the sale-complete UI. */
export async function persistOfflineSaleInBackground(
  sale: SaleWithSyncMeta,
  payload: CreateSalePayload,
): Promise<void> {
  const products = queryClient.getQueryData<Product[]>(inventoryKeys.products());
  const seedMap = products ? await buildStockSeedMap(products) : undefined;

  await stockLedger.batchAdjust(
    payload.items.map((item) => ({ productId: item.product_id, delta: -item.quantity })),
    'sale',
    seedMap,
  );

  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'POST',
      url: '/sales',
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineSale] Enqueue failed:', err);
  }

  const localId = await localSalesStore.save(sale, payload, mutationId);
  sale._localId = localId;
}

/**
 * Returns immediately for instant UI (modal, cart clear).
 * IndexedDB + mutation queue run asynchronously.
 */
export function completeOfflineSaleInstant(payload: CreateSalePayload): SaleWithSyncMeta {
  const sale = buildLocalSale(payload);
  void persistOfflineSaleInBackground(sale, payload).catch((err) => {
    console.error('[OfflineSale] Background persist failed:', err);
  });
  return sale;
}
