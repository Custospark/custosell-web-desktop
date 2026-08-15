import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { QUICK_NOTES } from '../../../shared/api/endpoints/quickNotesEndpoints';
import { quickNoteKeys } from '../../../shared/utils/quickNoteKeys';
import type { QuickNoteWithSyncMeta } from './QuickNoteTypes';

/** Rename a tag across the user's notes. Optimistic, rolled back on failure. */
export function useRenameQuickNoteTag() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, { oldTag: string; newTag: string }, { previous?: QuickNoteWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ oldTag, newTag }) => {
      await axiosInstance.post(QUICK_NOTES.TAG_RENAME, { old_tag: oldTag, new_tag: newTag });
    },
    onMutate: async ({ oldTag, newTag }) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = (qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()) ?? []).filter(Boolean);
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        (old ?? []).filter(Boolean).map((n) => (n.tag === oldTag ? { ...n, tag: newTag } : n)),
      );
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      showToast('error', sanitizeErrorMessage(e, 'Failed to rename tag'));
    },
  });
}

/** Remove a tag from the user's notes. Optimistic, rolled back on failure. */
export function useRemoveQuickNoteTag() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, string, { previous?: QuickNoteWithSyncMeta[] }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (tag) => {
      await axiosInstance.post(QUICK_NOTES.TAG_REMOVE, { tag });
    },
    onMutate: async (tag) => {
      await qc.cancelQueries({ queryKey: quickNoteKeys.all });
      const previous = (qc.getQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list()) ?? []).filter(Boolean);
      qc.setQueryData<QuickNoteWithSyncMeta[]>(quickNoteKeys.list(), (old) =>
        (old ?? []).filter(Boolean).map((n) => (n.tag === tag ? { ...n, tag: null } : n)),
      );
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quickNoteKeys.all });
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(quickNoteKeys.list(), ctx.previous);
      showToast('error', sanitizeErrorMessage(e, 'Failed to remove tag'));
    },
  });
}
