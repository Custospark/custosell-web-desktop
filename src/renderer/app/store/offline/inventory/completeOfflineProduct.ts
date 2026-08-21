import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localProductsStore, toProductWithSyncMeta, type ProductWithSyncMeta } from './localProductsStore';
import { isCompletelyOffline, isNetworkFailure, shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import type { CreateProductData, UpdateProductData, Product } from '../../../../modules/inventory/api/products/ProductTypes';

export function shouldCompleteProductLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalProduct(payload: CreateProductData): ProductWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const isService = (payload.type ?? 'product') === 'service';
  const product: Product = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    category_id: payload.category_id ?? null,
    category: null,
    name: payload.name,
    type: payload.type ?? 'product',
    unit: payload.unit ?? null,
    pricing_unit: payload.pricing_unit ?? null,
    description: payload.description ?? null,
    sku: payload.sku ?? null,
    barcode: payload.barcode ?? null,
    unit_price: String(payload.unit_price),
    discount_percent: payload.discount_percent != null ? String(payload.discount_percent) : null,
    wholesale_price: payload.wholesale_price != null ? String(payload.wholesale_price) : null,
    cost_price: payload.cost_price != null ? String(payload.cost_price) : null,
    stock_quantity: isService ? 0 : (payload.stock_quantity ?? 0),
    low_stock_threshold: isService ? 0 : (payload.low_stock_threshold ?? 5),
    tax_percentage: String(payload.tax_percentage ?? 0),
    tax_class: payload.tax_class,
    is_active: payload.is_active ?? true,
    is_recurring: payload.is_recurring ?? false,
    billing_interval: payload.is_recurring ? (payload.billing_interval ?? 'month') : null,
    created_at: now,
    updated_at: now,
  };

  return { ...product, _pendingSync: true, _mutationType: 'create' };
}

function applyProductPayload(product: Product, payload: UpdateProductData): Product {
  const nextType = payload.type ?? product.type ?? 'product';
  const isService = nextType === 'service';
  return {
    ...product,
    ...payload,
    type: nextType,
    category_id: 'category_id' in payload ? payload.category_id ?? null : product.category_id,
    unit: 'unit' in payload ? payload.unit ?? null : product.unit,
    pricing_unit: 'pricing_unit' in payload ? payload.pricing_unit ?? null : product.pricing_unit,
    description: 'description' in payload ? payload.description ?? null : product.description,
    sku: 'sku' in payload ? payload.sku ?? null : product.sku,
    barcode: 'barcode' in payload ? payload.barcode ?? null : product.barcode,
    unit_price: payload.unit_price != null ? String(payload.unit_price) : product.unit_price,
    discount_percent:
      'discount_percent' in payload
        ? payload.discount_percent != null
          ? String(payload.discount_percent)
          : null
        : product.discount_percent ?? null,
    wholesale_price: payload.wholesale_price != null ? String(payload.wholesale_price) : product.wholesale_price,
    cost_price: payload.cost_price != null ? String(payload.cost_price) : product.cost_price,
    stock_quantity: isService ? 0 : (payload.stock_quantity ?? product.stock_quantity),
    low_stock_threshold: isService ? 0 : (payload.low_stock_threshold ?? product.low_stock_threshold),
    tax_percentage: payload.tax_percentage != null ? String(payload.tax_percentage) : product.tax_percentage,
    tax_class: payload.tax_class ?? product.tax_class,
    is_active: payload.is_active ?? product.is_active,
    is_recurring: payload.is_recurring ?? product.is_recurring ?? false,
    billing_interval:
      'billing_interval' in payload || 'is_recurring' in payload
        ? (payload.is_recurring ?? product.is_recurring)
          ? (payload.billing_interval ?? product.billing_interval ?? 'month')
          : null
        : product.billing_interval ?? null,
    updated_at: new Date().toISOString(),
  };
}

function buildCreatePayloadFromProduct(product: Product): CreateProductData {
  const isService = (product.type ?? 'product') === 'service';
  return {
    name: product.name,
    type: product.type ?? 'product',
    unit: product.unit,
    category_id: product.category_id,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    unit_price: Number(product.unit_price),
    discount_percent:
      product.discount_percent != null && product.discount_percent !== ''
        ? Number(product.discount_percent)
        : null,
    wholesale_price: product.wholesale_price != null ? Number(product.wholesale_price) : null,
    cost_price: product.cost_price != null ? Number(product.cost_price) : null,
    stock_quantity: isService ? 0 : product.stock_quantity,
    low_stock_threshold: isService ? 0 : product.low_stock_threshold,
    tax_percentage: Number(product.tax_percentage),
    tax_class: product.tax_class as CreateProductData['tax_class'],
    is_active: product.is_active,
    is_recurring: product.is_recurring ?? false,
    billing_interval: product.is_recurring ? (product.billing_interval ?? 'month') : null,
  };
}

function extractProduct(responseData: unknown): Product | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Product };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Product;
  if ('id' in direct) return direct;
  return null;
}

function extractServerErrorMessage(err: unknown): string {
  const axiosErr = err as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const validationMessage = axiosErr.response?.data?.errors
    ? Object.values(axiosErr.response.data.errors).flat().join(' ')
    : undefined;
  return validationMessage || axiosErr.response?.data?.message || axiosErr.message || 'Product validation failed';
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

  if (!mutationId) return;

  try {
    const localId = await localProductsStore.save(product, payload, mutationId, mutationType);
    product._localId = localId;
  } catch (err) {
    console.error('[OfflineProduct] Local store save failed:', err);
  }
}

export async function completeOfflineCreateProductInstant(payload: CreateProductData): Promise<ProductWithSyncMeta> {
  const product = buildLocalProduct(payload);
  const persist = persistOfflineProductInBackground(product, payload, 'create').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
  trackWrite(persist);
  await persist;
  return product;
}

export async function completeOfflineUpdateProductInstant(
  product: Product,
  payload: UpdateProductData,
): Promise<ProductWithSyncMeta> {
  const updated: ProductWithSyncMeta = {
    ...applyProductPayload(product, payload),
    _pendingSync: true,
    _mutationType: 'update',
  };
  const persist = persistOfflineProductInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
  trackWrite(persist);
  await persist;
  return updated;
}

export async function completeOfflineUpdatePendingProduct(
  existing: ProductWithSyncMeta,
  payload: UpdateProductData,
): Promise<ProductWithSyncMeta> {
  const record = existing._localId
    ? await localProductsStore.getByLocalId(existing._localId)
    : await localProductsStore.getByProductId(existing.id);
  if (!record) {
    throw new Error('Pending product record not found');
  }

  const updated = applyProductPayload({ ...record.product, ...existing }, payload);
  const nextPayload: CreateProductData | UpdateProductData =
    record.mutationType === 'create'
      ? buildCreatePayloadFromProduct(updated)
      : { ...(record.payload as UpdateProductData), ...payload };

  if (record.mutationType === 'create' && !isCompletelyOffline()) {
    try {
      const { data } = await axiosInstance.post<{ data: Product }>('/products', nextPayload);
      const serverProduct = extractProduct(data);
      await localProductsStore.removeByMutationId(record.mutationId);
      await mutationQueue.removeById(record.mutationId);
      if (serverProduct) return serverProduct as ProductWithSyncMeta;
      return { ...updated, _pendingSync: false };
    } catch (err: unknown) {
      if (!isNetworkFailure(err)) {
        await localProductsStore.markFailedByMutationId(record.mutationId, extractServerErrorMessage(err));
        throw err;
      }
    }
  }

  await mutationQueue.updateMutation(record.mutationId, { data: nextPayload });
  const updatedRecord = await localProductsStore.updatePendingRecord(record.localId, updated, nextPayload);
  await mutationQueue.requeue(record.mutationId);

  return toProductWithSyncMeta(updatedRecord);
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
    _mutationType: 'delete',
  };
  const persist = persistOfflineProductInBackground(product, { id }, 'delete').catch((err) => {
    console.error('[OfflineProduct] Background persist failed:', err);
  });
  trackWrite(persist);
}
