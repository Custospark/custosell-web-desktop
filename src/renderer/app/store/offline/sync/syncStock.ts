import { axiosInstance } from '../../../api/axiosConfig';
import { isServerOwnedStockReason, stockLedger, type PendingAdjustment } from '../inventory/stockLedger';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';
import { invalidateAfterItemCommitted } from './syncCacheRefresh';

function mapLedgerReasonToMovementType(
  reason: string,
): 'purchase' | 'adjustment' | 'return' | 'initial' {
  if (reason === 'refund') return 'return';
  if (reason === 'purchase' || reason === 'initial') return reason;
  return 'adjustment';
}

async function resolveStockMovementSnapshots(
  adj: PendingAdjustment,
): Promise<{ stock_before: number; stock_after: number }> {
  if (adj.stock_before !== undefined && adj.stock_after !== undefined) {
    return { stock_before: adj.stock_before, stock_after: adj.stock_after };
  }

  const { data } = await axiosInstance.get<Product | { data: Product }>(
    `/products/${adj.productId}`,
    { skipAuthRedirect: true },
  );
  const product = data && typeof data === 'object' && 'data' in data ? data.data : (data as Product);
  const stockBefore = product?.stock_quantity ?? 0;
  return {
    stock_before: stockBefore,
    stock_after: Math.max(0, stockBefore + adj.delta),
  };
}

export async function processStockAdjustments(): Promise<number> {
  const adjustments = await stockLedger.getPendingAdjustments();
  let synced = 0;

  for (const adj of adjustments) {
    try {
      if (isServerOwnedStockReason(adj.reason)) {
        await stockLedger.markAdjustmentSynced(adj.id);
        continue;
      }

      const { stock_before, stock_after } = await resolveStockMovementSnapshots(adj);

      await axiosInstance.post('/stock-movements', {
        product_id: adj.productId,
        quantity_change: adj.delta,
        type: mapLedgerReasonToMovementType(adj.reason),
        stock_before,
        stock_after,
        notes: `Offline sync: ${adj.reason}`,
      }, { skipAuthRedirect: true });
      await stockLedger.markAdjustmentSynced(adj.id);
      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch {
      break;
    }
  }

  await stockLedger.clearSynced();
  return synced;
}