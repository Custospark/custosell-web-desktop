import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { NOTIFICATIONS } from '../../../shared/api/endpoints/endpoints';
import type { AppNotification, NotificationUnreadCount, PaginatedNotifications } from './NotificationTypes';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: Record<string, string>) => [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

const onlineQuery = {
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
};

export function useNotifications(params: Record<string, string> = {}, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedNotifications>(NOTIFICATIONS.BASE, { params });
      return data;
    },
    enabled,
    ...onlineQuery,
    networkMode: 'offlineFirst',
  });
}

export function useNotificationUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: NotificationUnreadCount }>(NOTIFICATIONS.UNREAD_COUNT);
      return data.data.unread_count;
    },
    enabled,
    ...onlineQuery,
    networkMode: 'offlineFirst',
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.patch<{ data: AppNotification }>(NOTIFICATIONS.MARK_READ(id));
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.patch<{ updated: number }>(NOTIFICATIONS.READ_ALL);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(NOTIFICATIONS.DELETE(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.delete<{ deleted: number }>(NOTIFICATIONS.DELETE_ALL);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
