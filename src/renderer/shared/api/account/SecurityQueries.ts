import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import { loginSuccess } from '../../../app/store/slices/authSlice';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import type {
  VerifyCodeRequest,
  SendVerificationCodeRequest,
  ActivityItem,
  ApiError,
} from './AccountTypes';
import { persistLoginCredentials } from '../../../app/store/offline/auth/deviceCredentials';

export const securityKeys = {
  all: ['account', 'security'] as const,
  activity: () => ['account', 'security', 'activity'] as const,
};

function completeVerifiedLogin(data: { user: AuthUser; token: string }): void {
  void persistLoginCredentials({
    email: data.user.email,
    password: '',
    user: data.user,
    plans: data.user.active_plans ?? [],
    token: data.token,
    isLocalSession: false,
    pendingAuthSync: false,
  }).catch(() => {
    // Verification completion is online-only; offline backup is best-effort.
  });
}

export function useSendVerificationCode() {
  const { showToast } = useToast();
  return useMutation<{ message: string }, AxiosError<ApiError>, SendVerificationCodeRequest>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ message: string }>(AUTH.VERIFY_SEND, payload);
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Security code sent. Check your inbox.');
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Could not send the security code.');
    },
  });
}

export function useVerifyCode() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<{ user: AuthUser; token: string }, AxiosError<ApiError>, VerifyCodeRequest>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ user: AuthUser; token: string }>(AUTH.VERIFY, payload);
      return data;
    },
    onSuccess: (data) => {
      dispatch(loginSuccess({ user: data.user, token: data.token, plans: data.user.active_plans ?? [] }));
      queryClient.setQueryData(['account', 'profile'], data.user);
      completeVerifiedLogin(data);
      showToast('success', 'Verification successful. Welcome back!');
      navigate(getDefaultRoute(data.user));
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'That security code is invalid or has expired.');
    },
  });
}

export function useToggleTwoFactor() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation<{ message: string; two_factor_enabled: boolean }, AxiosError<ApiError>, { enabled: boolean }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ message: string; two_factor_enabled: boolean }>(AUTH.TWO_FACTOR, payload);
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message);
      queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Could not update two-factor authentication.');
    },
  });
}

export function useAccountActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: securityKeys.activity(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: ActivityItem[] }>(AUTH.ACTIVITY);
      return data.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}
