import type { QueryClient } from '@tanstack/react-query';
import { shiftKeys } from '../../shifts/ShiftQueries';
import { inventoryKeys } from '../../inventory/api/products/ProductQueries';
import { dashboardKeys } from '../../dashboard/DashboardQueries';
import { tracksStock, type Product } from '../../inventory/api/products/ProductTypes';
import type { CreateSalePayload, RefundData, Sale } from './salesTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';

const salesListKey = ['sales', 'list'] as const;

/** A locally-persisted (offline) sale - pending meta, negative temp id, or OFF- receipt prefix. */
export function isLocalPendingSale(sale: Sale | SaleWithSyncMeta): boolean {
  const meta = sale as SaleWithSyncMeta;
  return Boolean(
    meta._pendingSync
    || meta._localId
    || sale.id < 0
    || sale.receipt_number.startsWith('OFF-'),
  );
}

/** Push an optimistic sale into the general sales list, every mounted shift-sales
 *  cache, and the product stock cache so the UI updates live. */
export function applySaleOptimisticUpdates(
  qc: QueryClient,
  sale: Sale,
  payload: CreateSalePayload,
): void {
  const row: SaleWithSyncMeta = isLocalPendingSale(sale)
    ? { ...sale, _pendingSync: true }
    : { ...sale };

  qc.setQueryData<SaleWithSyncMeta[]>(salesListKey, (old) => {
    const list = old ?? [];
    const exists = list.some(
      (s) => s.id === sale.id || s.receipt_number === sale.receipt_number,
    );
    if (exists) return list;
    return [row, ...list];
  });

  if (payload.shift_id) {
    qc.setQueryData<SaleWithSyncMeta[]>([...shiftKeys.all, 'sales', payload.shift_id], (old) => {
      const list = old ?? [];
      if (list.some((s) => s.id === sale.id || s.receipt_number === sale.receipt_number)) return list;
      return [row, ...list];
    });
  }

  // Also push the optimistic sale into every currently-mounted shift sales cache
  // (dedupe by id/receipt) so My Shift updates live even if the payload's
  // shift_id differs from the active shift shown on the page.
  const shiftSalesQueries = qc.getQueryCache().findAll({ queryKey: shiftKeys.all });
  for (const query of shiftSalesQueries) {
    if (!Array.isArray(query.queryKey) || query.queryKey[1] !== 'sales') continue;
    qc.setQueryData<SaleWithSyncMeta[]>(query.queryKey, (old) => {
      const list = old ?? [];
      if (list.some((s) => s.id === sale.id || s.receipt_number === sale.receipt_number)) return list;
      return [row, ...list];
    });
  }

  qc.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
    (old ?? []).map((p) => {
      const item = payload.items.find((i) => i.product_id === p.id);
      if (!item || !tracksStock(p)) return p;
      return { ...p, stock_quantity: Math.max(0, p.stock_quantity - item.quantity) };
    }),
  );

  void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
}

/** Apply a refund to the sales list, the relevant shift-sales cache, and stock. */
export function applyRefundOptimisticUpdates(
  qc: QueryClient,
  updatedSale: SaleWithSyncMeta,
  refundData: RefundData,
  originalSale: Sale,
): void {
  qc.setQueryData<SaleWithSyncMeta[]>(salesListKey, (old) =>
    (old ?? []).map((s) => (s.id === updatedSale.id ? updatedSale : s)),
  );

  if (originalSale.shift_id) {
    qc.setQueryData<Sale[]>([...shiftKeys.all, 'sales', originalSale.shift_id], (old) =>
      (old ?? []).map((s) => (s.id === updatedSale.id ? updatedSale : s)),
    );
  }

  qc.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
    (old ?? []).map((p) => {
      if (!tracksStock(p)) return p;
      const refundItem = refundData.items.find((item) => {
        const saleItem = originalSale.sale_items?.find((si) => si.id === item.id);
        return saleItem?.product_id === p.id;
      });
      if (!refundItem) return p;
      return { ...p, stock_quantity: p.stock_quantity + refundItem.quantity };
    }),
  );

  void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
}
