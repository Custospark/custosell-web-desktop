export const marketplaceKeys = {
  all: ['marketplace'] as const,
  businesses: (q?: string) => [...marketplaceKeys.all, 'businesses', q ?? ''] as const,
  products: (businessId: number) => [...marketplaceKeys.all, 'products', businessId] as const,
  suppliers: (q?: string) => [...marketplaceKeys.all, 'suppliers', q ?? ''] as const,
};
