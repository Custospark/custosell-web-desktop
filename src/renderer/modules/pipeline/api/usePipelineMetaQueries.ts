import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoard,
  PipelineCalendarDay,
  PipelineCalendarDateField,
  PipelineInsightsSummary,
  PipelineLabel,
  PipelineSource,
  PipelineStage,
} from './pipelineTypes';
import {
  addStageToKanban,
  removeStageFromKanban,
  reorderStagesOnKanban,
  updateStageOnKanban,
} from './pipelineKanbanCache';
import { pipelineKeys } from './pipelineQueryKeys';
import {
  listQueryDefaults,
  normalizeItem,
  normalizeList,
} from './pipelineQueryUtils';

export function useUpdatePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ stageId, ...payload }: Partial<PipelineStage> & { stageId: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.STAGE(stageId), payload);
      return normalizeItem<PipelineStage>(data);
    },
    onMutate: async ({ stageId, ...payload }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), updateStageOnKanban(previousKanban, stageId, payload));
      }
      return { previousKanban, boardId };
    },
    onSuccess: (stage) => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) =>
        old ? updateStageOnKanban(old as PipelineBoard, stage.id, stage) : old,
      );
      showToast('success', 'Stage updated');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update stage'));
    },
  });
}

export function useCreatePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.STAGES(boardId), payload);
      return normalizeItem<PipelineStage>(data);
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      const tempId = -Date.now();
      const optimisticStage: PipelineStage = {
        id: tempId,
        board_id: boardId,
        name: payload.name,
        sort_order: previousKanban?.stages?.length ?? 0,
        color: payload.color ?? '#64748b',
        is_won: false,
        is_lost: false,
        rotting_days: null,
        leads: [],
      };
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), addStageToKanban(previousKanban, optimisticStage));
      }
      return { previousKanban, boardId, tempId };
    },
    onSuccess: (stage, _vars, context) => {
      qc.setQueryData<PipelineBoard>(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const withoutTemp = (old.stages ?? []).filter((s) => s.id !== context?.tempId);
        return addStageToKanban({ ...old, stages: withoutTemp }, stage);
      });
      showToast('success', 'Column added');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not add column'));
    },
  });
}

export function useDeletePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ stageId, migrate_to_stage_id }: { stageId: number; migrate_to_stage_id?: number }) => {
      await axiosInstance.delete(PIPELINE.STAGE(stageId), {
        data: migrate_to_stage_id ? { migrate_to_stage_id } : undefined,
      });
      return stageId;
    },
    onMutate: async ({ stageId }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), removeStageFromKanban(previousKanban, stageId));
      }
      return { previousKanban, boardId };
    },
    onSuccess: () => {
      showToast('success', 'Column deleted');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete column'));
    },
  });
}

export function useReorderPipelineStages(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (stageIds: number[]) => {
      const { data } = await axiosInstance.post(PIPELINE.STAGES_REORDER(boardId), { stage_ids: stageIds });
      return normalizeList<PipelineStage>(data);
    },
    onMutate: async (stageIds) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), reorderStagesOnKanban(previousKanban, stageIds));
      }
      return { previousKanban, boardId };
    },
    onSuccess: (stages) => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const stageIds = stages.map((s) => s.id);
        return reorderStagesOnKanban(old as PipelineBoard, stageIds);
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not reorder columns'));
    },
  });
}

export function usePipelineCalendar(
  boardId: number,
  year: number,
  month: number,
  dateField: PipelineCalendarDateField = 'due',
) {
  return useQuery<PipelineCalendarDay[]>({
    queryKey: pipelineKeys.calendar(boardId, year, month, dateField),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${PIPELINE.BOARD_CALENDAR(boardId)}?year=${year}&month=${month}&date_field=${dateField}`,
      );
      return normalizeList<PipelineCalendarDay>(data);
    },
    enabled: Boolean(boardId),
    ...listQueryDefaults,
  });
}

export function useAllBoardsCalendar(
  year: number,
  month: number,
  workspace: 'pipeline' | 'estimates',
  dateField: PipelineCalendarDateField = 'due',
) {
  return useQuery<PipelineCalendarDay[]>({
    queryKey: [...pipelineKeys.all, 'calendar', 'all', workspace, year, month, dateField],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${PIPELINE.ALL_BOARDS_CALENDAR}?year=${year}&month=${month}&date_field=${dateField}&workspace=${workspace}`,
      );
      return normalizeList<PipelineCalendarDay>(data);
    },
    ...listQueryDefaults,
  });
}

export function useCreatePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.SOURCES, payload);
      return normalizeItem<PipelineSource>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add source'));
    },
  });
}

export function useUpdatePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string }) => {
      const { data } = await axiosInstance.patch(PIPELINE.SOURCE(id), payload);
      return normalizeItem<PipelineSource>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update source'));
    },
  });
}

export function useDeletePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.SOURCE(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete source'));
    },
  });
}

export function usePipelineLabels(boardId?: number) {
  const params = boardId ? `?board_id=${boardId}` : '';
  return useQuery<PipelineLabel[]>({
    queryKey: pipelineKeys.labels(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.LABELS}${params}`);
      return normalizeList<PipelineLabel>(data);
    },
    enabled: Boolean(boardId),
    ...listQueryDefaults,
  });
}

export function useCreatePipelineLabel(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.LABELS, { ...payload, board_id: boardId });
      return normalizeItem<PipelineLabel>(data);
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.labels(boardId) });
      const previous = qc.getQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId));
      const tempId = -Date.now();
      const optimistic: PipelineLabel = {
        id: tempId,
        business_id: 0,
        board_id: boardId,
        name: payload.name,
        color: payload.color ?? '#6366f1',
        sort_order: previous?.length ?? 0,
      };
      qc.setQueryData(pipelineKeys.labels(boardId), [...(previous ?? []), optimistic]);
      return { previous, tempId };
    },
    onSuccess: (label, _vars, context) => {
      qc.setQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId), (old) => {
        if (!old) return [label];
        const withoutTemp = old.filter((l) => l.id !== context?.tempId);
        return [...withoutTemp, label];
      });
      showToast('success', 'Label created');
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineKeys.labels(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not create label'));
    },
  });
}

export function useUpdatePipelineLabel(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; color?: string }) => {
      const { data } = await axiosInstance.patch(PIPELINE.LABEL(id), payload);
      return normalizeItem<PipelineLabel>(data);
    },
    onMutate: async ({ id, ...payload }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.labels(boardId) });
      const previous = qc.getQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId));
      if (previous) {
        qc.setQueryData(
          pipelineKeys.labels(boardId),
          previous.map((l) => (l.id === id ? { ...l, ...payload } : l)),
        );
      }
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.labels(boardId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Label updated');
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineKeys.labels(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update label'));
    },
  });
}

export function useDeletePipelineLabel(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.LABEL(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.labels(boardId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Label deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete label'));
    },
  });
}

export function usePipelineSources() {
  return useQuery<PipelineSource[]>({
    queryKey: pipelineKeys.sources(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.SOURCES);
      return normalizeList<PipelineSource>(data);
    },
    ...listQueryDefaults,
  });
}

export function usePipelineInsights(boardId?: number) {
  const params = boardId ? `?board_id=${boardId}` : '';
  return useQuery<PipelineInsightsSummary>({
    queryKey: pipelineKeys.insights(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.INSIGHTS}${params}`);
      return normalizeItem<PipelineInsightsSummary>(data);
    },
    ...listQueryDefaults,
  });
}

