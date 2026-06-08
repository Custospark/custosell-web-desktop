import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type {
  PaginatedPlatformResponse,
  PlatformBusiness,
  PlatformMetricDay,
  PlatformOverview,
  PlatformRole,
  PlatformUser,
} from './PlatformTypes';

export const platformKeys = {
  all: ['platform'] as const,
  overview: () => [...platformKeys.all, 'overview'] as const,
  metrics: (days: number) => [...platformKeys.all, 'metrics', days] as const,
  businesses: (params: Record<string, string>) => [...platformKeys.all, 'businesses', params] as const,
  users: (params: Record<string, string>) => [...platformKeys.all, 'users', params] as const,
  team: () => [...platformKeys.all, 'team'] as const,
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
    networkMode: 'always',
  });
}

export function usePlatformMetrics(days = 7) {
  return useQuery({
    queryKey: platformKeys.metrics(days),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformMetricDay[] }>(PLATFORM.METRICS, { params: { days } });
      return data.data;
    },
    networkMode: 'always',
  });
}

export function usePlatformBusinesses(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformKeys.businesses(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformBusiness>>(PLATFORM.BUSINESSES, { params });
      return data;
    },
    networkMode: 'always',
  });
}

export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: 'active' | 'suspended'; reason?: string }) => {
      const { data } = await axiosInstance.patch<{ message: string }>(PLATFORM.BUSINESS_STATUS(id), { status, reason });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update business status'),
  });
}

export function usePlatformUsers(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformKeys.users(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformUser>>(PLATFORM.USERS, { params });
      return data;
    },
    networkMode: 'always',
  });
}

export function usePlatformTeam() {
  return useQuery({
    queryKey: platformKeys.team(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedPlatformResponse<PlatformUser>>(PLATFORM.TEAM);
      return data;
    },
    networkMode: 'always',
  });
}

export function useUpdatePlatformUserStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active, reason }: { id: number; is_active: boolean; reason?: string }) => {
      const { data } = await axiosInstance.patch<{ message: string }>(PLATFORM.USER_STATUS(id), { is_active, reason });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to update user status'),
  });
}

export function usePlatformRoles() {
  return useQuery({
    queryKey: platformKeys.roles(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformRole[] }>(PLATFORM.ROLES);
      return data.data;
    },
    networkMode: 'always',
  });
}

export function usePlatformPermissions() {
  return useQuery({
    queryKey: platformKeys.permissions(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: string[] }>(PLATFORM.PERMISSIONS);
      return data.data;
    },
    networkMode: 'always',
  });
}

export function useAssignPlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.ASSIGN_ROLE(userId), { role });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to assign role'),
  });
}

export function useRevokePlatformRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const { data } = await axiosInstance.delete<{ message: string }>(PLATFORM.REVOKE_ROLE(userId, role));
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', err.message || 'Failed to revoke role'),
  });
}
