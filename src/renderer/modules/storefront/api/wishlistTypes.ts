import type { StorefrontProduct } from './storefrontTypes';

export interface WishlistItem {
  id: number;
  product_id: number;
  created_at: string;
  product: StorefrontProduct | null;
}
