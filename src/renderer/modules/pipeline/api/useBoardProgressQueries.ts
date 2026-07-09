import { keepPreviousData, replaceEqualDeep, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { ApiError } from '../../../shared/api/account/AccountTypes';
import type {
  BoardProgressSummary,
  BoardTarget,
  CreateBoardTargetPayload,
  DecomposePreviewPayload,
  DecompositionPreview,
  MyProgressSummary,
  ProgressChartConfig,
} from './boardProgressTypes';
import { pipelineProgressKeys, PIPELINE_PROGRESS_POLL_MS } from './pipelineQueryKeys';
import type { ProgressPeriod } from './pipelineProgressTerms';
import {
  readCachedMyProgress,
  readCachedTeamProgress,
  writeCachedMyProgress,
  writeCachedTeamProgress,
} from './progressDisplayCache';

const progressQueryDefaults = {
  staleTime: PIPELINE_PROGRESS_POLL_MS,
  gcTime: 10 * 60_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
};

function progressStructuralSharing<T>(oldData: T | undefined, newData: T): T {
  if (!oldData || !newData) return newData;
  return replaceEqualDeep(oldData, newData) as T;
}

function normalizeProgressSummary(data: unknown): BoardProgressSummary {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: BoardProgressSummary }).data;
  }
  return data as BoardProgressSummary;
}

function normalizeTargets(data: unknown): BoardTarget[] {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: BoardTarget[] }).data;
  }
  return data as BoardTarget[];
}

function normalizeItem<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function sortedStageKey(stageIds?: number[]): string {
  if (!stageIds?.length) return '';
  return [...stageIds].sort((a, b) => a - b).join(',');
}

export function useBoardProgressSummary(
  boardId: number,
  period: ProgressPeriod,
  options?: {
    from?: string;
    to?: string;
    stageIds?: number[];
    enabled?: boolean;
    poll?: boolean;
  },
) {
  const enabled = options?.enabled ?? boardId > 0;
  const params = new URLSearchParams({ period });
  if (period === 'custom' && options?.from) params.set('from', options.from);
  if (period === 'custom' && options?.to) params.set('to', options.to);
  (options?.stageIds ?? []).forEach((id) => params.append('stage_ids[]', String(id)));
  const stageKey = sortedStageKey(options?.stageIds);

  return useQuery<BoardProgressSummary>({
    queryKey: pipelineProgressKeys.summary(
      boardId,
      period,
      options?.from,
      options?.to,
      stageKey,
    ),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.BOARD_PROGRESS_SUMMARY(boardId)}?${params}`);
      const summary = normalizeProgressSummary(data);
      writeCachedTeamProgress(boardId, summary);
      return summary;
    },
    enabled,
    placeholderData: keepPreviousData,
    structuralSharing: progressStructuralSharing,
    refetchInterval: options?.poll && enabled ? PIPELINE_PROGRESS_POLL_MS : false,
    refetchIntervalInBackground: true,
    notifyOnChangeProps: ['data', 'error'],
    ...progressQueryDefaults,
  });
}

/** Team progress with session cache — UI never blanks while filters refetch in the background. */
export function useBoardProgressSummaryDisplay(
  boardId: number,
  period: ProgressPeriod,
  options?: {
    from?: string;
    to?: string;
    stageIds?: number[];
    enabled?: boolean;
    poll?: boolean;
  },
) {
  const query = useBoardProgressSummary(boardId, period, options);
  const displaySummary = query.data ?? readCachedTeamProgress(boardId);

  return {
    ...query,
    displaySummary,
    isBackgroundLoading: query.isFetching && Boolean(displaySummary),
  };
}

export function useMyBoardProgress(
  boardId: number,
  period: ProgressPeriod,
  options?: { enabled?: boolean; poll?: boolean },
) {
  const enabled = (options?.enabled ?? true) && boardId > 0;

  return useQuery<MyProgressSummary>({
    queryKey: [...pipelineProgressKeys.summaryBoard(boardId), 'my', period],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.BOARD_PROGRESS_MY(boardId)}?period=${period}`);
      const summary = normalizeItem<MyProgressSummary>(data);
      writeCachedMyProgress(boardId, summary);
      return summary;
    },
    enabled,
    placeholderData: keepPreviousData,
    structuralSharing: progressStructuralSharing,
    refetchInterval: options?.poll && enabled ? PIPELINE_PROGRESS_POLL_MS : false,
    refetchIntervalInBackground: true,
    notifyOnChangeProps: ['data', 'error'],
    ...progressQueryDefaults,
  });
}

export function useMyBoardProgressDisplay(
  boardId: number,
  period: ProgressPeriod,
  options?: { enabled?: boolean; poll?: boolean },
) {
  const query = useMyBoardProgress(boardId, period, options);
  const displayData = query.data ?? readCachedMyProgress(boardId);

  return {
    ...query,
    displayData,
    isBackgroundLoading: query.isFetching && Boolean(displayData),
  };
}

export function useBoardProgressConfig(boardId: number, enabled = true) {
  return useQuery<ProgressChartConfig>({
    queryKey: pipelineProgressKeys.config(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_PROGRESS_CONFIG(boardId));
      return normalizeItem<ProgressChartConfig>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 60_000,
  });
}

export function useSaveBoardProgressConfig(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<ProgressChartConfig, AxiosError<ApiError>, ProgressChartConfig>({
    mutationFn: async (config) => {
      const { data } = await axiosInstance.put(PIPELINE.BOARD_PROGRESS_CONFIG(boardId), config);
      return normalizeItem<ProgressChartConfig>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.config(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.summaryBoard(boardId) });
      showToast('success', 'Chart layout saved');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not save chart layout')),
  });
}

export function useDecomposeTargetPreview(boardId: number) {
  return useMutation<DecompositionPreview, AxiosError<ApiError>, DecomposePreviewPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_TARGETS_DECOMPOSE_PREVIEW(boardId), payload);
      return normalizeItem<DecompositionPreview>(data);
    },
  });
}

export function useBoardTargets(boardId: number, enabled = true) {
  return useQuery<BoardTarget[]>({
    queryKey: pipelineProgressKeys.targets(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_TARGETS(boardId));
      return normalizeTargets(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 30_000,
  });
}

export function useCreateBoardTarget(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<BoardTarget, AxiosError<ApiError>, CreateBoardTargetPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_TARGETS(boardId), payload);
      if (data && typeof data === 'object' && 'data' in data) {
        return (data as { data: BoardTarget }).data;
      }
      return data as BoardTarget;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.targets(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.summaryBoard(boardId) });
      showToast('success', 'Target saved');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not save target')),
  });
}

export function useUpdateBoardTarget(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<BoardTarget, AxiosError<ApiError>, { id: number; data: Partial<CreateBoardTargetPayload> }>({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await axiosInstance.patch(PIPELINE.BOARD_TARGET(id), data);
      return (response && typeof response === 'object' && 'data' in response
        ? (response as { data: BoardTarget }).data
        : response) as BoardTarget;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.targets(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.summaryBoard(boardId) });
      showToast('success', 'Target updated');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not update target')),
  });
}

export function useArchiveBoardTarget(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, AxiosError<ApiError>, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(PIPELINE.BOARD_TARGET(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.targets(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineProgressKeys.summaryBoard(boardId) });
      showToast('success', 'Target archived');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not archive target')),
  });
}

export function useExportBoardProgress(boardId: number) {
  const { showToast } = useToast();

  return useMutation<
    BoardProgressSummary,
    AxiosError<ApiError>,
    { period: ProgressPeriod; from?: string; to?: string; stageIds?: number[] }
  >({
    mutationFn: async ({ period, from, to, stageIds }) => {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      (stageIds ?? []).forEach((id) => params.append('stage_ids[]', String(id)));
      const { data } = await axiosInstance.get(`${PIPELINE.BOARD_PROGRESS_EXPORT(boardId)}?${params}`);
      return normalizeProgressSummary(data);
    },
    onSuccess: (summary) => {
      const jsonBlob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonAnchor = document.createElement('a');
      jsonAnchor.href = jsonUrl;
      jsonAnchor.download = `board-${boardId}-progress.json`;
      jsonAnchor.click();
      URL.revokeObjectURL(jsonUrl);

      const csvRows: string[] = [];
      csvRows.push('section,key,value');
      Object.entries(summary.team ?? {}).forEach(([key, value]) => {
        csvRows.push(`team,${key},${value}`);
      });
      (summary.targets ?? []).forEach((target) => {
        csvRows.push(`target,${target.title},${target.progress_percent}%`);
        (target.allocations ?? []).forEach((alloc) => {
          csvRows.push(
            `allocation,${target.title} ${alloc.planning_level} ${alloc.period_start},expected=${alloc.expected_value} actual=${alloc.actual_value ?? 0}`,
          );
        });
      });
      (summary.column_metrics ?? []).forEach((row) => {
        csvRows.push(`column,${row.stage_name} throughput,${row.metrics.throughput ?? 0}`);
      });

      const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvAnchor = document.createElement('a');
      csvAnchor.href = csvUrl;
      csvAnchor.download = `board-${boardId}-progress.csv`;
      csvAnchor.click();
      URL.revokeObjectURL(csvUrl);

      showToast('success', 'Progress JSON and CSV downloaded');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not export progress')),
  });
}
