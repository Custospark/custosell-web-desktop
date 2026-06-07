import { store } from '../store';
import { mutationQueue } from './mutationQueue';
import { localProductsStore, type ProductWithSyncMeta } from './localProductsStore';
import { shouldCompleteMutationLocally } from './offlineQueryUtils';
import type { CreateProductData, UpdateProductData, Product } from '../../../modules/inventory/api/products/ProductTypes';

export function shouldCompleteProductLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalProduct(payload: CreateProductData): ProductWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const product: Product = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    category_id: payload.category_id ?? null,
    category: null,
    name: payload.name,
    unit: payload.unit ?? null,
    description: payload.description ?? null,
    sku: payload.sku ?? null,
    barcode: payload.barcode ?? null,
    unit_price: String(payload.unit_price),
    wholesale_price: payload.wholesale_price != null ? String(payload.wholesale_price) : null,
    cost_price: payload.cost_price != null ? String(payload.cost_price) : null,
    stock_quantity: payload.stock_quantity ?? 0,
    low_stock_threshold: payload.low_stock_threshold ?? 5,
    tax_percentage: String(payload.tax_percentage ?? 0),
    is_active: payload.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  return { ...product, _pendingSync: true };
}

export async function persistOfflineProductInBackground(
  product: ProductWithSyncMeta,
  payload: CreateProductData | UpdateProductData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/products';

  if (mutationType === 'create') {
    method = 'POST';
    url = '/products';
  } else if (mutationType === 'update') {
    method = 'PUT';
    url = `/products/${product.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/products/${(payload as { id: number }).id}`;
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineProduct] Enqueue failed:', err);
  }

  try {
    const localId = await localProductsStore.save(product, payload, mutationId, mutationType);
    product._localId = localId;
  } catch (err) {
    console.error('[OfflineProduct] Local store save failed:', err);
  }
}

export function completeOfflineCreateProductInstant(payload: CreateProductData): ProductWithSyncMeta {
  const product = buildLocalProduct(payload);
  void persistOfflineProductInBackground(product, payload, 'create').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
  return product;
}

export function completeOfflineUpdateProductInstant(product: Product, payload: UpdateProductData): ProductWithSyncMeta {
  const updated: ProductWithSyncMeta = {
    ...product,
    ...payload,
    unit_price: payload.unit_price != null ? String(payload.unit_price) : product.unit_price,
    wholesale_price: payload.wholesale_price != null ? String(payload.wholesale_price) : product.wholesale_price,
    cost_price: payload.cost_price != null ? String(payload.cost_price) : product.cost_price,
    tax_percentage: payload.tax_percentage != null ? String(payload.tax_percentage) : product.tax_percentage,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  void persistOfflineProductInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
  return updated;
}

export function completeOfflineDeleteProductInstant(id: number): void {
  const product: ProductWithSyncMeta = {
    id,
    business_id: 0,
    category_id: null,
    category: null,
    name: '',
    unit: null,
    description: null,
    sku: null,
    barcode: null,
    unit_price: '0',
    wholesale_price: null,
    cost_price: null,
    stock_quantity: 0,
    low_stock_threshold: 0,
    tax_percentage: '0',
    is_active: false,
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  void persistOfflineProductInBackground(product, { id }, 'delete').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
}
