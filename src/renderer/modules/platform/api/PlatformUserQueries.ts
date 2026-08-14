import type { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import type {
  PaginatedPlatformResponse,
  PlatformPrivilegesPayload,
  PlatformUser,
  PlatformUserStats,
  PlatformRole,
  UserAccountStatus,
  UserNotificationIntention,
} from './PlatformTypes';
import { assertUserNotifyPayload, assertUserStatusReason } from './platformUserValidation';
import {
  platformFreshQuery,
  platformKeys,
  platformMutationError,
  isAxiosNotFound,
} from './PlatformQueries';

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

/** Enabled - GET /platform/users/stats is implemented on the API. */
export const PLATFORM_USER_STATS_API_ENABLED = true;

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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update user status')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update users')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to send notification')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete user')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete users')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update platform roles')),
  });
}

export function useUpdatePlatformUserPrivileges() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: PlatformPrivilegesPayload }) => {
      const { data } = await axiosInstance.patch<{ message: string }>(PLATFORM.USER_PRIVILEGES(id), payload);
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update account privileges')),
  });
}

export function useBulkUpdatePlatformUserPrivileges() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, payload }: { ids: number[]; payload: PlatformPrivilegesPayload }) => {
      const { data } = await axiosInstance.post<{
        message: string;
        processed: number;
        errors: { email: string; message: string }[];
        variant?: string;
      }>(PLATFORM.USERS_BULK_PRIVILEGES, { ids, ...payload });
      return data;
    },
    onSuccess: (data) => {
      const variant = data.errors.length > 0 || data.variant === 'warning' ? 'warning' : 'success';
      showToast(variant, data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update account privileges')),
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

export function usePlatformRoleMembers(roleId: number, params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformKeys.roleMembers(roleId, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformUser>>(PLATFORM.ROLE_MEMBERS(roleId), { params });
      return data;
    },
    enabled: roleId > 0,
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
    mutationFn: async (payload: { name: string; permissions?: string[] }) => {
      const body: Record<string, unknown> = { name: payload.name };
      if (payload.permissions && payload.permissions.length > 0) {
        body.permissions = payload.permissions;
      }
      const { data } = await axiosInstance.post<{ data: PlatformRole }>(PLATFORM.ROLES, body);
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Platform role created.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to create role')),
  });
}

export function useUpdatePlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data } = await axiosInstance.put<{ data: PlatformRole }>(PLATFORM.ROLE(id), { name });
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Platform role updated.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update role')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete role')),
  });
}
