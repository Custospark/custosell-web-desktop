import { stockLedger } from './stockLedger';
import type { Product } from '../../../modules/inventory/api/products/ProductTypes';

export async function applyOfflineStockOverlay(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;

  const overrides = await stockLedger.getAll();
  if (overrides.size === 0) return products;

  return products.map((p) => {
    const qty = overrides.get(p.id);
    if (qty === undefined) return p;
    return { ...p, stock_quantity: qty };
  });
}

export async function buildStockSeedMap(products: Product[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const p of products) {
    map.set(p.id, p.stock_quantity);
  }
  return map;
}
