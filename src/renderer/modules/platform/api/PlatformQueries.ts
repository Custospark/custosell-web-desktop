import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import type {
  BusinessAccountStatus,
  BusinessNotificationIntention,
  PaginatedPlatformResponse,
  PlatformBusiness,
  PlatformBusinessStats,
  PlatformConversionStats,
  PlatformMetricDay,
  PlatformOverview,
} from './PlatformTypes';
import { assertBusinessNotifyPayload, assertBusinessStatusReason } from './platformBusinessValidation';

/** Platform admin views always refetch - never rely on cached snapshots. */
export const platformFreshQuery = { staleTime: 0, gcTime: 0, networkMode: 'always' as const };

export function isAxiosNotFound(err: unknown): boolean {
  return (err as AxiosError).response?.status === 404;
}

type PlatformErrorBody = {
  message?: string;
  errors?: Record<string, string[] | string> | null;
};

function firstErrorMessage(body: PlatformErrorBody | undefined): string | null {
  if (!body?.errors) return null;
  for (const value of Object.values(body.errors)) {
    if (Array.isArray(value) && value.length > 0 && value[0]) return value[0];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function platformMutationError(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<PlatformErrorBody>;
  const body = axiosErr.response?.data;
  return firstErrorMessage(body)
    ?? body?.message
    ?? (err instanceof Error && err.message && !err.message.includes('Request failed with status code')
      ? err.message
      : fallback);
}

export const platformKeys = {
  all: ['platform'] as const,
  overview: () => [...platformKeys.all, 'overview'] as const,
  metrics: (days: number) => [...platformKeys.all, 'metrics', days] as const,
  businesses: (params: Record<string, string>) => [...platformKeys.all, 'businesses', 'v2', params] as const,
  businessStats: (params: Record<string, string>) => [...platformKeys.all, 'business-stats', params] as const,
  users: (params: Record<string, string>) => [...platformKeys.all, 'users', 'v2', params] as const,
  userStats: (params: Record<string, string>) => [...platformKeys.all, 'user-stats', params] as const,
  conversions: (params: Record<string, string>) => [...platformKeys.all, 'conversions', params] as const,
  roles: () => [...platformKeys.all, 'roles'] as const,
  roleMembers: (id: number, params: Record<string, string>) => [...platformKeys.all, 'roles', id, 'members', params] as const,
  permissions: () => [...platformKeys.all, 'permissions'] as const,
  plans: () => [...platformKeys.all, 'plans'] as const,
  subscriptions: () => [...platformKeys.all, 'subscriptions'] as const,
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

export function usePlatformConversions(params: Record<string, string> = {}, enabled = true) {
  return useQuery({
    queryKey: platformKeys.conversions(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PlatformConversionStats }>(PLATFORM.CONVERSIONS, { params });
      return data.data;
    },
    enabled: enabled && Boolean(params.date_from && params.date_to),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update business status')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update businesses')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete business')),
  });
}

export function useResetBusinessData() {  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post<{
        message: string;
        reset_counts: Record<string, number>;
      }>(PLATFORM.BUSINESS_RESET_DATA(id));
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to reset business data')),
  });
}

export function useBulkDeleteBusinesses() {  const queryClient = useQueryClient();
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete businesses')),
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
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to send notification')),
  });
}

export function useActivateBusinessSubscription() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, planId, billingCycle }: { id: number; planId: number; billingCycle: 'monthly' | 'yearly' }) => {
      const { data } = await axiosInstance.post<{ message: string }>(PLATFORM.BUSINESS_SUBSCRIPTION_ACTIVATE(id), {
        plan_id: planId,
        billing_cycle: billingCycle,
      });
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to activate subscription')),
  });
}
