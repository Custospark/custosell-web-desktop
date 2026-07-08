import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { PipelineBoardAutomation } from './pipelineTypes';
import { pipelineConversationKeys } from './pipelineQueryKeys';
import type { StageAutomationDraft } from '../ui/pipelineAutomationPresets';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export function useBoardAutomations(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineConversationKeys.automations(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_AUTOMATIONS(boardId));
      return normalizeList<PipelineBoardAutomation>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 30_000,
  });
}

export function useSyncBoardAutomations(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (rules: StageAutomationDraft[]) => {
      const { data } = await axiosInstance.put(PIPELINE.BOARD_AUTOMATIONS(boardId), { rules });
      return normalizeList<PipelineBoardAutomation>(data);
    },
    onSuccess: (automations) => {
      qc.setQueryData(pipelineConversationKeys.automations(boardId), automations);
      showToast('success', 'Conversation alerts saved');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not save conversation alerts'));
    },
  });
}
