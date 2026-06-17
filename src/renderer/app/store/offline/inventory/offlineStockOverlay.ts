import { stockLedger } from './stockLedger';
import { shouldUseClientStorage } from '../core/offlineQueryUtils';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';

/**
 * Applies local stock ledger quantities on top of server/catalog product rows.
 *
 * Offline: full ledger overlay (catalog baseline + local deltas).
 * Online: overlay only products with pending (unsynced) ledger adjustments so
 * stale seeded ledger rows cannot overwrite fresh server stock after an online adjust.
 */
export async function applyOfflineStockOverlay(products: Product[] | null | undefined): Promise<Product[]> {
  const safeProducts = products ?? [];
  if (safeProducts.length === 0) return safeProducts;

  try {
    const overrides = await stockLedger.getAll();
    if (overrides.size === 0) return safeProducts;

    if (shouldUseClientStorage()) {
      return safeProducts.map((p) => {
        const qty = overrides.get(p.id);
        if (qty === undefined) return p;
        return { ...p, stock_quantity: qty };
      });
    }

    const pending = await stockLedger.getPendingAdjustments();
    if (pending.length === 0) return safeProducts;

    const pendingProductIds = new Set(pending.map((a) => a.productId));
    return safeProducts.map((p) => {
      if (!pendingProductIds.has(p.id)) return p;
      const qty = overrides.get(p.id);
      if (qty === undefined) return p;
      return { ...p, stock_quantity: qty };
    });
  } catch (err) {
    console.warn('[OfflineStockOverlay] Using product cache without stock ledger overlay:', err);
    return safeProducts;
  }
}

export async function buildStockSeedMap(products: Product[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const p of products) {
    map.set(p.id, p.stock_quantity);
  }
  return map;
}
