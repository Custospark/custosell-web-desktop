import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { GUIDE } from '../../../shared/api/endpoints/guideEndpoints';
import { isNetworkFailure } from '../../../app/store/offline/core/offlineQueryUtils';
import { mutationQueue } from '../../../app/store/offline/sync/mutationQueue';
import { readWithOfflineStrategy } from '../../../app/store/offline/core/offlineReadStrategy';
import {
  localGuideFeedbackStore,
  toGuideFeedbackWithSyncMeta,
  type GuideFeedbackWithSyncMeta,
} from '../../../app/store/offline/guide/localGuideFeedbackStore';
import {
  completeOfflineGuideFeedbackInstant,
  shouldCompleteGuideFeedbackLocally,
  type CreateGuideFeedbackPayload,
} from '../../../app/store/offline/guide/completeOfflineGuideFeedback';
import type {
  GuideFaqDto,
  GuideFeedbackMineDto,
} from './GuideTypes';

export const guideKeys = {
  all: ['guide'] as const,
  tutorials: () => [...guideKeys.all, 'tutorials'] as const,
  faqs: () => [...guideKeys.all, 'faqs'] as const,
  feedbackMine: () => [...guideKeys.all, 'feedback-mine'] as const,
};

function isOptimisticFeedback(item: GuideFeedbackWithSyncMeta): boolean {
  return Boolean(item._pendingSync || item._localId || item.id < 0);
}

function isLocalOnlyFeedback(item: GuideFeedbackWithSyncMeta): boolean {
  return Boolean(item._localId) || item.id < 0;
}

export function feedbackSelectionKey(item: GuideFeedbackWithSyncMeta): string {
  if (item._localId) return `local:${item._localId}`;
  return `id:${item.id}`;
}

async function deleteLocalGuideFeedback(item: GuideFeedbackWithSyncMeta): Promise<void> {
  const localId = item._localId;
  if (!localId) return;
  const record = await localGuideFeedbackStore.getByLocalId(localId);
  if (record?.mutationId) {
    await mutationQueue.removeById(record.mutationId);
  }
  await localGuideFeedbackStore.removeByLocalId(localId);
}

async function deleteGuideFeedbackItems(items: GuideFeedbackWithSyncMeta[]): Promise<void> {
  const localItems = items.filter(isLocalOnlyFeedback);
  const serverIds = items
    .filter((item) => !isLocalOnlyFeedback(item) && item.id > 0)
    .map((item) => item.id);

  await Promise.all(localItems.map((item) => deleteLocalGuideFeedback(item)));

  if (serverIds.length === 1) {
    await axiosInstance.delete(GUIDE.FEEDBACK_ITEM(serverIds[0]), { timeout: 10000 });
  } else if (serverIds.length > 1) {
    await axiosInstance.post(GUIDE.FEEDBACK_BULK_DELETE, { ids: serverIds }, { timeout: 10000 });
  }
}

async function loadLocalPendingFeedback(): Promise<GuideFeedbackWithSyncMeta[]> {
  const pending = await localGuideFeedbackStore.getPending();
  return pending.map(toGuideFeedbackWithSyncMeta);
}

function mergeFeedbackLists(
  base: GuideFeedbackMineDto[],
  local: GuideFeedbackWithSyncMeta[],
): GuideFeedbackWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as GuideFeedbackMineDto[];
  const safeLocal = local.filter(Boolean) as GuideFeedbackWithSyncMeta[];
  const localIds = new Set(safeLocal.map((f) => f.id));
  const localUuids = new Set(safeLocal.map((f) => f.uuid));
  const filtered = safeBase.filter(
    (f) => !localIds.has(f.id) && !localUuids.has(f.uuid) && !isOptimisticFeedback(f as GuideFeedbackWithSyncMeta),
  );
  const merged = [...safeLocal, ...filtered] as GuideFeedbackWithSyncMeta[];
  merged.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
  return merged;
}

async function readMyFeedbackFromClient(): Promise<GuideFeedbackWithSyncMeta[]> {
  const local = await loadLocalPendingFeedback();
  const pendingIds = new Set(local.map((f) => f.id));
  const cached = queryClient.getQueryData<GuideFeedbackMineDto[]>(guideKeys.feedbackMine()) ?? [];
  const cleaned = cached.filter((f) => {
    const meta = f as GuideFeedbackWithSyncMeta;
    if (pendingIds.has(f.id)) return true;
    return !isOptimisticFeedback(meta);
  });
  return mergeFeedbackLists(cleaned, local);
}

async function fetchMyGuideFeedbackMerged(): Promise<GuideFeedbackWithSyncMeta[]> {
  try {
    return await readWithOfflineStrategy({
      readFromClient: readMyFeedbackFromClient,
      fetchFromServer: async () => {
        const local = await loadLocalPendingFeedback();
        const { data } = await axiosInstance.get<{ data: GuideFeedbackMineDto[] }>(GUIDE.FEEDBACK_MINE, {
          timeout: 10000,
        });
        return mergeFeedbackLists(data.data ?? [], local);
      },
    });
  } catch (err) {
    console.warn('[GuideFeedback] Read failed — falling back to cached submissions:', err);
    return readMyFeedbackFromClient();
  }
}

const guideQueryDefaults = {
  networkMode: 'always' as const,
  retry: (failureCount: number, error: unknown) =>
    !isNetworkFailure(error) && failureCount < 1,
};

export function useGuideTutorials(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: guideKeys.tutorials(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: import('./GuideTypes').GuideTutorialDto[] }>(GUIDE.TUTORIALS);
      return data.data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useGuideFaqs(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: guideKeys.faqs(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFaqDto[] }>(GUIDE.FAQS);
      return data.data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useMyGuideFeedback() {
  return useQuery<GuideFeedbackWithSyncMeta[]>({
    queryKey: guideKeys.feedbackMine(),
    queryFn: fetchMyGuideFeedbackMerged,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev ?? [],
    ...guideQueryDefaults,
  });
}

export function useCreateGuideFeedback() {
  const queryClient = useQueryClient();

  return useMutation<GuideFeedbackWithSyncMeta, AxiosError, CreateGuideFeedbackPayload>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (shouldCompleteGuideFeedbackLocally()) {
        return completeOfflineGuideFeedbackInstant(payload);
      }

      try {
        const { data } = await axiosInstance.post<{ data: GuideFeedbackMineDto; message?: string }>(
          GUIDE.FEEDBACK,
          payload,
          { timeout: 10000 },
        );
        return data.data as GuideFeedbackWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineGuideFeedbackInstant(payload);
        }
        throw err;
      }
    },
    onSuccess: (feedback) => {
      if (feedback._pendingSync) {
        queryClient.setQueryData<GuideFeedbackWithSyncMeta[]>(guideKeys.feedbackMine(), (old) => {
          const list = old ?? [];
          if (list.some((f) => f.id === feedback.id || f.uuid === feedback.uuid)) return list;
          return [feedback, ...list];
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: guideKeys.feedbackMine() });
      }
    },
  });
}

export function useDeleteMyGuideFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: GuideFeedbackWithSyncMeta) => deleteGuideFeedbackItems([item]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: guideKeys.feedbackMine() });
    },
  });
}

export function useBulkDeleteMyGuideFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: GuideFeedbackWithSyncMeta[]) => deleteGuideFeedbackItems(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: guideKeys.feedbackMine() });
    },
  });
}
