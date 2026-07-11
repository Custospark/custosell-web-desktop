export const MARKETPLACE = {
  BUSINESSES: '/marketplace/businesses',
  PRODUCTS: (businessId: number) => `/marketplace/businesses/${businessId}/products`,
  SUPPLIERS: '/marketplace/suppliers',
  SUPPLIER: (sellerBusinessId: number) => `/marketplace/suppliers/${sellerBusinessId}`,
} as const;
