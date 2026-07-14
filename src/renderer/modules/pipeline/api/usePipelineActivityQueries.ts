import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoard,
  PipelineLead,
  PipelineLeadActivity,
} from './pipelineTypes';
import { updateLeadOnKanban } from './pipelineKanbanCache';
import { pipelineKeys } from './pipelineQueryKeys';
import {
  appendLeadActivitiesOptimistic,
  buildOptimisticComment,
  buildOptimisticSystemEntry,
  removeCommentWithHistoryOptimistic,
  patchLeadActivityOptimistic,
  replaceOptimisticActivity,
} from './pipelineOptimisticCache';
import { normalizeItem } from './pipelineQueryUtils';

export function useAddPipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      leadId,
      type,
      body,
      parentId,
    }: {
      leadId: number;
      type: string;
      body: string;
      boardId?: number;
      parentId?: number | null;
    }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_ACTIVITIES(leadId), {
        type,
        body,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      return normalizeItem<PipelineLeadActivity>(data);
    },
    onMutate: async ({
      leadId,
      type,
      body,
      parentId,
      boardId,
    }: {
      leadId: number;
      type: string;
      body: string;
      boardId?: number;
      parentId?: number | null;
    }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const tempId = nextOptimisticId();
      const optimistic = {
        ...buildOptimisticComment(
          leadId,
          type as PipelineLeadActivity['type'],
          body,
          parentId,
        ),
        id: tempId,
      };
      appendLeadActivitiesOptimistic(qc, leadId, boardId, [optimistic]);
      return { previousLead, tempId, boardId };
    },
    onSuccess: (activity, vars, context) => {
      if (context?.tempId) {
        replaceOptimisticActivity(qc, vars.leadId, context.tempId, activity);
      } else {
        applyLeadMutationToCache(qc, {
          ...(qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId)) ?? { id: vars.leadId } as PipelineLead),
          activities: [
            ...(qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId))?.activities ?? []),
            activity,
          ],
        }, vars.boardId);
      }
      if (vars.boardId) {
        qc.setQueryData(pipelineKeys.kanban(vars.boardId), (old) => {
          if (!old) return old;
          const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId));
          if (!lead) return old;
          return updateLeadOnKanban(old as PipelineBoard, vars.leadId, {
            comments_count: lead.comments_count,
          });
        });
      }
      showToast('success', vars.parentId ? 'Reply posted' : vars.type === 'comment' ? 'Comment posted' : 'Activity added');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(_vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not add activity'));
    },
  });
}


export function useDeletePipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      activityId,
    }: {
      activityId: number;
      leadId: number;
      boardId?: number;
    }) => {
      await axiosInstance.delete(PIPELINE.ACTIVITY(activityId));
    },
    onMutate: async ({
      activityId,
      leadId,
      boardId,
    }: {
      activityId: number;
      leadId: number;
      boardId?: number;
    }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      removeCommentWithHistoryOptimistic(qc, leadId, boardId, activityId);
      return { previousLead, boardId };
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(vars.leadId) });
      if (vars.boardId) {
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId));
        if (lead) {
          qc.setQueryData(pipelineKeys.kanban(vars.boardId), (old) =>
            old
              ? updateLeadOnKanban(old as PipelineBoard, vars.leadId, {
                  comments_count: lead.comments_count,
                  history_count: lead.history_count,
                })
              : old,
          );
        }
      }
      showToast('success', 'Comment deleted');
    },
    onError: (err, vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete comment'));
    },
  });
}


export function useUpdatePipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      activityId,
      body,
    }: {
      activityId: number;
      body: string;
      leadId: number;
      boardId?: number;
    }) => {
      const { data } = await axiosInstance.patch(PIPELINE.ACTIVITY(activityId), { body });
      return normalizeItem<PipelineLeadActivity>(data);
    },
    onMutate: async ({ activityId, body, leadId, boardId }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      patchLeadActivityOptimistic(qc, leadId, activityId, { body });
      appendLeadActivitiesOptimistic(qc, leadId, boardId, [
        buildOptimisticSystemEntry(leadId, 'Comment edited', {
          action: 'comment_edited',
          preview: body.slice(0, 120),
        }),
      ], { bumpComments: false });
      return { previousLead };
    },
    onSuccess: (activity, vars) => {
      patchLeadActivityOptimistic(qc, vars.leadId, activity.id, activity);
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(vars.leadId) });
      showToast('success', 'Comment updated');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(_vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update comment'));
    },
  });
}


