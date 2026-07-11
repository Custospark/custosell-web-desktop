export const MARKETPLACE = {
  BUSINESSES: '/marketplace/businesses',
  PRODUCTS: (businessId: number) => `/marketplace/businesses/${businessId}/products`,
} as const;
