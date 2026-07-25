import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { REFERRALS } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { ApplyReferralPayload, ApplyReferralResponse, ReferralEarnings } from './ReferralTypes';

export const referralKeys = {
  all: ['referrals'] as const,
  earnings: () => ['referrals', 'earnings'] as const,
};

export function useReferralEarnings() {
  return useQuery<ReferralEarnings>({
    queryKey: referralKeys.earnings(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ReferralEarnings>(REFERRALS.EARNINGS);
      return data;
    },
    retry: false,
  });
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<ApplyReferralResponse, AxiosError<{ message: string }>, ApplyReferralPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<ApplyReferralResponse>(REFERRALS.APPLY, payload);
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message || 'Referral code applied successfully');
      queryClient.invalidateQueries({ queryKey: referralKeys.earnings() });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to apply referral code';
      showToast('error', message);
    },
  });
}
