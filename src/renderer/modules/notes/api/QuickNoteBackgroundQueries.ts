import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { store } from '../../../app/store/store';
import { setUser } from '../../../app/store/slices/authSlice';
import { QUICK_NOTES } from '../../../shared/api/endpoints/quickNotesEndpoints';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { NotesBackground } from '../notesBackground';

/** Persist the per-user notes-page background preference and update auth state. */
export function useSaveNotesBackground() {
  const { showToast } = useToast();
  return useMutation<Record<string, unknown>, AxiosError, NotesBackground>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (bg) => {
      const { data } = await axiosInstance.post<{ data: { preferences: Record<string, unknown> } }>(
        QUICK_NOTES.BACKGROUND,
        { type: bg.type, value: bg.value ?? null },
      );
      return data.data.preferences;
    },
    onSuccess: (preferences) => {
      const current = store.getState().auth.user;
      if (current) {
        store.dispatch(setUser({ ...current, preferences }));
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to save background'));
    },
  });
}
