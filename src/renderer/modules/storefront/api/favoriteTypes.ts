import type { StorefrontShop } from './storefrontTypes';

export interface FavoriteItem {
  id: number;
  business: StorefrontShop;
}

export type FavoritesCache = { items: FavoriteItem[]; count: number };