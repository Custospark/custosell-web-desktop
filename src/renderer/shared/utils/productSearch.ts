/** Product fields used for list/POS search (name, SKU, barcode). */
export interface ProductSearchFields {
  name: string;
  sku?: string | null;
  barcode?: string | null;
}

export function matchesProductSearch(product: ProductSearchFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.sku?.toLowerCase().includes(q)) return true;
  if (product.barcode?.toLowerCase().includes(q)) return true;
  return false;
}

/** Exact barcode match — used for scanner auto-add at POS. */
export function findProductByBarcode<T extends ProductSearchFields>(
  products: T[],
  code: string,
): T | undefined {
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.toLowerCase();
  return products.find(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === normalized,
  );
}
