export const storefrontKeys = {
  all: ['storefront'] as const,
  discover: (q: string, category: string) => [...storefrontKeys.all, 'discover', q, category] as const,
  discoverPages: (category = '') => [...storefrontKeys.all, 'discover-pages', category] as const,
  shops: (q: string) => [...storefrontKeys.all, 'shops', q] as const,
  shopsPages: () => [...storefrontKeys.all, 'shops-pages'] as const,
  categories: () => [...storefrontKeys.all, 'categories'] as const,
  shop: (slug: string) => [...storefrontKeys.all, 'shop', slug] as const,
  products: (slug: string, category: string) => [...storefrontKeys.all, 'products', slug, category] as const,
  myOrders: (status?: string, q?: string) => [...storefrontKeys.all, 'my-orders', status ?? '', q ?? ''] as const,
  myOrdersPages: () => [...storefrontKeys.all, 'my-orders-pages'] as const,
  myOrdersList: () => [...storefrontKeys.all, 'my-orders-list'] as const,
  myOrdersCount: () => [...storefrontKeys.all, 'my-orders-count'] as const,
};
