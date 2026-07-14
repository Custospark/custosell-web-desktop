import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoardAnnouncement,
  PipelineBoardCollaborationSummary,
} from './pipelineTypes';
import {
  getOptimisticActor,
  nextOptimisticId,
  patchAnnouncementOptimistic,
  patchCollaborationSummary,
  prependAnnouncementOptimistic,
  removeAnnouncementOptimistic,
} from './pipelineOptimisticCache';
import { pipelineCollaborationKeys, PIPELINE_KANBAN_POLL_MS } from './pipelineQueryKeys';
import { notificationKeys } from '../../notifications/api/NotificationQueries';

export { pipelineCollaborationKeys } from './pipelineQueryKeys';
export {
  useBoardPolls,
  useCreateBoardPoll,
  useUpdateBoardPoll,
  useVotePoll,
  useRemovePollVote,
  useDeleteBoardPoll,
} from './usePipelinePollQueries';
export {
  useLeadReminders,
  useCreateLeadReminder,
  useCancelLeadReminder,
  useToggleActivityReaction,
} from './usePipelineReminderQueries';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export function useBoardCollaborationSummary(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineCollaborationKeys.summary(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_COLLABORATION_SUMMARY(boardId));
      return (data as { data: PipelineBoardCollaborationSummary }).data;
    },
    enabled: enabled && boardId > 0,
    staleTime: 30_000,
    refetchInterval: enabled && boardId > 0 ? PIPELINE_KANBAN_POLL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useBoardAnnouncements(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineCollaborationKeys.announcements(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_ANNOUNCEMENTS(boardId));
      return normalizeList<PipelineBoardAnnouncement>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCreateBoardAnnouncement(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { title: string; body: string; is_pinned?: boolean }) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_ANNOUNCEMENTS(boardId), payload);
      return (data as { data: PipelineBoardAnnouncement }).data;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineCollaborationKeys.announcements(boardId) });
      const previous = qc.getQueryData<PipelineBoardAnnouncement[]>(
        pipelineCollaborationKeys.announcements(boardId),
      );
      const actor = getOptimisticActor();
      const tempId = nextOptimisticId();
      prependAnnouncementOptimistic(qc, boardId, {
        id: tempId,
        board_id: boardId,
        title: payload.title,
        body: payload.body,
        is_pinned: payload.is_pinned ?? false,
        created_by: actor.id,
        creator: actor,
        created_at: new Date().toISOString(),
        is_read: true,
        can_delete: true,
      });
      return { previous, tempId };
    },
    onSuccess: (announcement, _vars, context) => {
      if (context?.tempId) {
        qc.setQueryData<PipelineBoardAnnouncement[]>(
          pipelineCollaborationKeys.announcements(boardId),
          (existing) =>
            (existing ?? []).map((item) => (item.id === context.tempId ? announcement : item)),
        );
      }
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      showToast('success', 'Board notice sent to the team');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.announcements(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not post notice'));
    },
  });
}

export function useDeleteBoardAnnouncement(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.ANNOUNCEMENT(id));
    },
    onMutate: async (id) => {
      const previous = qc.getQueryData<PipelineBoardAnnouncement[]>(
        pipelineCollaborationKeys.announcements(boardId),
      );
      removeAnnouncementOptimistic(qc, boardId, id);
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Notice removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.announcements(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not remove notice'));
    },
  });
}

export function useSetAnnouncementRead(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_read }: { id: number; is_read: boolean }) => {
      const { data } = await axiosInstance.patch(PIPELINE.ANNOUNCEMENT_READ(id), { is_read });
      return (data as { data: PipelineBoardAnnouncement }).data;
    },
    onMutate: async ({ id, is_read }) => {
      const previous = qc.getQueryData<PipelineBoardAnnouncement[]>(
        pipelineCollaborationKeys.announcements(boardId),
      );
      const summary = qc.getQueryData<PipelineBoardCollaborationSummary>(
        pipelineCollaborationKeys.summary(boardId),
      );
      patchAnnouncementOptimistic(qc, boardId, id, { is_read });
      if (summary) {
        const item = previous?.find((a) => a.id === id);
        const delta = is_read && item && !item.is_read ? -1 : !is_read && item?.is_read ? 1 : 0;
        if (delta !== 0) {
          patchCollaborationSummary(qc, boardId, {
            unread_announcements_count: Math.max(0, (summary.unread_announcements_count ?? 0) + delta),
          });
        }
      }
      return { previous, summary };
    },
    onSuccess: (announcement) => {
      patchAnnouncementOptimistic(qc, boardId, announcement.id, announcement);
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.announcements(boardId), context.previous);
      }
      if (context?.summary) {
        qc.setQueryData(pipelineCollaborationKeys.summary(boardId), context.summary);
      }
    },
  });
}
