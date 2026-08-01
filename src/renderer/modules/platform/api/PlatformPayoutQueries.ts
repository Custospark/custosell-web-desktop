import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { PayableEntity, PayoutRecord } from './PlatformPayoutTypes';

export const payoutKeys = {
  all: ['platform', 'payouts'] as const,
  payables: () => [...payoutKeys.all, 'payables'] as const,
  history: (type: string, id: number) => [...payoutKeys.all, 'history', type, id] as const,
};

export function usePayables() {
  return useQuery<PayableEntity[]>({
    queryKey: payoutKeys.payables(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PayableEntity[] }>(PLATFORM.PAYOUTS.PAYABLES);
      return data.data ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function usePayoutHistory(type: string, id: number) {
  return useQuery<PayoutRecord[]>({
    queryKey: payoutKeys.history(type, id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PayoutRecord[] }>(PLATFORM.PAYOUTS.HISTORY, {
        params: { payable_type: type, payable_id: id },
      });
      return data.data ?? [];
    },
    enabled: !!type && !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useRecordPayout() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<PayoutRecord, AxiosError<{ message: string }>, FormData | Record<string, unknown>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: PayoutRecord }>(PLATFORM.PAYOUTS.BASE, payload, {
        headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
      });
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Payout recorded');
      qc.invalidateQueries({ queryKey: payoutKeys.all, refetchType: 'all' });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to record payout');
    },
  });
}

export function useUpdatePayoutSchedule() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, AxiosError<{ message: string }>, { payable_type: string; payable_id: number; payout_frequency: string | null; next_payout_at: string | null }>({
    mutationFn: async (payload) => {
      await axiosInstance.put(PLATFORM.PAYOUTS.SCHEDULE, payload);
    },
    onSuccess: () => {
      showToast('success', 'Payout schedule updated');
      qc.invalidateQueries({ queryKey: payoutKeys.all, refetchType: 'all' });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update schedule');
    },
  });
}

export function useCancelPayout() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: async (id) => {
      await axiosInstance.patch(PLATFORM.PAYOUTS.CANCEL(id));
    },
    onSuccess: () => {
      showToast('success', 'Scheduled payout cancelled');
      qc.invalidateQueries({ queryKey: payoutKeys.all, refetchType: 'all' });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to cancel payout');
    },
  });
}
