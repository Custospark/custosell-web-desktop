import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
} from './boardProgressTypes';
import { pipelineProgressKeys, PIPELINE_PROGRESS_POLL_MS } from './pipelineQueryKeys';
import type { ProgressPeriod } from './pipelineProgressTerms';

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

export function useBoardProgressSummary(
  boardId: number,
  period: ProgressPeriod,
  options?: { from?: string; to?: string; enabled?: boolean; poll?: boolean },
) {
  const enabled = options?.enabled ?? boardId > 0;
  const params = new URLSearchParams({ period });
  if (period === 'custom' && options?.from) params.set('from', options.from);
  if (period === 'custom' && options?.to) params.set('to', options.to);

  return useQuery<BoardProgressSummary>({
    queryKey: pipelineProgressKeys.summary(boardId, period, options?.from, options?.to),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.BOARD_PROGRESS_SUMMARY(boardId)}?${params}`);
      return normalizeProgressSummary(data);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: options?.poll && enabled ? PIPELINE_PROGRESS_POLL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
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

  return useMutation<BoardProgressSummary, AxiosError<ApiError>, { period: ProgressPeriod; from?: string; to?: string }>({
    mutationFn: async ({ period, from, to }) => {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await axiosInstance.get(`${PIPELINE.BOARD_PROGRESS_EXPORT(boardId)}?${params}`);
      return normalizeProgressSummary(data);
    },
    onSuccess: (summary) => {
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `board-${boardId}-progress.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Progress report downloaded');
    },
    onError: (err) => showToast('error', sanitizeErrorMessage(err, 'Could not export progress')),
  });
}
