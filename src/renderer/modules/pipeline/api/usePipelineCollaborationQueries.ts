import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineActivityReactions,
  PipelineBoardAnnouncement,
  PipelineBoardCollaborationSummary,
  PipelinePoll,
  PipelineReminder,
} from './pipelineTypes';
import { pipelineKeys } from './usePipelineQueries';
import { notificationKeys } from '../../notifications/api/NotificationQueries';

export const pipelineCollaborationKeys = {
  summary: (boardId: number) => [...pipelineKeys.all, 'collaboration-summary', boardId] as const,
  announcements: (boardId: number) => [...pipelineKeys.all, 'announcements', boardId] as const,
  polls: (boardId: number, leadId?: number) =>
    [...pipelineKeys.all, 'polls', boardId, leadId ?? 'board'] as const,
  reminders: (leadId: number) => [...pipelineKeys.all, 'reminders', leadId] as const,
};

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
    staleTime: 10_000,
    refetchInterval: 20_000,
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.announcements(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      showToast('success', 'Board notice sent to the team');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.announcements(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Notice removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.announcements(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
    },
  });
}

export function useBoardPolls(boardId: number, leadId?: number, enabled = true) {
  return useQuery({
    queryKey: pipelineCollaborationKeys.polls(boardId, leadId),
    queryFn: async () => {
      const params = leadId ? { lead_id: leadId } : undefined;
      const { data } = await axiosInstance.get(PIPELINE.BOARD_POLLS(boardId), { params });
      return normalizeList<PipelinePoll>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCreateBoardPoll(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      question: string;
      options: string[];
      lead_id?: number;
      closes_at?: string;
      results_visibility?: 'team' | 'creator_only';
    }) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_POLLS(boardId), payload);
      return (data as { data: PipelinePoll }).data;
    },
    onSuccess: (_poll, vars) => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId, vars.lead_id) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      showToast('success', 'Poll created — team notified');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create poll'));
    },
  });
}

export function useVotePoll(boardId: number, leadId?: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: number; optionId: number }) => {
      const { data } = await axiosInstance.post(PIPELINE.POLL_VOTE(pollId), { option_id: optionId });
      return (data as { data: PipelinePoll }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId, leadId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not submit vote'));
    },
  });
}

export function useRemovePollVote(boardId: number, leadId?: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ pollId, userId }: { pollId: number; userId?: number }) => {
      const { data } = await axiosInstance.delete(PIPELINE.POLL_VOTE(pollId), {
        data: userId ? { user_id: userId } : undefined,
      });
      return (data as { data: PipelinePoll }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId, leadId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Vote removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove vote'));
    },
  });
}

export function useDeleteBoardPoll(boardId: number, leadId?: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (pollId: number) => {
      await axiosInstance.delete(PIPELINE.POLL(pollId));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId, leadId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Poll removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove poll'));
    },
  });
}

export function useLeadReminders(leadId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineCollaborationKeys.reminders(leadId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.LEAD_REMINDERS(leadId));
      return normalizeList<PipelineReminder>(data);
    },
    enabled: enabled && leadId > 0,
  });
}

export function useCreateLeadReminder(leadId: number, boardId?: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      remind_at: string;
      message?: string;
      channel?: 'in_app' | 'email' | 'both';
      user_id?: number;
    }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_REMINDERS(leadId), payload);
      return (data as { data: PipelineReminder }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.reminders(leadId) });
      if (boardId) void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      showToast('success', 'Reminder scheduled');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not schedule reminder'));
    },
  });
}

export function useCancelLeadReminder(leadId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (reminderId: number) => {
      await axiosInstance.delete(PIPELINE.REMINDER(reminderId));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.reminders(leadId) });
      showToast('success', 'Reminder cancelled');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not cancel reminder'));
    },
  });
}

export function useToggleActivityReaction(leadId: number, boardId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      activityId,
      reaction,
    }: {
      activityId: number;
      reaction: 'like' | 'dislike' | null;
    }) => {
      const { data } = await axiosInstance.post(PIPELINE.ACTIVITY_REACTION(activityId), { reaction });
      return (data as { data: PipelineActivityReactions }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      if (boardId) void qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    },
  });
}
