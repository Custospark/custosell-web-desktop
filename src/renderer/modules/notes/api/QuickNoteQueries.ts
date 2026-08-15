import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { readWithOfflineStrategy } from '../../../app/store/offline/core/offlineReadStrategy';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { mutationQueue } from '../../../app/store/offline/sync/mutationQueue';
import { localQuickNotesStore, toQuickNoteWithSyncMeta } from '../../../app/store/offline/notes/localQuickNotesStore';
import {
  completeOfflineCreateQuickNoteInstant,
  completeOfflineDeleteQuickNoteInstant,
  completeOfflineUpdateQuickNoteInstant,
  shouldCompleteQuickNoteLocally,
} from '../../../app/store/offline/notes/completeOfflineQuickNote';
import { resolveAuthBusinessId } from '../../../app/store/offline/catalogs/catalogSnapshotUtils';
import { serverCatalogStore } from '../../../app/store/offline/catalogs/serverCatalogStore';
import { quickNoteKeys } from '../../../shared/utils/quickNoteKeys';
import type { QuickNote, QuickNotePayload, QuickNoteWithSyncMeta } from './QuickNoteTypes';

const QUICK_NOTES_BASELINE = 'quickNotes';

async function loadLocalPendingQuickNotes(): Promise<QuickNoteWithSyncMeta[]> {
  try {
    const pending = await localQuickNotesStore.getPending();
    return pending
      .filter((r) => r.mutationType !== 'delete')
      .map(toQuickNoteWithSyncMeta);
  } catch (err) {
    console.warn('[QuickNotes] Local pending read skipped (non-fatal):', err);
    return [];
  }
}

async function loadQuickNotesBaseline(): Promise<QuickNoteWithSyncMeta[]> {
  try {
    const businessId = resolveAuthBusinessId();
    if (!businessId) return [];
    return (await serverCatalogStore.load<QuickNote>(QUICK_NOTES_BASELINE, businessId)) ?? [];
  } catch (err) {
    console.warn('[QuickNotes] Baseline read skipped (non-fatal):', err);
    return [];
  }
}

function backupQuickNotesBaseline(businessId: number, notes: QuickNote[]): void {
  void serverCatalogStore.save(QUICK_NOTES_BASELINE, businessId, notes).catch((err) => {
    console.warn('[QuickNotes] Failed to backup offline snapshot:', err);
  });
}

export function useQuickNotes() {
  return useQuery<QuickNoteWithSyncMeta[]>({
    queryKey: quickNoteKeys.list(),
    queryFn: async () => {
      try {
        return await readWithOfflineStrategy({
          readFromClient: async () => {
            const baseline = await loadQuickNotesBaseline();
            const local = await loadLocalPendingQuickNotes();
            return mergeQuickNotes(baseline, local);
          },
          fetchFromServer: async () => {
            // Server first: return immediately, do NOT wait for IndexedDB.
            const { data } = await axiosInstance.get<{ data: QuickNote[] }>('/quick-notes');
            const serverList = data.data ?? [];
            const businessId = resolveAuthBusinessId();
            if (businessId) backupQuickNotesBaseline(businessId, serverList);

            // Merge offline pending notes in the background and refresh the cache.
            // IndexedDB failure here is non-fatal - server data is already showing.
            void mergeOfflineQuickNotesInBackground(serverList);

            return serverList as QuickNoteWithSyncMeta[];
          },
        });
      } catch (err) {
        console.warn('[QuickNotes] Read failed - falling back to cached notes:', err);
        const cached = queryClient.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list());
        if (cached && cached.length > 0) return cached;
        return [];
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

/** Background merge: adds local pending notes to the server list. Never blocks the initial render. */
async function mergeOfflineQuickNotesInBackground(serverList: QuickNote[]): Promise<void> {
  try {
    const local = await loadLocalPendingQuickNotes();
    if (local.length === 0) return;
    const merged = mergeQuickNotes(serverList, local);
    queryClient.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), merged);
  } catch (err) {
    console.warn('[QuickNotes] Offline merge skipped (non-fatal):', err);
  }
}

/** Merge server notes with locally-pending ones (dedupe by client_uuid / negative temp id). Pinned first, then by updated_at. */
export function mergeQuickNotes(server: QuickNote[], local: QuickNoteWithSyncMeta[]): QuickNoteWithSyncMeta[] {
  const byClientUuid = new Map<string, QuickNoteWithSyncMeta>();
  for (const note of server) {
    byClientUuid.set(note.client_uuid, note);
  }
  for (const note of local) {
    if (!byClientUuid.has(note.client_uuid)) {
      byClientUuid.set(note.client_uuid, note);
    }
  }
  return Array.from(byClientUuid.values()).sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export function useCreateQuickNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<
    QuickNoteWithSyncMeta,
    AxiosError,
    QuickNotePayload,
    { previous?: QuickNoteWithSyncMeta[]; tempId: number; tempClientUuid: string }
  >({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (shouldCompleteQuickNoteLocally()) {
        return completeOfflineCreateQuickNoteInstant(payload);
      }
      try {
        const { data } = await axiosInstance.post<{ data: QuickNote }>('/quick-notes', payload);
        return data.data as QuickNoteWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteQuickNoteLocally()) {
          return completeOfflineCreateQuickNoteInstant(payload);
        }
        throw err;
      }
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()));
      const temp = buildOptimisticNote(payload);
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        mergeQuickNotes(sanitizeList(old), [temp]),
      );
      return { previous, tempId: temp.id, tempClientUuid: temp.client_uuid };
    },
    onSuccess: (note, _payload, ctx) => {
      if (!note) {
        if (ctx) qc.setQueryData(quickNoteKeys.list(), ctx.previous);
        void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
        return;
      }
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) => {
        const list = sanitizeList(old).filter((n) => n.client_uuid !== ctx?.tempClientUuid);
        return mergeQuickNotes(list, [note]);
      });
      if (note._pendingSync) {
        showToast('success', 'Note saved - will sync when online');
      } else {
        void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
      }
    },
    onError: (e, _payload, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to save note'));
    },
  });
}

export function useUpdateQuickNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<
    QuickNoteWithSyncMeta,
    AxiosError,
    { id: number; data: QuickNotePayload },
    { previous?: QuickNoteWithSyncMeta[] }
  >({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const existing = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()) ?? [])
        .find((n) => n.id === id);
      if (!existing) throw new Error('Note not found');
      if (existing._pendingSync || id < 0) {
        throw new Error('Sync this note before editing');
      }
      if (shouldCompleteQuickNoteLocally()) {
        return completeOfflineUpdateQuickNoteInstant(existing, data);
      }
      try {
        const { data: res } = await axiosInstance.put<{ data: QuickNote }>(`/quick-notes/${id}`, data);
        return res.data as QuickNoteWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteQuickNoteLocally()) {
          return completeOfflineUpdateQuickNoteInstant(existing, data);
        }
        throw err;
      }
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()));
      const optimistic: QuickNoteWithSyncMeta | null = (() => {
        const existing = previous.find((n) => n.id === id);
        if (!existing || existing._pendingSync || id < 0) return null;
        return {
          ...existing,
          title: data.title ?? existing.title,
          body: data.body ?? existing.body,
          color: data.color ?? existing.color,
          tag: data.tag ?? existing.tag,
          is_shared: data.is_shared ?? existing.is_shared,
          is_pinned: data.is_pinned ?? existing.is_pinned,
          sort_order: data.sort_order ?? existing.sort_order,
          updated_at: new Date().toISOString(),
          _optimistic: true,
        };
      })();
      if (optimistic) {
        qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
          sanitizeList(old).map((n) => (n.id === id ? optimistic : n)),
        );
      }
      return { previous };
    },
    onSuccess: (note, { id }, ctx) => {
      if (!note) {
        if (ctx?.previous) qc.setQueryData(quickNoteKeys.list(), ctx.previous);
        void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
        return;
      }
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        sanitizeList(old).map((n) => (n.id === id ? note : n)),
      );
      if (note._pendingSync) {
        showToast('success', 'Changes saved - will sync when online');
      } else {
        void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
      }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to update note'));
    },
  });
}

export function useDeleteQuickNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number, { previous?: QuickNoteWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const existing = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()) ?? [])
        .find((n) => n.id === id);
      if (existing?._pendingSync || id < 0) {
        const mutationId = await localQuickNotesStore.removeByNoteId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }
      if (shouldCompleteQuickNoteLocally()) {
        completeOfflineDeleteQuickNoteInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`/quick-notes/${id}`);
      } catch (err: unknown) {
        if (shouldCompleteQuickNoteLocally()) {
          completeOfflineDeleteQuickNoteInstant(id);
          return;
        }
        throw err;
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()));
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        sanitizeList(old).filter((n) => n.id !== id),
      );
      return { previous };
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        sanitizeList(old).filter((n) => n.id !== id),
      );
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete note'));
    },
  });
}

/** Persist a custom note order (drag-and-drop). Optimistic, rolled back on failure. */
export function useReorderQuickNotes() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number[], { previous?: QuickNoteWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (orderedIds) => {
      await axiosInstance.post('/quick-notes/reorder', { order: orderedIds });
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = sanitizeList(qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()));
      const indexById = new Map(orderedIds.map((id, i) => [id, i]));
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) => {
        const list = sanitizeList(old).map((n) => ({ ...n, sort_order: indexById.get(n.id) ?? n.sort_order }));
        return list.sort((a, b) => (a.is_pinned === b.is_pinned ? a.sort_order - b.sort_order : a.is_pinned ? -1 : 1));
      });
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to reorder notes'));
    },
  });
}

/** Immediate cache row for a create - replaced by the server note on success. */
function buildOptimisticNote(payload: QuickNotePayload): QuickNoteWithSyncMeta {
  const now = new Date().toISOString();
  return {
    id: -Date.now(),
    business_id: 0,
    user_id: 0,
    client_uuid: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title: payload.title ?? '',
    body: payload.body ?? null,
    color: payload.color ?? null,
    tag: payload.tag ?? null,
    is_shared: Boolean(payload.is_shared),
    is_pinned: Boolean(payload.is_pinned),
    sort_order: payload.sort_order ?? 0,
    created_at: now,
    updated_at: now,
    _optimistic: true,
  };
}

/** Manually retry a failed note mutation by re-enqueuing it onto the sync queue. */
export async function retryFailedQuickNoteMutation(mutationId: string): Promise<void> {
  const entry = (await mutationQueue.getAll()).find((m) => m.id === mutationId);
  if (!entry) return;
  await mutationQueue.requeue(mutationId).catch(() => undefined);
}

function sanitizeList(list: QuickNoteWithSyncMeta[] | undefined): QuickNoteWithSyncMeta[] {
  return (list ?? []).filter(Boolean);
}

/** Personal + business accounts (excludes storefront buyers). */
export function canUseQuickNotes(accountType: string | undefined | null): boolean {
  return accountType !== 'storefront_buyer';
}

/** Business accounts (owner + staff) may share notes; personal accounts may not. */
export function canShareQuickNotes(accountType: string | undefined | null): boolean {
  return accountType === 'business';
}
