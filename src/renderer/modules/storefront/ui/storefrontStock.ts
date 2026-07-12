import type { StorefrontProduct } from '../api/storefrontTypes';

export function isStorefrontProductOutOfStock(product: StorefrontProduct): boolean {
  if (product.type === 'service' || product.availability === 'always') return false;
  return product.availability === 'out' || product.in_stock === false;
}
