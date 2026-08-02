import { queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { stockLedger } from '../inventory/stockLedger';
import { localSalesStore, type SaleWithSyncMeta } from './localSalesStore';
import { buildStockSeedMap } from '../inventory/offlineStockOverlay';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { offlineSaleReceiptNumber, offlinePaymentReceiptNumber } from '../../../../shared/utils/documentNumbers';
import { computeSaleTax } from '../../../../shared/utils/taxEngine';
import { resolveBusinessForTax } from '../../../../modules/settings/api/settings/businessAuthSync';
import { inventoryKeys } from '../../../../modules/inventory/api/products/ProductQueries';
import type { CreateSalePayload, Sale } from '../../../../modules/sales/api/salesTypes';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';
import { tracksStock } from '../../../../modules/inventory/api/products/ProductTypes';

/** True when completely offline — complete sale locally. */
export function shouldCompleteSaleLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalSale(payload: CreateSalePayload): SaleWithSyncMeta {
  const receiptNumber = offlineSaleReceiptNumber();
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;
  const products = queryClient.getQueryData<Product[]>(inventoryKeys.products()) ?? [];
  const cartLines = payload.items.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    return {
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_percentage: product?.tax_percentage ?? null,
      tax_class: product?.tax_class ?? 'standard',
    };
  });
  const taxBreakdown = computeSaleTax(resolveBusinessForTax(), cartLines, payload.discount_amount ?? 0);
  const total = taxBreakdown.total;
  const amountPaid = payload.amount_paid != null
    ? Math.min(payload.amount_paid, total)
    : total;
  const isFullyPaid = Math.abs(amountPaid - total) < 0.01;
  const paymentStatus = isFullyPaid ? 'paid' : 'partially_paid';

  const localPayment = amountPaid > 0 ? {
    id: localIdNum - 999,
    business_id: authUser?.business_id ?? 0,
    payable_type: 'sale' as const,
    payable_id: localIdNum,
    receipt_number: offlinePaymentReceiptNumber(),
    amount: amountPaid,
    amount_tendered: payload.amount_tendered ?? amountPaid,
    change_given: payload.change_given ?? null,
    payment_method: payload.payment_method,
    balance_after: Math.max(0, total - amountPaid),
    paid_at: now,
    notes: null,
    recorded_by: authUser?.id ?? null,
    _pendingSync: true,
  } : null;

  const sale: Sale = {
    id: localIdNum,
    receipt_number: receiptNumber,
    total_amount: total.toString(),
    payment_method: payload.payment_method,
    payment_status: paymentStatus,
    amount_paid: amountPaid.toString(),
    subtotal: taxBreakdown.subtotalNet.toString(),
    tax_total: taxBreakdown.taxTotal.toString(),
    discount_amount: (payload.discount_amount || 0).toString(),
    created_at: now,
    updated_at: now,
    business_id: authUser?.business_id ?? 0,
    user_id: authUser?.id ?? 0,
    customer_id: payload.customer_id ?? null,
    shift_id: payload.shift_id ?? null,
    order_id: payload.order_id ?? null,
    location_id: payload.location_id ?? null,
    amount_tendered: payload.amount_tendered ? payload.amount_tendered.toString() : null,
    change_given: payload.change_given ? payload.change_given.toString() : null,
    notes: payload.notes ?? null,
    sale_date: now,
    payments: localPayment ? [localPayment] : undefined,
    // Hint until server sync returns real fiscal_* (sync_later).
    fiscal_status: 'pending',
    sale_items: payload.items.map((item, i) => ({
      id: localIdNum - i,
      sale_id: localIdNum,
      product_id: item.product_id,
      product_name: products.find((p) => p.id === item.product_id)?.name ?? '',
      product_price: item.unit_price.toString(),
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      subtotal: (item.quantity * item.unit_price).toString(),
      tax_amount: (taxBreakdown.lineTaxAmounts[i] ?? 0).toString(),
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

  const stockItems = payload.items
    .filter((item) => {
      const product = products?.find((p) => p.id === item.product_id);
      return !product || tracksStock(product);
    })
    .map((item) => ({ productId: item.product_id, delta: -item.quantity }));

  if (stockItems.length > 0) {
    await stockLedger.batchAdjust(stockItems, 'sale', seedMap);
  }

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
