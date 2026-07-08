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
import {
  applyPollToCache,
  appendLeadActivitiesOptimistic,
  buildOptimisticReactionEntry,
  getOptimisticActor,
  nextOptimisticId,
  patchActivityReactionOptimistic,
  patchAnnouncementOptimistic,
  patchCollaborationSummary,
  prependAnnouncementOptimistic,
  prependPollOptimistic,
  prependReminderOptimistic,
  removeAnnouncementOptimistic,
  removePollOptimistic,
  removeReminderOptimistic,
} from './pipelineOptimisticCache';
import { pipelineCollaborationKeys, pipelineKeys } from './pipelineQueryKeys';
import { notificationKeys } from '../../notifications/api/NotificationQueries';

export { pipelineCollaborationKeys } from './pipelineQueryKeys';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function patchAllPollCaches(
  qc: ReturnType<typeof useQueryClient>,
  boardId: number,
  leadId: number | undefined,
  updater: (polls: PipelinePoll[]) => PipelinePoll[],
): void {
  for (const key of [
    pipelineCollaborationKeys.polls(boardId),
    pipelineCollaborationKeys.polls(boardId, leadId),
  ]) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) => updater(existing ?? []));
  }
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
    refetchInterval: enabled && boardId > 0 ? 45_000 : false,
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
    onMutate: async (payload) => {
      const actor = getOptimisticActor();
      const tempPollId = nextOptimisticId();
      const optimisticPoll: PipelinePoll = {
        id: tempPollId,
        board_id: boardId,
        lead_id: payload.lead_id ?? null,
        question: payload.question,
        allow_multiple: false,
        results_visibility: payload.results_visibility ?? 'team',
        created_by: actor.id,
        creator: actor,
        created_at: new Date().toISOString(),
        options: payload.options.map((label, index) => ({
          id: nextOptimisticId() - index,
          poll_id: tempPollId,
          label,
          sort_order: index,
          votes_count: 0,
        })),
        votes: [],
        total_votes: 0,
        user_has_voted: false,
        can_see_results: true,
        can_manage_poll: true,
      };
      prependPollOptimistic(qc, boardId, optimisticPoll, payload.lead_id);
      return { tempPollId };
    },
    onSuccess: (poll, vars, context) => {
      if (context?.tempPollId) {
        patchAllPollCaches(qc, boardId, vars.lead_id, (polls) =>
          polls.map((item) => (item.id === context.tempPollId ? poll : item)),
        );
      }
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      showToast('success', 'Poll created — team notified');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.polls(boardId) });
      showToast('error', sanitizeErrorMessage(err, 'Could not create poll'));
    },
  });
}

export function useUpdateBoardPoll(boardId: number, leadId?: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      pollId: number;
      question?: string;
      options?: { id?: number; label: string }[];
      closes_at?: string | null;
      results_visibility?: 'team' | 'creator_only';
    }) => {
      const { pollId, ...body } = payload;
      const { data } = await axiosInstance.patch(PIPELINE.POLL(pollId), body);
      return (data as { data: PipelinePoll }).data;
    },
    onSuccess: (poll) => {
      applyPollToCache(qc, boardId, poll, leadId);
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Poll updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update poll'));
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
    onMutate: async ({ pollId, optionId }) => {
      const previous = qc.getQueryData<PipelinePoll[]>(pipelineCollaborationKeys.polls(boardId));
      const summary = qc.getQueryData<PipelineBoardCollaborationSummary>(
        pipelineCollaborationKeys.summary(boardId),
      );
      const actor = getOptimisticActor();
      patchAllPollCaches(qc, boardId, leadId, (polls) =>
        polls.map((poll) => {
          if (poll.id !== pollId) return poll;
          const options = [...(poll.options ?? [])]
            .map((option) =>
              option.id === optionId
                ? { ...option, votes_count: (option.votes_count ?? 0) + 1 }
                : option,
            )
            .sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0));
          return {
            ...poll,
            options,
            user_has_voted: true,
            can_remove_own_vote: true,
            total_votes: (poll.total_votes ?? poll.votes?.length ?? 0) + 1,
            votes: [
              ...(poll.votes ?? []),
              {
                id: nextOptimisticId(),
                poll_id: pollId,
                option_id: optionId,
                user_id: actor.id,
              },
            ],
          };
        }),
      );
      if (summary && !previous?.find((p) => p.id === pollId)?.user_has_voted) {
        patchCollaborationSummary(qc, boardId, {
          polls_pending_vote_count: Math.max(0, (summary.polls_pending_vote_count ?? 0) - 1),
        });
      }
      return { previous, summary };
    },
    onSuccess: (poll) => {
      applyPollToCache(qc, boardId, poll, leadId);
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.polls(boardId), context.previous);
      }
      if (context?.summary) {
        qc.setQueryData(pipelineCollaborationKeys.summary(boardId), context.summary);
      }
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
    onMutate: async ({ pollId, userId }) => {
      const actor = getOptimisticActor();
      const targetUserId = userId ?? actor.id;
      const previous = qc.getQueryData<PipelinePoll[]>(pipelineCollaborationKeys.polls(boardId));
      patchAllPollCaches(qc, boardId, leadId, (polls) =>
        polls.map((poll) => {
          if (poll.id !== pollId) return poll;
          const vote = (poll.votes ?? []).find((v) => v.user_id === targetUserId);
          if (!vote) return poll;
          const options = [...(poll.options ?? [])]
            .map((option) =>
              option.id === vote.option_id
                ? { ...option, votes_count: Math.max(0, (option.votes_count ?? 1) - 1) }
                : option,
            )
            .sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0));
          const isSelf = targetUserId === actor.id;
          return {
            ...poll,
            options,
            votes: (poll.votes ?? []).filter((v) => v.user_id !== targetUserId),
            total_votes: Math.max(0, (poll.total_votes ?? 1) - 1),
            user_has_voted: isSelf ? false : poll.user_has_voted,
            can_remove_own_vote: isSelf ? false : poll.can_remove_own_vote,
          };
        }),
      );
      return { previous };
    },
    onSuccess: (poll) => {
      applyPollToCache(qc, boardId, poll, leadId);
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Vote removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.polls(boardId), context.previous);
      }
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
    onMutate: async (pollId) => {
      const previous = qc.getQueryData<PipelinePoll[]>(pipelineCollaborationKeys.polls(boardId));
      removePollOptimistic(qc, boardId, pollId, leadId);
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.summary(boardId) });
      showToast('success', 'Poll removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _pollId, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.polls(boardId), context.previous);
      }
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
    onMutate: async (payload) => {
      const actor = getOptimisticActor();
      const tempId = nextOptimisticId();
      prependReminderOptimistic(qc, leadId, {
        id: tempId,
        lead_id: leadId,
        user_id: payload.user_id ?? actor.id,
        remind_at: payload.remind_at,
        message: payload.message ?? null,
        channel: payload.channel ?? 'in_app',
      });
      return { tempId };
    },
    onSuccess: (reminder, _vars, context) => {
      if (context?.tempId) {
        qc.setQueryData<PipelineReminder[]>(
          pipelineCollaborationKeys.reminders(leadId),
          (existing) => (existing ?? []).map((item) => (item.id === context.tempId ? reminder : item)),
        );
      }
      if (boardId) void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      showToast('success', 'Reminder scheduled');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      void qc.invalidateQueries({ queryKey: pipelineCollaborationKeys.reminders(leadId) });
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
    onMutate: async (reminderId) => {
      const previous = qc.getQueryData<PipelineReminder[]>(pipelineCollaborationKeys.reminders(leadId));
      removeReminderOptimistic(qc, leadId, reminderId);
      return { previous };
    },
    onSuccess: () => {
      showToast('success', 'Reminder cancelled');
    },
    onError: (err: AxiosError<{ message?: string }>, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineCollaborationKeys.reminders(leadId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not cancel reminder'));
    },
  });
}

export function useToggleActivityReaction(leadId: number) {
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
    onMutate: async ({ activityId, reaction }) => {
      const previousLead = qc.getQueryData<import('./pipelineTypes').PipelineLead>(pipelineKeys.lead(leadId));
      const activity = previousLead?.activities?.find((a) => a.id === activityId);
      const previous = activity?.reactions;
      const likes = previous?.likes ?? 0;
      const dislikes = previous?.dislikes ?? 0;
      const prevReaction = previous?.user_reaction ?? null;
      let nextLikes = likes;
      let nextDislikes = dislikes;
      if (prevReaction === 'like') nextLikes -= 1;
      if (prevReaction === 'dislike') nextDislikes -= 1;
      if (reaction === 'like') nextLikes += 1;
      if (reaction === 'dislike') nextDislikes += 1;
      patchActivityReactionOptimistic(qc, leadId, activityId, {
        likes: Math.max(0, nextLikes),
        dislikes: Math.max(0, nextDislikes),
        user_reaction: reaction,
      });

      let historyEntry = null;
      if (reaction && reaction !== prevReaction) {
        historyEntry = buildOptimisticReactionEntry(
          leadId,
          reaction,
          activity?.body?.slice(0, 120),
          activityId,
        );
      } else if (!reaction && prevReaction) {
        historyEntry = buildOptimisticReactionEntry(
          leadId,
          null,
          activity?.body?.slice(0, 120),
          activityId,
        );
      }
      if (historyEntry) {
        appendLeadActivitiesOptimistic(qc, leadId, previousLead?.board_id, [historyEntry], {
          bumpComments: false,
        });
      }

      return { previous, activityId, previousLead, historyEntryId: historyEntry?.id };
    },
    onSuccess: (reactions, { activityId }) => {
      patchActivityReactionOptimistic(qc, leadId, activityId, reactions);
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
    },
    onError: (_err, { activityId }, context) => {
      if (context?.previous) {
        patchActivityReactionOptimistic(qc, leadId, activityId, context.previous);
      }
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      }
    },
  });
}
