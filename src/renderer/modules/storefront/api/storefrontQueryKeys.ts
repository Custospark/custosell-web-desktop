/** Poll Discover → My Orders every 30s while that page is open. */
export const STOREFRONT_ORDERS_POLL_MS = 30_000;

import type { StorefrontProductFilters, StorefrontShopFilters } from './storefrontTypes';

/** Stable string fingerprint of a filter bag, for React Query key equality. */
function filterKeyPart(filters: StorefrontShopFilters | StorefrontProductFilters): string {
  return (Object.entries(filters) as [string, unknown][])
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v)}`)
    .join('|');
}

export const storefrontKeys = {
  all: ['storefront'] as const,
  discover: (q: string, category: string) => [...storefrontKeys.all, 'discover', q, category] as const,
  discoverPages: (category = '', q = '', filters: StorefrontProductFilters = {}) => [...storefrontKeys.all, 'discover-pages', category, q.trim(), filterKeyPart(filters)] as const,
  shops: (q: string) => [...storefrontKeys.all, 'shops', q] as const,
  shopsPages: (q = '', filters: StorefrontShopFilters = {}) => [...storefrontKeys.all, 'shops-pages', q.trim(), filterKeyPart(filters)] as const,
  categories: () => [...storefrontKeys.all, 'categories'] as const,
  facets: () => [...storefrontKeys.all, 'facets'] as const,
  shop: (slug: string) => [...storefrontKeys.all, 'shop', slug] as const,
  product: (slug: string, productSlug: string) => [...storefrontKeys.all, 'product', slug, productSlug] as const,
  products: (slug: string, category: string) => [...storefrontKeys.all, 'products', slug, category] as const,
  productsPages: (slug: string, category: string, q = '', filters: StorefrontProductFilters = {}) => [...storefrontKeys.all, 'products-pages', slug, category, q.trim(), filterKeyPart(filters)] as const,
  myOrders: (status?: string, q?: string) => [...storefrontKeys.all, 'my-orders', status ?? '', q ?? ''] as const,
  myOrdersPages: () => [...storefrontKeys.all, 'my-orders-pages'] as const,
  myOrdersList: () => [...storefrontKeys.all, 'my-orders-list'] as const,
  myOrdersCount: () => [...storefrontKeys.all, 'my-orders-count', 'open'] as const,
  wishlist: () => [...storefrontKeys.all, 'wishlist'] as const,
  wishlistCount: () => [...storefrontKeys.all, 'wishlist-count'] as const,
  favorites: () => [...storefrontKeys.all, 'favorites'] as const,
  favoritesCount: () => [...storefrontKeys.all, 'favorites-count'] as const,
};
