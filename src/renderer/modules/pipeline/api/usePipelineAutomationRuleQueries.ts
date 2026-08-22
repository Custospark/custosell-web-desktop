import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineAutomationRule,
  PipelineAutomationRulePayload,
} from './pipelineAutomationRuleTypes';
import { pipelineAutomationRuleKeys } from './pipelineQueryKeys';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function normalizeItem<T>(payload: unknown): T | null {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return null;
}

let optimisticRuleId = -1;
function nextOptimisticRuleId(): number {
  optimisticRuleId -= 1;
  return optimisticRuleId;
}

/** True while the rule is only an optimistic placeholder (not yet persisted). */
export function isOptimisticRule(rule: Pick<PipelineAutomationRule, 'id'>): boolean {
  return rule.id < 0;
}

export function useBoardAutomationRules(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineAutomationRuleKeys.list(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_AUTOMATION_RULES(boardId));
      return normalizeList<PipelineAutomationRule>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 30_000,
  });
}

export function useCreateAutomationRule(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: PipelineAutomationRulePayload) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_AUTOMATION_RULES(boardId), payload);
      return normalizeItem<PipelineAutomationRule>(data);
    },
onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineAutomationRuleKeys.list(boardId) });
      const previous = qc.getQueryData<PipelineAutomationRule[]>(pipelineAutomationRuleKeys.list(boardId));
      const optimistic: PipelineAutomationRule = {
        id: nextOptimisticRuleId(),
        board_id: boardId,
        name: payload.name,
        trigger: payload.trigger,
        conditions: payload.conditions ?? null,
        actions: payload.actions,
        is_active: payload.is_active ?? true,
        run_count: 0,
        last_run_at: null,
        paused_at: null,
        created_by: 0,
        creator: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<PipelineAutomationRule[]>(
        pipelineAutomationRuleKeys.list(boardId),
        (existing) => [...(existing ?? []), optimistic],
      );
      return { previous, tempId: optimistic.id };
    },
    onSuccess: (rule, _payload, context) => {
      if (rule && context?.tempId != null) {
        qc.setQueryData<PipelineAutomationRule[]>(
          pipelineAutomationRuleKeys.list(boardId),
          (existing) => (existing ?? []).map((item) => (item.id === context.tempId ? rule : item)),
        );
      }
      showToast('success', 'Automation created');
    },
    onError: (err: AxiosError<{ message?: string }>, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineAutomationRuleKeys.list(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not create automation'));
    },
  });
}

export function useUpdateAutomationRule(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ ruleId, payload }: { ruleId: number; payload: PipelineAutomationRulePayload }) => {
      if (isOptimisticRule({ id: ruleId })) {
        return null;
      }
      const { data } = await axiosInstance.put(PIPELINE.AUTOMATION_RULE(ruleId), payload);
      return normalizeItem<PipelineAutomationRule>(data);
    },
    onMutate: async ({ ruleId, payload }) => {
      await qc.cancelQueries({ queryKey: pipelineAutomationRuleKeys.list(boardId) });
      const previous = qc.getQueryData<PipelineAutomationRule[]>(pipelineAutomationRuleKeys.list(boardId));
      qc.setQueryData<PipelineAutomationRule[]>(
        pipelineAutomationRuleKeys.list(boardId),
        (existing) => (existing ?? []).map((item) => {
          if (item.id !== ruleId) return item;
          return {
            ...item,
            name: payload.name,
            trigger: payload.trigger,
            conditions: payload.conditions ?? null,
            actions: payload.actions,
            is_active: payload.is_active ?? item.is_active,
            updated_at: new Date().toISOString(),
          };
        }),
      );
      return { previous };
    },
    onSuccess: (rule) => {
      if (rule) {
        qc.setQueryData<PipelineAutomationRule[]>(
          pipelineAutomationRuleKeys.list(boardId),
          (existing) => (existing ?? []).map((item) => (item.id === rule.id ? rule : item)),
        );
      }
      showToast('success', 'Automation updated');
    },
    onError: (err: AxiosError<{ message?: string }>, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineAutomationRuleKeys.list(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update automation'));
    },
  });
}

export function useToggleAutomationRule(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ ruleId, is_active }: { ruleId: number; is_active: boolean }) => {
      if (isOptimisticRule({ id: ruleId })) {
        return null;
      }
      const { data } = await axiosInstance.patch(PIPELINE.AUTOMATION_RULE_TOGGLE(ruleId), { is_active });
      return normalizeItem<PipelineAutomationRule>(data);
    },
    onMutate: async ({ ruleId, is_active }) => {
      await qc.cancelQueries({ queryKey: pipelineAutomationRuleKeys.list(boardId) });
      const previous = qc.getQueryData<PipelineAutomationRule[]>(pipelineAutomationRuleKeys.list(boardId));
      qc.setQueryData<PipelineAutomationRule[]>(
        pipelineAutomationRuleKeys.list(boardId),
        (existing) => (existing ?? []).map((item) =>
          item.id === ruleId
            ? { ...item, is_active, paused_at: is_active ? null : new Date().toISOString(), updated_at: new Date().toISOString() }
            : item,
        ),
      );
      return { previous };
    },
    onSuccess: (rule) => {
      if (rule) {
        qc.setQueryData<PipelineAutomationRule[]>(
          pipelineAutomationRuleKeys.list(boardId),
          (existing) => (existing ?? []).map((item) => (item.id === rule.id ? rule : item)),
        );
      }
      showToast('success', 'Automation updated');
    },
    onError: (err: AxiosError<{ message?: string }>, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineAutomationRuleKeys.list(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update automation'));
    },
  });
}

export function useDeleteAutomationRule(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (ruleId: number) => {
      if (isOptimisticRule({ id: ruleId })) {
        return;
      }
      await axiosInstance.delete(PIPELINE.AUTOMATION_RULE(ruleId));
    },
    onMutate: async (ruleId) => {
      await qc.cancelQueries({ queryKey: pipelineAutomationRuleKeys.list(boardId) });
      const previous = qc.getQueryData<PipelineAutomationRule[]>(pipelineAutomationRuleKeys.list(boardId));
      qc.setQueryData<PipelineAutomationRule[]>(
        pipelineAutomationRuleKeys.list(boardId),
        (existing) => (existing ?? []).filter((item) => item.id !== ruleId),
      );
      return { previous };
    },
    onSuccess: () => {
      showToast('success', 'Automation deleted');
    },
    onError: (err: AxiosError<{ message?: string }>, _ruleId, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineAutomationRuleKeys.list(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete automation'));
    },
  });
}