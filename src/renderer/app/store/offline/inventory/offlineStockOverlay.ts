import { stockLedger } from './stockLedger';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';

export async function applyOfflineStockOverlay(products: Product[] | null | undefined): Promise<Product[]> {
  const safeProducts = products ?? [];
  if (safeProducts.length === 0) return safeProducts;

  try {
    const overrides = await stockLedger.getAll();
    if (overrides.size === 0) return safeProducts;

    return safeProducts.map((p) => {
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
