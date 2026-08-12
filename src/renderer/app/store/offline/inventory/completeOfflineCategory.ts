import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localCategoriesStore, type CategoryWithSyncMeta } from './localCategoriesStore';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import type { CreateCategoryData, Category } from '../../../../modules/inventory/api/products/ProductTypes';

export function shouldCompleteCategoryLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalCategory(payload: CreateCategoryData): CategoryWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();
  const authUser = store.getState().auth.user;

  const category: Category = {
    id: localIdNum,
    business_id: authUser?.business_id ?? 0,
    name: payload.name,
    description: payload.description ?? null,
    sort_order: payload.sort_order ?? 0,
    created_at: now,
    updated_at: now,
  };

  return { ...category, _pendingSync: true };
}

export async function persistOfflineCategoryInBackground(
  category: CategoryWithSyncMeta,
  payload: CreateCategoryData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let mutationId = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/categories';

  if (mutationType === 'create') {
    method = 'POST';
    url = '/categories';
  } else if (mutationType === 'update') {
    method = 'PUT';
    url = `/categories/${category.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/categories/${(payload as { id: number }).id}`;
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineCategory] Enqueue failed:', err);
  }

  try {
    const localId = await localCategoriesStore.save(category, payload, mutationId, mutationType);
    category._localId = localId;
  } catch (err) {
    console.error('[OfflineCategory] Local store save failed:', err);
  }
}

export function completeOfflineCreateCategoryInstant(payload: CreateCategoryData): CategoryWithSyncMeta {
  const category = buildLocalCategory(payload);
  const persist = persistOfflineCategoryInBackground(category, payload, 'create').catch((err) => {
    console.error('[OfflineCategory] Background persist failed:', err);
  });
  trackWrite(persist);
  return category;
}

export function completeOfflineUpdateCategoryInstant(category: Category, payload: CreateCategoryData): CategoryWithSyncMeta {
  const updated: CategoryWithSyncMeta = {
    ...category,
    ...payload,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  const persist = persistOfflineCategoryInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineCategory] Background persist failed:', err);
  });
  trackWrite(persist);
  return updated;
}

export function completeOfflineDeleteCategoryInstant(id: number): void {
  const category: CategoryWithSyncMeta = {
    id,
    business_id: 0,
    name: '',
    description: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  const persist = persistOfflineCategoryInBackground(category, { id }, 'delete').catch((err) => {
    console.error('[OfflineCategory] Background persist failed:', err);
  });
  trackWrite(persist);
}
