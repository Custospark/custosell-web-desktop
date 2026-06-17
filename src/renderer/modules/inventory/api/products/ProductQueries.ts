import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { applyOfflineStockOverlay } from '../../../../app/store/offline/inventory/offlineStockOverlay';

import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { readCatalogBaseline, backupCatalogSnapshot, resolveAuthBusinessId } from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import {
  backupProductCatalog,
  fetchProductsFromApi,
  loadCategoryCatalogBaseline,
  loadProductCatalogBaseline,
  refreshCategoryCatalogSnapshot,
  refreshProductCatalogSnapshot,
} from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/sync/mutationQueue';
import { localProductsStore, toProductWithSyncMeta, type ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { localCategoriesStore, toCategoryWithSyncMeta, type CategoryWithSyncMeta } from '../../../../app/store/offline/inventory/localCategoriesStore';
import {
  shouldCompleteProductLocally,
  completeOfflineCreateProductInstant,
  completeOfflineUpdateProductInstant,
  completeOfflineDeleteProductInstant,
  completeOfflineUpdatePendingProduct,
} from '../../../../app/store/offline/inventory/completeOfflineProduct';
import {
  shouldCompleteCategoryLocally,
  completeOfflineCreateCategoryInstant,
  completeOfflineUpdateCategoryInstant,
  completeOfflineDeleteCategoryInstant,
} from '../../../../app/store/offline/inventory/completeOfflineCategory';
import type {
  Category, Product, StockMovement,
  CreateCategoryData, CreateProductData, UpdateProductData, CreateStockMovementData,
} from './ProductTypes';

export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: number) => [...inventoryKeys.all, 'products', id] as const,
  lowStock: () => [...inventoryKeys.all, 'products', 'low-stock'] as const,
  productStockMovements: (productId: number) => [...inventoryKeys.all, 'products', productId, 'stock-movements'] as const,
  stockMovements: () => [...inventoryKeys.all, 'stock-movements'] as const,
};

/** ── Merge helpers ── */

async function readProductsBaseline(): Promise<Product[]> {
  return readCatalogBaseline('products', inventoryKeys.products(), loadProductCatalogBaseline);
}

async function readCategoriesBaseline(): Promise<Category[]> {
  return readCatalogBaseline('categories', inventoryKeys.categories(), loadCategoryCatalogBaseline);
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
        const { products: serverProducts, catalogKind } = await fetchProductsFromApi();
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupProductCatalog(businessId, catalogKind, serverProducts);
        }
        return mergeProductsWithOfflineOverlay(serverProducts);
      },
    });
  } catch (err) {
    console.warn('[Products] Read failed — falling back to cached products:', err);
    return readProductsFromClientCache();
  }
}

async function loadLocalPendingCategories(): Promise<CategoryWithSyncMeta[]> {
  const pending = await localCategoriesStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toCategoryWithSyncMeta);
}

/** Merge server products with local pending creates — local wins by id/name. */
function mergeProductLists(base: Product[], local: ProductWithSyncMeta[]): ProductWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Product[];
  const safeLocal = local.filter(Boolean) as ProductWithSyncMeta[];
  const localIds = new Set(safeLocal.map((p) => p.id));
  const localNames = new Set(safeLocal.map((p) => p.name));
  const filtered = safeBase.filter((p) => !localIds.has(p.id) && !localNames.has(p.name));
  return [...safeLocal, ...filtered] as ProductWithSyncMeta[];
}

function mergeCategoryLists(base: Category[], local: CategoryWithSyncMeta[]): CategoryWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Category[];
  const safeLocal = local.filter(Boolean) as CategoryWithSyncMeta[];
  const localIds = new Set(safeLocal.map((c) => c.id));
  const localNames = new Set(safeLocal.map((c) => c.name));
  const filtered = safeBase.filter((c) => !localIds.has(c.id) && !localNames.has(c.name));
  return [...safeLocal, ...filtered] as CategoryWithSyncMeta[];
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

function extractCategoryFromResponse(responseData: unknown): Category | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Category };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Category;
  if ('id' in direct) return direct;
  return null;
}

function sanitizeProductList(list: ProductWithSyncMeta[] = []): ProductWithSyncMeta[] {
  return list.filter(Boolean) as ProductWithSyncMeta[];
}

function sanitizeCategoryList(list: CategoryWithSyncMeta[] = []): CategoryWithSyncMeta[] {
  return list.filter(Boolean) as CategoryWithSyncMeta[];
}

/** ── Categories ── */

export function useCategories() {
  return useQuery<CategoryWithSyncMeta[]>({
    queryKey: inventoryKeys.categories(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const baseline = await readCategoriesBaseline();
        const local = await loadLocalPendingCategories();
        return mergeCategoryLists(baseline, local);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Category[] }>('/categories');
        const list = Array.isArray(response.data) ? response.data : [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupCatalogSnapshot('categories', businessId, list);
        }
        const local = await loadLocalPendingCategories();
        return mergeCategoryLists(list, local);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<CategoryWithSyncMeta, AxiosError<ApiError>, CreateCategoryData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      if (shouldCompleteCategoryLocally()) {
        return completeOfflineCreateCategoryInstant(p);
      }
      try {
        const { data } = await axiosInstance.post<{ data: Category }>('/categories', p);
        const category = extractCategoryFromResponse(data);
        if (!category) {
          throw new Error('Invalid category response from server');
        }
        return category as CategoryWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteCategoryLocally()) {
          return completeOfflineCreateCategoryInstant(p);
        }
        throw err;
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: inventoryKeys.categories() });
    },
    onSuccess: (category) => {
      if (!category) {
        void refreshCategoryCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
        return;
      }
      if (category._pendingSync) {
        qc.setQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories(), (old) => {
          const list = sanitizeCategoryList(old ?? []);
          if (list.some((c) => c.id === category.id || c.name === category.name)) return list;
          return [category, ...list];
        });
        showToast('success', 'Category saved — will sync when online');
      } else {
        void refreshCategoryCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create category'));
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<CategoryWithSyncMeta, AxiosError<ApiError>, { id: number; data: CreateCategoryData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const existing = sanitizeCategoryList(
        queryClient.getQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories()) ?? [],
      ).find((c) => c.id === id);
      if (!existing) throw new Error('Category not found');

      const isPendingOnly = existing._pendingSync || id < 0;
      if (isPendingOnly) {
        return { ...existing, ...data, _pendingSync: true } as CategoryWithSyncMeta;
      }

      if (shouldCompleteCategoryLocally()) {
        return completeOfflineUpdateCategoryInstant(existing, data);
      }
      try {
        const { data: res } = await axiosInstance.put<{ data: Category }>(`/categories/${id}`, data);
        const category = extractCategoryFromResponse(res);
        if (!category) {
          throw new Error('Invalid category response from server');
        }
        return category as CategoryWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteCategoryLocally()) {
          return completeOfflineUpdateCategoryInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (category, { id }) => {
      if (!category) {
        void refreshCategoryCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
        return;
      }
      if (category._pendingSync) {
        qc.setQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories(), (old) =>
          sanitizeCategoryList(old ?? []).map((c) => c.id === id ? category : c),
        );
        showToast('success', 'Changes saved — will sync when online');
      } else {
        void refreshCategoryCatalogSnapshot();
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update category'));
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const cached = qc.getQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories());
      const category = cached?.find((c) => c.id === id);
      const isPendingOnly = category?._pendingSync || id < 0;

      if (isPendingOnly) {
        const mutationId = await localCategoriesStore.removeByCategoryId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (shouldCompleteCategoryLocally()) {
        completeOfflineDeleteCategoryInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`/categories/${id}`);
      } catch (err: unknown) {
        if (shouldCompleteCategoryLocally()) {
          completeOfflineDeleteCategoryInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories(), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      void refreshCategoryCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete category'));
    },
  });
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
        showToast('success', 'Product saved — will sync when online');
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
          product._mutationType ? 'Corrected product saved — will retry sync' : 'Changes saved — will sync when online',
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

/** ── Stock Movements ── */

export function useStockMovements() {
  return useQuery<StockMovement[]>({
    queryKey: inventoryKeys.stockMovements(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StockMovement[] }>('/stock-movements');
      return response.data;
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<StockMovement, AxiosError<ApiError>, CreateStockMovementData, { previousProducts: Product[] | undefined }>({
    mutationFn: async (payload) => {
      const { data: response } = await axiosInstance.post<{ data: StockMovement }>('/stock-movements', payload);
      return response.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.products() });
      const previousProducts = queryClient.getQueryData<Product[]>(inventoryKeys.products());
      queryClient.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) => p.id === payload.product_id ? { ...p, stock_quantity: payload.stock_after } : p),
      );
      return { previousProducts };
    },

    onError: (error, _payload, ctx) => {
      if (ctx?.previousProducts) {
        queryClient.setQueryData(inventoryKeys.products(), ctx.previousProducts);
      }
      const data = error.response?.data as ApiError | undefined;
      const serverMsg = data?.message;
      const validationMsg = data?.errors ? Object.values(data.errors).flat().join('. ') : '';
      const networkMsg = (!error.response) ? 'Could not reach the server. Check your connection.' : '';
      const msg = serverMsg || validationMsg || networkMsg || 'Failed to record stock movement';
      console.error('[StockMovement] Failed:', error.message, error.code, error.response?.status, data);
      showToast('error', msg);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
  });
}
