import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import {
  readCatalogBaseline,
  backupCatalogSnapshot,
  resolveAuthBusinessId,
} from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import {
  loadCategoryCatalogBaseline,
  refreshCategoryCatalogSnapshot,
} from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/sync/mutationQueue';
import {
  localCategoriesStore,
  toCategoryWithSyncMeta,
  type CategoryWithSyncMeta,
} from '../../../../app/store/offline/inventory/localCategoriesStore';
import {
  shouldCompleteCategoryLocally,
  completeOfflineCreateCategoryInstant,
  completeOfflineUpdateCategoryInstant,
  completeOfflineDeleteCategoryInstant,
} from '../../../../app/store/offline/inventory/completeOfflineCategory';
import { inventoryKeys } from './inventoryKeys';
import type { Category, CreateCategoryData } from './ProductTypes';

/** ── Category merge helpers ── */

async function readCategoriesBaseline(): Promise<Category[]> {
  return readCatalogBaseline('categories', inventoryKeys.categories(), loadCategoryCatalogBaseline);
}

async function loadLocalPendingCategories(): Promise<CategoryWithSyncMeta[]> {
  const pending = await localCategoriesStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toCategoryWithSyncMeta);
}

/** Merge server categories with local pending creates — local wins by id/name. */
function mergeCategoryLists(base: Category[], local: CategoryWithSyncMeta[]): CategoryWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Category[];
  const safeLocal = local.filter(Boolean) as CategoryWithSyncMeta[];
  const localIds = new Set(safeLocal.map((c) => c.id));
  const localNames = new Set(safeLocal.map((c) => c.name));
  const filtered = safeBase.filter((c) => !localIds.has(c.id) && !localNames.has(c.name));
  return [...safeLocal, ...filtered] as CategoryWithSyncMeta[];
}

function sanitizeCategoryList(list: CategoryWithSyncMeta[] = []): CategoryWithSyncMeta[] {
  return list.filter(Boolean) as CategoryWithSyncMeta[];
}

function extractCategoryFromResponse(responseData: unknown): Category | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Category };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Category;
  if ('id' in direct) return direct;
  return null;
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