import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { REFERRALS, REFERRAL_CODES } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { ApplyReferralPayload, ApplyReferralResponse, ReferralEarnings, ValidateCodeResponse } from './ReferralTypes';

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
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000,
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

export function useValidateReferralCode(code: string) {
  return useQuery<ValidateCodeResponse>({
    queryKey: ['referral-codes', 'validate', code],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ValidateCodeResponse>(REFERRAL_CODES.VALIDATE, {
        params: { code },
      });
      return data;
    },
    enabled: code.length >= 3,
    staleTime: 0,
    retry: false,
  });
}

export function useGenerateReferralCode() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ data: { code: string } }, AxiosError<{ message: string }>, void>({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<{ data: { code: string } }>(REFERRAL_CODES.BASE, {
        owner_type: 'business',
        discount_type: 'percentage',
        discount_value: 10,
        reward_type: 'free_month',
      });
      return data;
    },
    onSuccess: async (result) => {
      showToast('success', 'Referral code generated');
      const newCode = result?.data?.code;
      if (newCode) {
        queryClient.setQueryData<ReferralEarnings>(referralKeys.earnings(), (old) => {
          if (!old) return undefined;
          return { ...old, referral_code: newCode };
        });
      }
      await queryClient.invalidateQueries({ queryKey: referralKeys.earnings(), refetchType: 'all' });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to generate referral code';
      showToast('error', message);
    },
  });
}
