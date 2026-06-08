import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import type {
  BusinessAccountStatus,
  BusinessNotificationIntention,
  PaginatedPlatformResponse,
  PlatformBusiness,
  PlatformBusinessStats,
  PlatformMetricDay,
  PlatformOverview,
  PlatformUser,
  PlatformUserStats,
  PlatformRole,
  UserAccountStatus,
  UserNotificationIntention,
} from './PlatformTypes';
import { assertBusinessNotifyPayload, assertBusinessStatusReason } from './platformBusinessValidation';
import { assertUserNotifyPayload, assertUserStatusReason } from './platformUserValidation';

/** Platform admin views always refetch — never rely on cached snapshots. */
const platformFreshQuery = { staleTime: 0, gcTime: 0, networkMode: 'always' as const };

function isAxiosNotFound(err: unknown): boolean {
  return (err as AxiosError).response?.status === 404;
}

async function patchPlatformUserStatus(
  id: number,
  status: UserAccountStatus,
  reason: string,
  channel: NotificationChannel,
): Promise<{ message: string }> {
  const is_active = status === 'active' || status === 'warning' || status === 'notified';

  try {
    const { data } = await axiosInstance.patch<{ message: string }>(
      PLATFORM.USER_STATUS(id),
      { status, is_active, reason, channel },
    );
    return data;
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.status !== 422) throw err;

    const { data } = await axiosInstance.patch<{ message: string }>(
      PLATFORM.USER_STATUS(id),
      { is_active, reason },
    );
    return data;
  }
}

export const platformKeys = {
  all: ['platform'] as const,
  overview: () => [...platformKeys.all, 'overview'] as const,
  metrics: (days: number) => [...platformKeys.all, 'metrics', days] as const,
  businesses: (params: Record<string, string>) => [...platformKeys.all, 'businesses', 'v2', params] as const,
  businessStats: (params: Record<string, string>) => [...platformKeys.all, 'business-stats', params] as const,
  users: (params: Record<string, string>) => [...platformKeys.all, 'users', 'v2', params] as const,
  userStats: (params: Record<string, string>) => [...platformKeys.all, 'user-stats', params] as const,
  roles: () => [...platformKeys.all, 'roles'] as const,
  permissions: () => [...platformKeys.all, 'permissions'] as const,
};

export function usePlatformOverview() {
  return useQuery({
    queryKey: platformKeys.overview(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformOverview }>(PLATFORM.OVERVIEW);
      return data.data;
    },
    ...platformFreshQuery,
  });
}

export function usePlatformMetrics(days = 7) {
  return useQuery({
    queryKey: platformKeys.metrics(days),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformMetricDay[] }>(PLATFORM.METRICS, { params: { days } });
      return data.data;
    },
    ...platformFreshQuery,
  });
}

export function usePlatformBusinessStats(params: Record<string, string> = {}, enabled = true) {
  return useQuery({
    queryKey: platformKeys.businessStats(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformBusinessStats }>(PLATFORM.BUSINESS_STATS, { params });
      return data.data;
    },
    enabled: enabled && Boolean(params.date_from && params.date_to),
    ...platformFreshQuery,
  });
}

export function usePlatformBusinesses(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformKeys.businesses(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformBusiness>>(PLATFORM.BUSINESSES, { params });
      return data;
    },
    ...platformFreshQuery,
  });
}

export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      channel = 'both',
    }: { id: number; status: BusinessAccountStatus; reason: string; channel?: NotificationChannel }) => {
      const trimmedReason = assertBusinessStatusReason(reason);
      const { data } = await axiosInstance.patch<{ message: string }>(
        PLATFORM.BUSINESS_STATUS(id),
        { status, reason: trimmedReason, channel },
      );
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update business status'),
  });
}

export function useBulkUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      ids,
      status,
      reason,
      channel = 'both',
    }: { ids: number[]; status: BusinessAccountStatus; reason: string; channel?: NotificationChannel }) => {
      const trimmedReason = assertBusinessStatusReason(reason);
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.BUSINESSES_BULK_STATUS, {
        ids,
        status,
        reason: trimmedReason,
        channel,
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update businesses'),
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const trimmedReason = assertBusinessStatusReason(reason);
      const { data } = await axiosInstance.delete<{ message: string }>(PLATFORM.BUSINESS_DELETE(id), {
        data: { reason: trimmedReason },
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to delete business'),
  });
}

export function useBulkDeleteBusinesses() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[]; reason: string }) => {
      const trimmedReason = assertBusinessStatusReason(reason);
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.BUSINESSES_BULK_DELETE, {
        ids,
        reason: trimmedReason,
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to delete businesses'),
  });
}

export function useNotifyBusinesses() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      businessIds,
      intention,
      message,
      subject,
      markAsNotified,
      channel = 'both',
    }: {
      businessIds: number[];
      intention: BusinessNotificationIntention;
      message: string;
      subject?: string;
      markAsNotified?: boolean;
      channel?: NotificationChannel;
    }) => {
      const payload = assertBusinessNotifyPayload(message, subject ?? '');
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.BUSINESSES_NOTIFY, {
        business_ids: businessIds,
        intention,
        message: payload.message,
        subject: payload.subject,
        mark_as_notified: markAsNotified ?? false,
        channel,
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to send notification'),
  });
}

/** Flip to true when GET /platform/users/stats is implemented on the API. */
export const PLATFORM_USER_STATS_API_ENABLED = false;

export function usePlatformUserStats(params: Record<string, string> = {}, enabled = true) {
  return useQuery({
    queryKey: platformKeys.userStats(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformUserStats }>(PLATFORM.USER_STATS, { params });
      return data.data;
    },
    enabled: PLATFORM_USER_STATS_API_ENABLED && enabled && Boolean(params.date_from && params.date_to),
    ...platformFreshQuery,
  });
}

export function usePlatformUsers(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformKeys.users(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformUser>>(PLATFORM.USERS, { params });
      return data;
    },
    ...platformFreshQuery,
  });
}

export function useUpdatePlatformUserStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      channel = 'both',
    }: { id: number; status: UserAccountStatus; reason: string; channel?: NotificationChannel }) => {
      const trimmedReason = assertUserStatusReason(reason);
      return patchPlatformUserStatus(id, status, trimmedReason, channel);
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update user status'),
  });
}

export function useBulkUpdatePlatformUserStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      ids,
      status,
      reason,
      channel = 'both',
    }: { ids: number[]; status: UserAccountStatus; reason: string; channel?: NotificationChannel }) => {
      const trimmedReason = assertUserStatusReason(reason);
      try {
        const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.USERS_BULK_STATUS, {
          ids,
          status,
          reason: trimmedReason,
          channel,
        });
        return data;
      } catch (err: unknown) {
        if (!isAxiosNotFound(err)) throw err;

        for (const id of ids) {
          await patchPlatformUserStatus(id, status, trimmedReason, channel);
        }
        return { message: `Updated ${ids.length} user${ids.length === 1 ? '' : 's'}` };
      }
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update users'),
  });
}

export function useNotifyPlatformUsers() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      userIds,
      intention,
      message,
      subject,
      markAsNotified,
      channel = 'both',
    }: {
      userIds: number[];
      intention: UserNotificationIntention;
      message: string;
      subject?: string;
      markAsNotified?: boolean;
      channel?: NotificationChannel;
    }) => {
      const payload = assertUserNotifyPayload(message, subject ?? '');
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.USERS_NOTIFY, {
        user_ids: userIds,
        intention,
        message: payload.message,
        subject: payload.subject,
        mark_as_notified: markAsNotified ?? false,
        channel,
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to send notification'),
  });
}

export function useDeletePlatformUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const trimmedReason = assertUserStatusReason(reason);
      const { data } = await axiosInstance.delete<{ message: string }>(PLATFORM.USER_DELETE(id), {
        data: { reason: trimmedReason },
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to delete user'),
  });
}

export function useBulkDeletePlatformUsers() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[]; reason: string }) => {
      const trimmedReason = assertUserStatusReason(reason);
      const { data } = await axiosInstance.post<{
        message: string;
        deleted: number;
        skipped: number;
        errors: { email: string; message: string }[];
      }>(PLATFORM.USERS_BULK_DELETE, { ids, reason: trimmedReason });
      return data;
    },
    onSuccess: (data) => {
      showToast(data.skipped > 0 ? 'warning' : 'success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to delete users'),
  });
}

export function useBulkAssignPlatformRoles() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      emails,
      ids,
      role,
      action = 'assign',
    }: {
      emails?: string[];
      ids?: number[];
      role: string;
      action?: 'assign' | 'revoke';
    }) => {
      const { data } = await axiosInstance.post<{
        message: string;
        processed: number;
        not_found: string[];
        errors: { email: string; message: string }[];
      }>(PLATFORM.USERS_BULK_ASSIGN_ROLES, { emails, ids, role, action });
      return data;
    },
    onSuccess: (data) => {
      const variant = data.errors.length > 0 || data.not_found.length > 0 ? 'warning' : 'success';
      showToast(variant, data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update platform roles'),
  });
}

export function usePlatformRoles() {
  return useQuery({
    queryKey: platformKeys.roles(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformRole[] }>(PLATFORM.ROLES);
      return data.data;
    },
    ...platformFreshQuery,
  });
}

export function usePlatformPermissions() {
  return useQuery({
    queryKey: platformKeys.permissions(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: string[] }>(PLATFORM.PERMISSIONS);
      return data.data;
    },
    ...platformFreshQuery,
  });
}

export function useCreatePlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string; permissions: string[] }) => {
      const { data } = await axiosInstance.post<{ data: PlatformRole }>(PLATFORM.ROLES, payload);
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Platform role created.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to create role'),
  });
}

export function useUpdatePlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, permissions }: { id: number; permissions: string[] }) => {
      const { data } = await axiosInstance.put<{ data: PlatformRole }>(PLATFORM.ROLE(id), { permissions });
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Platform role updated.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update role'),
  });
}

export function useDeletePlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.delete<{ message: string }>(PLATFORM.ROLE(id));
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to delete role'),
  });
}
