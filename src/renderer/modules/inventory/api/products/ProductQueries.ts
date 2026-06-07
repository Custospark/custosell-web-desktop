import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { applyOfflineStockOverlay } from '../../../../app/store/offline/offlineStockOverlay';
import { isNetworkFailure } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { mutationQueue } from '../../../../app/store/offline/mutationQueue';
import { localProductsStore, toProductWithSyncMeta, type ProductWithSyncMeta } from '../../../../app/store/offline/localProductsStore';
import { localCategoriesStore, toCategoryWithSyncMeta, type CategoryWithSyncMeta } from '../../../../app/store/offline/localCategoriesStore';
import {
  shouldCompleteProductLocally,
  completeOfflineCreateProductInstant,
  completeOfflineUpdateProductInstant,
  completeOfflineDeleteProductInstant,
} from '../../../../app/store/offline/completeOfflineProduct';
import {
  shouldCompleteCategoryLocally,
  completeOfflineCreateCategoryInstant,
  completeOfflineUpdateCategoryInstant,
  completeOfflineDeleteCategoryInstant,
} from '../../../../app/store/offline/completeOfflineCategory';
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

async function loadLocalPendingProducts(): Promise<ProductWithSyncMeta[]> {
  const pending = await localProductsStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toProductWithSyncMeta);
}

async function loadLocalPendingCategories(): Promise<CategoryWithSyncMeta[]> {
  const pending = await localCategoriesStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toCategoryWithSyncMeta);
}

/** Merge server products with local pending creates — local wins by id/name. */
function mergeProductLists(base: Product[], local: ProductWithSyncMeta[]): ProductWithSyncMeta[] {
  const localIds = new Set(local.map((p) => p.id));
  const localNames = new Set(local.map((p) => p.name));
  const filtered = base.filter((p) => !localIds.has(p.id) && !localNames.has(p.name));
  const merged = [...local, ...filtered] as ProductWithSyncMeta[];
  return merged;
}

function mergeCategoryLists(base: Category[], local: CategoryWithSyncMeta[]): CategoryWithSyncMeta[] {
  const localIds = new Set(local.map((c) => c.id));
  const localNames = new Set(local.map((c) => c.name));
  const filtered = base.filter((c) => !localIds.has(c.id) && !localNames.has(c.name));
  const merged = [...local, ...filtered] as CategoryWithSyncMeta[];
  return merged;
}

/** ── Categories ── */

export function useCategories() {
  return useQuery<CategoryWithSyncMeta[]>({
    queryKey: inventoryKeys.categories(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<Category[]>(inventoryKeys.categories()) ?? [];
        const local = await loadLocalPendingCategories();
        return mergeCategoryLists(cached, local);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Category[] }>('/categories', {
          timeout: 10000,
        });
        const local = await loadLocalPendingCategories();
        return mergeCategoryLists(response.data, local);
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
        const { data: r } = await axiosInstance.post<{ data: Category }>('/categories', p);
        return r.data as CategoryWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineCreateCategoryInstant(p);
        }
        throw err;
      }
    },
    onSuccess: (category, _p) => {
      if (category._pendingSync) {
        qc.setQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories(), (old) => {
          const list = old ?? [];
          if (list.some((c) => c.id === category.id)) return list;
          return [category, ...list];
        });
        showToast('success', 'Category saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
      }
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to create category');
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
      const cached = queryClient.getQueryData<Category[]>(inventoryKeys.categories());
      const existing = cached?.find((c) => c.id === id);
      if (!existing) throw new Error('Category not found');

      const isPendingOnly = (existing as CategoryWithSyncMeta)._pendingSync || id < 0;
      if (isPendingOnly) {
        return { ...existing, ...data, _pendingSync: true } as CategoryWithSyncMeta;
      }

      if (shouldCompleteCategoryLocally()) {
        return completeOfflineUpdateCategoryInstant(existing, data);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: Category }>(`/categories/${id}`, data);
        return r.data as CategoryWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineUpdateCategoryInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (category, { id }) => {
      if (category._pendingSync) {
        qc.setQueryData<CategoryWithSyncMeta[]>(inventoryKeys.categories(), (old) =>
          (old ?? []).map((c) => c.id === id ? category : c),
        );
        showToast('success', 'Changes saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: inventoryKeys.categories() });
      }
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update category');
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
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
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
    },
    onError: (e, _id) => {
      showToast('error', e.response?.data?.message || 'Failed to delete category');
    },
  });
}

/** ── Products ── */

export function useProducts() {
  return useQuery<ProductWithSyncMeta[]>({
    queryKey: inventoryKeys.products(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<Product[]>(inventoryKeys.products()) ?? [];
        const local = await loadLocalPendingProducts();
        const overlaid = await applyOfflineStockOverlay(cached);
        return mergeProductLists(overlaid, local);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Product[] }>('/products', {
          timeout: 10000,
        });
        const local = await loadLocalPendingProducts();
        const overlaid = await applyOfflineStockOverlay(response.data);
        return mergeProductLists(overlaid, local);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
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
          const cached = queryClient.getQueryData<Product[]>(inventoryKeys.products());
          const found = cached?.find((p) => p.id === id);
          if (!found) throw new Error('Product not available offline');
          return found as ProductWithSyncMeta;
        },
        fetchFromServer: async () => {
          const { data: response } = await axiosInstance.get<{ data: Product }>(`/products/${id}`, {
            timeout: 10000,
          });
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
        const { data: r } = await axiosInstance.post<{ data: Product }>('/products', p, { timeout: 10000 });
        return r.data as ProductWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineCreateProductInstant(p);
        }
        throw err;
      }
    },
    onSuccess: (product, _p) => {
      if (product._pendingSync) {
        qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) => {
          const list = old ?? [];
          if (list.some((p) => p.id === product.id || p.name === product.name)) return list;
          return [product, ...list];
        });
        showToast('success', 'Product saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to create product');
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
      const cached = queryClient.getQueryData<Product[]>(inventoryKeys.products());
      const existing = cached?.find((p) => p.id === id);
      if (!existing) throw new Error('Product not found');

      const isPendingOnly = (existing as ProductWithSyncMeta)._pendingSync || id < 0;
      if (isPendingOnly) {
        return { ...existing, ...data, _pendingSync: true } as ProductWithSyncMeta;
      }

      if (shouldCompleteProductLocally()) {
        return completeOfflineUpdateProductInstant(existing, data);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: Product }>(`/products/${id}`, data, { timeout: 10000 });
        return r.data as ProductWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineUpdateProductInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (product, { id }) => {
      if (product._pendingSync) {
        qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
          (old ?? []).map((p) => p.id === id ? product : p),
        );
        showToast('success', 'Changes saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update product');
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
        await axiosInstance.delete(`/products/${id}`, { timeout: 10000 });
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
          return;
        }
        if (!axiosErr.response) {
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
    },
    onError: (e, _id) => {
      showToast('error', e.response?.data?.message || 'Failed to delete product');
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
    onError: (error, _vars, ctx) => {
      if (ctx?.previousProducts) queryClient.setQueryData(inventoryKeys.products(), ctx.previousProducts);
      showToast('error', error.response?.data?.message || 'Failed to record stock movement');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      // Invalidate product-specific stock movement history
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
  });
}
