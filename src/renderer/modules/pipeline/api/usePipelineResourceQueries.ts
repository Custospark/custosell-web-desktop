import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineBoardResource,
  PipelineBoardResourceVisibility,
  PipelineBoardResourcesSummary,
  PipelineUserRef,
} from './pipelineTypes';
import { pipelineResourceKeys } from './pipelineQueryKeys';
import { PIPELINE_KANBAN_POLL_MS } from './pipelineQueryKeys';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export function useBoardResourcesSummary(boardId: number, enabled = true, poll = false) {
  return useQuery({
    queryKey: pipelineResourceKeys.summary(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_RESOURCES_SUMMARY(boardId));
      return (data as { data: PipelineBoardResourcesSummary }).data;
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
    refetchInterval: poll && enabled && boardId > 0 ? PIPELINE_KANBAN_POLL_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useBoardResourceMembers(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineResourceKeys.members(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_RESOURCE_MEMBERS(boardId));
      return normalizeList<PipelineUserRef>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 60_000,
  });
}

export function useBoardResources(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineResourceKeys.list(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_RESOURCES(boardId));
      return normalizeList<PipelineBoardResource>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
  });
}

type ResourcePayload = {
  title: string;
  description?: string | null;
  group_name?: string | null;
  visibility: PipelineBoardResourceVisibility;
  member_user_ids?: number[];
};

export function useCreateBoardLinkResource(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: ResourcePayload & { url: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_RESOURCE_LINK(boardId), payload);
      return (data as { data: PipelineBoardResource }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.list(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.summary(boardId) });
      showToast('success', 'Link added to board resources');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add link'));
    },
  });
}

export function useUploadBoardResource(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: ResourcePayload & { file: File }) => {
      const form = new FormData();
      form.append('file', payload.file);
      form.append('visibility', payload.visibility);
      if (payload.title) form.append('title', payload.title);
      if (payload.description) form.append('description', payload.description);
      if (payload.group_name) form.append('group_name', payload.group_name);
      (payload.member_user_ids ?? []).forEach((id) => form.append('member_user_ids[]', String(id)));
      const { data } = await axiosInstance.post(PIPELINE.BOARD_RESOURCE_UPLOAD(boardId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return (data as { data: PipelineBoardResource }).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.list(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.summary(boardId) });
      showToast('success', 'File uploaded to board resources');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not upload file'));
    },
  });
}

export function useUpdateBoardResource(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      title?: string;
      description?: string | null;
      group_name?: string | null;
      visibility?: PipelineBoardResourceVisibility;
      url?: string;
      member_user_ids?: number[];
    }) => {
      const { id, ...body } = payload;
      const { data } = await axiosInstance.patch(PIPELINE.BOARD_RESOURCE(id), body);
      return (data as { data: PipelineBoardResource }).data;
    },
    onSuccess: (resource) => {
      qc.setQueryData<PipelineBoardResource[]>(
        pipelineResourceKeys.list(boardId),
        (existing) => (existing ?? []).map((item) => (item.id === resource.id ? resource : item)),
      );
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.summary(boardId) });
      showToast('success', 'Resource updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update resource'));
    },
  });
}

export function useDeleteBoardResource(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (resourceId: number) => {
      await axiosInstance.delete(PIPELINE.BOARD_RESOURCE(resourceId));
      return resourceId;
    },
    onMutate: async (resourceId) => {
      await qc.cancelQueries({ queryKey: pipelineResourceKeys.list(boardId) });
      const previous = qc.getQueryData<PipelineBoardResource[]>(pipelineResourceKeys.list(boardId));
      qc.setQueryData<PipelineBoardResource[]>(
        pipelineResourceKeys.list(boardId),
        (existing) => (existing ?? []).filter((item) => item.id !== resourceId),
      );
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineResourceKeys.summary(boardId) });
      showToast('success', 'Resource removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineResourceKeys.list(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete resource'));
    },
  });
}

export function useRecordBoardResourceView(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resourceId: number) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_RESOURCE_VIEW(resourceId));
      return (data as { data: PipelineBoardResource }).data;
    },
    onSuccess: (resource) => {
      qc.setQueryData<PipelineBoardResource[]>(
        pipelineResourceKeys.list(boardId),
        (existing) => (existing ?? []).map((item) => (item.id === resource.id ? resource : item)),
      );
    },
  });
}

export function useRecordBoardResourceDownload(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resourceId: number) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_RESOURCE_DOWNLOAD(resourceId));
      return (data as { data: PipelineBoardResource }).data;
    },
    onSuccess: (resource) => {
      qc.setQueryData<PipelineBoardResource[]>(
        pipelineResourceKeys.list(boardId),
        (existing) => (existing ?? []).map((item) => (item.id === resource.id ? resource : item)),
      );
    },
  });
}
