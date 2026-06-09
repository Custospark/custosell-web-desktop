import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import type {
  PaginatedPlatformResponse,
  PlatformNotificationDispatchDetail,
  PlatformNotificationDispatchListItem,
} from './PlatformTypes';

export const platformDispatchKeys = {
  all: ['platform', 'notification-dispatches'] as const,
  list: (params: Record<string, string>) => [...platformDispatchKeys.all, 'list', params] as const,
  detail: (id: number) => [...platformDispatchKeys.all, 'detail', id] as const,
};

const platformFreshQuery = { staleTime: 0, gcTime: 0, networkMode: 'always' as const };

export function usePlatformNotificationDispatches(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformDispatchKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformNotificationDispatchListItem>>(
        PLATFORM.NOTIFICATION_DISPATCHES,
        { params },
      );
      return data;
    },
    ...platformFreshQuery,
  });
}

export function usePlatformNotificationDispatchDetail(id: number | null) {
  return useQuery({
    queryKey: platformDispatchKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformNotificationDispatchDetail }>(
        PLATFORM.NOTIFICATION_DISPATCH(id!),
      );
      return data.data;
    },
    enabled: id != null,
    ...platformFreshQuery,
  });
}

export function useDeletePlatformNotificationDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PLATFORM.NOTIFICATION_DISPATCH(id));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformDispatchKeys.all }),
  });
}

export function useBulkDeletePlatformNotificationDispatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 1) {
        await axiosInstance.delete(PLATFORM.NOTIFICATION_DISPATCH(ids[0]));
        return;
      }
      await axiosInstance.post(PLATFORM.NOTIFICATION_DISPATCHES_BULK_DELETE, { ids });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformDispatchKeys.all }),
  });
}
