import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import type { WallFamePost, CreateWallPostPayload } from './pipelineTypes';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';

const WALL_FAME_KEY = 'wall-of-fame';

function buildFormData(payload: CreateWallPostPayload): FormData {
  const fd = new FormData();
  fd.append('type', payload.type);
  fd.append('content', payload.content);
  if (payload.title) fd.append('title', payload.title);
  if (payload.author_name) fd.append('author_name', payload.author_name);
  if (payload.staff_id) fd.append('staff_id', String(payload.staff_id));
  if (payload.board_id) fd.append('board_id', String(payload.board_id));
  if (payload.expires_at) fd.append('expires_at', payload.expires_at);
  if (payload.pinned !== undefined) fd.append('pinned', payload.pinned ? '1' : '0');
  if (payload.photo) fd.append('photo', payload.photo);
  return fd;
}

export function useWallFamePosts() {
  return useQuery({
    queryKey: [WALL_FAME_KEY],
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.WALL_OF_FAME);
      return data.data as WallFamePost[];
    },
  });
}

export function useCreateWallPost() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateWallPostPayload) => {
      if (payload.photo) {
        const fd = buildFormData(payload);
        const { data } = await axiosInstance.post(PIPELINE.WALL_OF_FAME, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.data as WallFamePost;
      }
      const { data } = await axiosInstance.post(PIPELINE.WALL_OF_FAME, payload);
      return data.data as WallFamePost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALL_FAME_KEY] });
      showToast('success', 'Post added to Wall of Fame');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create post'));
    },
  });
}

export function useUpdateWallPost() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateWallPostPayload> & { id: number }) => {
      if (payload.photo) {
        const fd = new FormData();
        fd.append('photo', payload.photo);
        fd.append('_method', 'PATCH');
        const { data } = await axiosInstance.post(PIPELINE.WALL_OF_FAME_POST(id), fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.data as WallFamePost;
      }
      const { data } = await axiosInstance.patch(PIPELINE.WALL_OF_FAME_POST(id), payload);
      return data.data as WallFamePost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALL_FAME_KEY] });
      showToast('success', 'Post updated');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update post'));
    },
  });
}

export function useDeleteWallPost() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.WALL_OF_FAME_POST(id));
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALL_FAME_KEY] });
      showToast('success', 'Post removed');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove post'));
    },
  });
}
