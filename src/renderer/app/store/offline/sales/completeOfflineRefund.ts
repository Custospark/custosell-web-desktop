import { queryClient } from '../../../api/axiosConfig';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { stockLedger } from '../inventory/stockLedger';
import { localRefundsStore } from './localRefundsStore';
import type { SaleWithSyncMeta } from './localSalesStore';
import { buildStockSeedMap } from '../inventory/offlineStockOverlay';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { inventoryKeys } from '../../../../modules/inventory/api/products/ProductQueries';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';
import { tracksStock } from '../../../../modules/inventory/api/products/ProductTypes';
import type { RefundData, Sale } from '../../../../modules/sales/api/salesTypes';
import { computeLineTaxRefund } from '../../../../shared/utils/taxEngine';

export function shouldCompleteRefundLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function canRefundSaleOffline(sale: Sale): boolean {
  if (sale.id < 0) return false;
  if (sale.receipt_number.startsWith('OFF-')) return false;
  return true;
}

export function applyRefundToSale(sale: Sale, refundData: RefundData): Sale {
  const items = (sale.sale_items ?? []).map((item) => {
    const refundItem = refundData.items.find((r) => r.id === item.id);
    if (!refundItem) return item;

    const refundAmount =
      refundItem.amount ??
      (parseFloat(item.subtotal || '0') + parseFloat(item.tax_amount || '0')) *
        (refundItem.quantity / Math.max(1, item.quantity));
    const newRefundedQty = item.refunded_quantity + refundItem.quantity;
    const newRefundedAmount = parseFloat(item.refunded_amount || '0') + refundAmount;
    const lineTax = parseFloat(item.tax_amount || '0');
    const taxRefundDelta = computeLineTaxRefund(lineTax, item.quantity, refundItem.quantity);
    const newTaxRefunded = parseFloat(item.tax_refunded_amount || '0') + taxRefundDelta;

    return {
      ...item,
      refunded_quantity: newRefundedQty,
      refunded_amount: newRefundedAmount.toFixed(2),
      tax_refunded_amount: newTaxRefunded.toFixed(2),
    };
  });

  const allRefunded = items.length > 0 && items.every((i) => i.refunded_quantity >= i.quantity);
  const anyRefunded = items.some((i) => i.refunded_quantity > 0);
  let payment_status = sale.payment_status;
  if (allRefunded) payment_status = 'refunded';
  else if (anyRefunded) payment_status = 'partially_refunded';

  const totalRefunded = items.reduce(
    (sum, item) => sum + (parseFloat(item.refunded_amount || '0') || 0),
    0,
  );
  const gross = parseFloat(sale.total_amount) || 0;
  const netAfterRefunds = Math.max(0, gross - totalRefunded);

  return {
    ...sale,
    sale_items: items,
    refunds: totalRefunded,
    net_amount: netAfterRefunds.toFixed(2),
    payment_status,
    updated_at: new Date().toISOString(),
  };
}

async function persistOfflineRefundInBackground(
  saleId: number,
  refundData: RefundData,
  updatedSale: SaleWithSyncMeta,
  originalSale: Sale,
): Promise<void> {
  const products = queryClient.getQueryData<Product[]>(inventoryKeys.products());
  const seedMap = products ? await buildStockSeedMap(products) : undefined;

  const stockItems = refundData.items
    .map((refundItem) => {
      const saleItem = originalSale.sale_items?.find((i) => i.id === refundItem.id);
      if (!saleItem?.product_id) return null;
      const product = products?.find((p) => p.id === saleItem.product_id);
      if (product && !tracksStock(product)) return null;
      return { productId: saleItem.product_id, delta: refundItem.quantity };
    })
    .filter((item): item is { productId: number; delta: number } => item !== null);

  if (stockItems.length > 0) {
    await stockLedger.batchAdjust(stockItems, 'refund', seedMap);
  }

  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'POST',
      url: `/sales/${saleId}/refund`,
      data: refundData,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineRefund] Enqueue failed:', err);
  }

  await localRefundsStore.save(saleId, refundData, updatedSale, mutationId);
}

export function completeOfflineRefundInstant(
  sale: Sale,
  refundData: RefundData,
): SaleWithSyncMeta {
  const updatedSale: SaleWithSyncMeta = {
    ...applyRefundToSale(sale, refundData),
    _pendingRefundSync: true,
    _pendingSync: (sale as SaleWithSyncMeta)._pendingSync,
    _localId: (sale as SaleWithSyncMeta)._localId,
  };

  const persist = persistOfflineRefundInBackground(sale.id, refundData, updatedSale, sale).catch((err) => {
    console.error('[OfflineRefund] Background persist failed:', err);
  });
  trackWrite(persist);

  return updatedSale;
}
