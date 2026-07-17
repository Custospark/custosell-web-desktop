import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoardMetaField,
  PipelineLeadLink,
  PipelineLeadMetaValue,
} from './pipelineTypes';
import {
  pipelineKeys,
  PIPELINE_KANBAN_POLL_MS,
  PIPELINE_BOARD_ACCESS_POLL_MS,
  PIPELINE_LEAD_POLL_MS,
} from './pipelineQueryKeys';
import {
  listQueryDefaults,
  normalizeItem,
  normalizeList,
} from './pipelineQueryUtils';

export function usePipelineLeadLinks(leadId: number) {
  return useQuery<PipelineLeadLink[]>({
    queryKey: pipelineKeys.links(leadId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.LEAD_LINKS(leadId));
      return normalizeList<PipelineLeadLink>(data);
    },
    enabled: Boolean(leadId),
    ...listQueryDefaults,
  });
}

export function useCreatePipelineLeadLink() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { lead_id: number; linked_lead_id?: number; linked_board_id?: number; label?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_LINKS(payload.lead_id), payload);
      return normalizeItem<PipelineLeadLink>(data);
    },
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.links(link.lead_id) });
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(link.lead_id) });
      showToast('success', 'Link added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add link'));
    },
  });
}

export function useDeletePipelineLeadLink() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: number; lead_id: number }) => {
      await axiosInstance.delete(PIPELINE.LINK(id));
    },
    onSuccess: (_data, { lead_id }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.links(lead_id) });
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(lead_id) });
      showToast('success', 'Link removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove link'));
    },
  });
}

export function usePipelineBoardMetaFields(boardId: number) {
  return useQuery<PipelineBoardMetaField[]>({
    queryKey: pipelineKeys.metaFields(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_META_FIELDS(boardId));
      return normalizeList<PipelineBoardMetaField>(data);
    },
    enabled: Boolean(boardId),
    ...listQueryDefaults,
  });
}

export function useCreatePipelineBoardMetaField(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; options?: string[]; required?: boolean }) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_META_FIELDS(boardId), payload);
      return normalizeItem<PipelineBoardMetaField>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.metaFields(boardId) });
      showToast('success', 'Meta field created');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create meta field'));
    },
  });
}

export function useUpdatePipelineBoardMetaField(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; type?: string; options?: string[]; required?: boolean; sort_order?: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.META_FIELD(id), payload);
      return normalizeItem<PipelineBoardMetaField>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.metaFields(boardId) });
      showToast('success', 'Meta field updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update meta field'));
    },
  });
}

export function useDeletePipelineBoardMetaField(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.META_FIELD(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.metaFields(boardId) });
      showToast('success', 'Meta field deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete meta field'));
    },
  });
}

export function usePipelineLeadMetaValues(leadId: number) {
  return useQuery<PipelineLeadMetaValue[]>({
    queryKey: pipelineKeys.leadMetaValues(leadId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.LEAD_META_VALUES(leadId));
      return normalizeList<PipelineLeadMetaValue>(data);
    },
    enabled: Boolean(leadId),
    ...listQueryDefaults,
  });
}

export function useSyncPipelineLeadMetaValues(leadId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (values: { meta_field_id: number; value: string | null }[]) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_META_VALUES(leadId), { values });
      return normalizeList<PipelineLeadMetaValue>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.leadMetaValues(leadId) });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not save meta values'));
    },
  });
}
