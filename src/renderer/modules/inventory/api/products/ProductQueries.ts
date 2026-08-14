import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { applyOfflineStockOverlay } from '../../../../app/store/offline/inventory/offlineStockOverlay';

import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { readCatalogBaseline, resolveAuthBusinessId, resolveAuthLocationId } from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import {
  backupProductCatalog,
  fetchProductsFromApi,
  loadProductCatalogBaseline,
  refreshProductCatalogSnapshot,
} from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/sync/mutationQueue';
import { localProductsStore, toProductWithSyncMeta, type ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import {
  shouldCompleteProductLocally,
  completeOfflineCreateProductInstant,
  completeOfflineUpdateProductInstant,
  completeOfflineDeleteProductInstant,
  completeOfflineUpdatePendingProduct,
} from '../../../../app/store/offline/inventory/completeOfflineProduct';
import { PRODUCTS } from '../../../../shared/api/endpoints/endpoints';
import { inventoryKeys } from './inventoryKeys';
import type {
  Product, StockMovement,
  CreateProductData, UpdateProductData,
} from './ProductTypes';

export { inventoryKeys };
export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './CategoryQueries';
export {
  useStockMovements,
  useCreateStockMovement,
} from './StockMovementQueries';

export interface UpdateSupplyListingData {
  listed_for_supply: boolean;
  supply_price?: number | null;
  supply_min_qty?: number | null;
}

/** ── Product merge helpers ── */

async function readProductsBaseline(): Promise<Product[]> {
  const locationId = resolveAuthLocationId();
  return readCatalogBaseline('products', inventoryKeys.products(), loadProductCatalogBaseline, locationId);
}

function stripStaleProductSyncMeta(
  product: ProductWithSyncMeta,
  pendingProductIds: Set<number>,
): ProductWithSyncMeta {
  if (pendingProductIds.has(product.id)) return product;
  if (!product._pendingSync && !product._syncFailed && !product._localId) return product;

  const cleaned = { ...product };
  delete cleaned._pendingSync;
  delete cleaned._syncFailed;
  delete cleaned._lastError;
  delete cleaned._mutationType;
  delete cleaned._localId;
  return cleaned;
}

async function mergeProductsWithOfflineOverlay(base: Product[]): Promise<ProductWithSyncMeta[]> {
  const overlaid = await applyOfflineStockOverlay(base);
  try {
    const pending = await localProductsStore.getPending();
    const pendingProductIds = new Set(pending.map((r) => r.product.id));

    const stripped = (overlaid as ProductWithSyncMeta[])
      .filter((p) => p.id >= 0 || pendingProductIds.has(p.id))
      .map((p) => stripStaleProductSyncMeta(p, pendingProductIds));

    const localCreates = pending
      .filter((r) => r.mutationType === 'create')
      .map(toProductWithSyncMeta);
    const localUpdates = pending
      .filter((r) => r.mutationType === 'update')
      .map(toProductWithSyncMeta);
    const pendingDeleteIds = new Set(
      pending.filter((r) => r.mutationType === 'delete').map((r) => r.product.id),
    );

    let merged = mergeProductLists(stripped, localCreates);
    if (localUpdates.length > 0) {
      const updateById = new Map(localUpdates.map((p) => [p.id, p]));
      merged = merged.map((p) => updateById.get(p.id) ?? p);
    }
    if (pendingDeleteIds.size > 0) {
      merged = merged.filter((p) => !pendingDeleteIds.has(p.id));
    }
    return merged;
  } catch (err) {
    console.warn('[Products] Pending local products skipped:', err);
    return overlaid as ProductWithSyncMeta[];
  }
}

async function readProductsFromClientCache(): Promise<ProductWithSyncMeta[]> {
  const baseline = await readProductsBaseline();
  return mergeProductsWithOfflineOverlay(baseline);
}

async function readProductsMerged(): Promise<ProductWithSyncMeta[]> {
  try {
    return await readWithOfflineStrategy({
      readFromClient: readProductsFromClientCache,
      fetchFromServer: async () => {
        const locationId = resolveAuthLocationId();
        const { products: serverProducts, catalogKind } = await fetchProductsFromApi(locationId);
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupProductCatalog(businessId, catalogKind, serverProducts, locationId);
        }
        return mergeProductsWithOfflineOverlay(serverProducts);
      },
    });
  } catch (err) {
    console.warn('[Products] Read failed - falling back to cached products:', err);
    return readProductsFromClientCache();
  }
}

/** Merge server products with local pending creates - local wins by id/name. */
function mergeProductLists(base: Product[], local: ProductWithSyncMeta[]): ProductWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Product[];
  const safeLocal = local.filter(Boolean) as ProductWithSyncMeta[];
  const localIds = new Set(safeLocal.map((p) => p.id));
  const localNames = new Set(safeLocal.map((p) => p.name));
  const filtered = safeBase.filter((p) => !localIds.has(p.id) && !localNames.has(p.name));
  return [...safeLocal, ...filtered] as ProductWithSyncMeta[];
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const validationMessage = axiosErr.response?.data?.errors
    ? Object.values(axiosErr.response.data.errors).flat().join(' ')
    : undefined;
  return validationMessage || sanitizeErrorMessage(err, fallback);
}

function extractProductFromResponse(responseData: unknown): Product | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Product };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Product;
  if ('id' in direct) return direct;
  return null;
}

function sanitizeProductList(list: ProductWithSyncMeta[] = []): ProductWithSyncMeta[] {
  return list.filter(Boolean) as ProductWithSyncMeta[];
}

/** ── Products ── */

export function useProducts() {
  return useQuery<ProductWithSyncMeta[]>({
    queryKey: inventoryKeys.products(),
    queryFn: readProductsMerged,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev ?? queryClient.getQueryData<ProductWithSyncMeta[]>(inventoryKeys.products()) ?? [],
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useProduct(id: number) {
  return useQuery<ProductWithSyncMeta>({
    queryKey: inventoryKeys.product(id),
    queryFn: async () => {
      if (id < 0) {
        const local = await localProductsStore.getPending();
        const match = local.find((r) => r.product.id === id);
        if (match) return toProductWithSyncMeta(match);
      }
      return readWithOfflineStrategy({
        readFromClient: async () => {
          const baseline = await readProductsBaseline();
          const found = baseline.find((p) => p.id === id);
          if (!found) throw new Error('Product not available offline');
          return found as ProductWithSyncMeta;
        },
        fetchFromServer: async () => {
          const { data: response } = await axiosInstance.get<{ data: Product }>(`/products/${id}`);
          return response.data as ProductWithSyncMeta;
        },
      });
    },
    enabled: Boolean(id),
  });
}

export function useLowStockProducts() {
  return useQuery<Product[]>({
    queryKey: inventoryKeys.lowStock(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Product[] }>('/products/low-stock');
      return response.data;
    },
  });
}

export function useProductStockMovements(productId: number) {
  return useQuery<StockMovement[]>({
    queryKey: inventoryKeys.productStockMovements(productId),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StockMovement[] }>(`/products/${productId}/stock-movements`);
      return response.data;
    },
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ProductWithSyncMeta, AxiosError<ApiError>, CreateProductData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      if (shouldCompleteProductLocally()) {
        return completeOfflineCreateProductInstant(p);
      }
      try {
        const { data } = await axiosInstance.post<{ data: Product }>('/products', p);
        const product = extractProductFromResponse(data);
        if (!product) {
          throw new Error('Invalid product response from server');
        }
        return product as ProductWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteProductLocally()) {
          return completeOfflineCreateProductInstant(p);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: inventoryKeys.products() });
    },
    onSuccess: (product) => {
      if (!product) {
        void refreshProductCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
        return;
      }
      if (product._pendingSync) {
        qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) => {
          const list = sanitizeProductList(old ?? []);
          if (list.some((item) => item.id === product.id || item.name === product.name)) return list;
          return [product, ...list];
        });
        showToast('success', 'Product saved - will sync when online');
      } else {
        void refreshProductCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create product'));
    },
  });
}

export function useUpdateSupplyListing() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Product, AxiosError<ApiError>, { id: number; data: UpdateSupplyListingData }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.patch(PRODUCTS.SUPPLY_LISTING(id), data);
      const product = extractProductFromResponse(res);
      if (!product) throw new Error('Invalid supply listing response');
      return product;
    },
    onSuccess: (product, { id }) => {
      qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...product } : p)),
      );
      qc.setQueryData(inventoryKeys.product(id), product);
      void refreshProductCatalogSnapshot();
      showToast('success', product.listed_for_supply ? 'Product listed on marketplace' : 'Product removed from marketplace');
    },
    onError: (e) => {
      showToast('error', extractApiErrorMessage(e, 'Failed to update supply listing'));
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ProductWithSyncMeta, AxiosError<ApiError>, { id: number; data: UpdateProductData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const existing = sanitizeProductList(
        queryClient.getQueryData<ProductWithSyncMeta[]>(inventoryKeys.products()) ?? [],
      ).find((p) => p.id === id);
      if (!existing) throw new Error('Product not found');

      const isPendingOnly = existing._pendingSync || id < 0;
      if (isPendingOnly) {
        return completeOfflineUpdatePendingProduct(existing, data);
      }

      if (shouldCompleteProductLocally()) {
        return completeOfflineUpdateProductInstant(existing, data);
      }
      try {
        const { data: res } = await axiosInstance.put<{ data: Product }>(`/products/${id}`, data);
        const product = extractProductFromResponse(res);
        if (!product) {
          throw new Error('Invalid product response from server');
        }
        return product as ProductWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteProductLocally()) {
          return completeOfflineUpdateProductInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (product, { id }) => {
      if (!product) {
        void refreshProductCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
        return;
      }
      if (product._pendingSync) {
        qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
          sanitizeProductList(old ?? []).map((p) => p.id === id ? product : p),
        );
        showToast(
          'success',
          product._mutationType ? 'Corrected product saved - will retry sync' : 'Changes saved - will sync when online',
        );
      } else {
        qc.removeQueries({ queryKey: inventoryKeys.product(id) });
        qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) => {
          const withoutStale = (old ?? []).filter((p) => p.id !== id);
          const existingIndex = withoutStale.findIndex((p) => p.id === product.id);
          if (existingIndex >= 0) {
            return withoutStale.map((p, index) => index === existingIndex ? product : p);
          }
          return [product, ...withoutStale];
        });
        void refreshProductCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
    onError: (e, { id }) => {
      const message = extractApiErrorMessage(e, 'Failed to update product');
      qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) =>
          p.id === id && p._pendingSync
            ? { ...p, _syncFailed: true, _lastError: message }
            : p,
        ),
      );
      showToast('error', message);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const cached = qc.getQueryData<ProductWithSyncMeta[]>(inventoryKeys.products());
      const product = cached?.find((p) => p.id === id);
      const isPendingOnly = product?._pendingSync || id < 0;

      if (isPendingOnly) {
        const mutationId = await localProductsStore.removeByProductId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (shouldCompleteProductLocally()) {
        completeOfflineDeleteProductInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`/products/${id}`);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
          return;
        }
        if (shouldCompleteProductLocally()) {
          completeOfflineDeleteProductInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      void refreshProductCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete product'));
    },
  });
}