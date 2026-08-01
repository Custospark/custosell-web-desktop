import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/ToastContext';
import type { PaymentInfo, PaymentInfoPayload, PayoutRecord } from './AccountReferralTypes';

export const accountKeys = {
  all: ['account'] as const,
  paymentInfo: () => ['account', 'payment-info'] as const,
  payoutHistory: () => ['account', 'payout-history'] as const,
};

export function usePaymentInfo() {
  return useQuery<PaymentInfo>({
    queryKey: accountKeys.paymentInfo(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PaymentInfo }>('/account/payment-info');
      return data.data;
    },
  });
}

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ message: string }, AxiosError<{ message: string }>, PaymentInfoPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.put<{ message: string }>('/account/payment-info', payload);
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Payment info updated');
      queryClient.invalidateQueries({ queryKey: accountKeys.paymentInfo() });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update payment info';
      showToast('error', message);
    },
  });
}

export function usePayoutHistory() {
  return useQuery<PayoutRecord[]>({
    queryKey: accountKeys.payoutHistory(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: PayoutRecord[] }>('/payouts/my-history');
      return data.data;
    },
  });
}
