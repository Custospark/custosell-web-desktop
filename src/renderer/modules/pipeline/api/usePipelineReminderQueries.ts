import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineActivityReactions,
  PipelineReminder,
} from './pipelineTypes';
import {
  appendLeadActivitiesOptimistic,
  buildOptimisticReactionEntry,
  getOptimisticActor,
  nextOptimisticId,
  patchActivityReactionOptimistic,
  prependReminderOptimistic,
  removeReminderOptimistic,
} from './pipelineOptimisticCache';
import { pipelineCollaborationKeys, pipelineKeys } from './pipelineQueryKeys';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
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
