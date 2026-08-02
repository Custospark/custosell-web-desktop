export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: number) => [...inventoryKeys.all, 'products', id] as const,
  lowStock: () => [...inventoryKeys.all, 'products', 'low-stock'] as const,
  productStockMovements: (productId: number) => [...inventoryKeys.all, 'products', productId, 'stock-movements'] as const,
  stockMovements: () => [...inventoryKeys.all, 'stock-movements'] as const,
};