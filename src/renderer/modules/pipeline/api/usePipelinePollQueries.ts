import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoardCollaborationSummary,
  PipelinePoll,
} from './pipelineTypes';
import {
  applyPollToCache,
  getOptimisticActor,
  nextOptimisticId,
  patchCollaborationSummary,
  prependPollOptimistic,
  removePollOptimistic,
} from './pipelineOptimisticCache';
import { pipelineCollaborationKeys } from './pipelineQueryKeys';
import { notificationKeys } from '../../notifications/api/NotificationQueries';

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
      showToast('success', 'Poll created - team notified');
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

