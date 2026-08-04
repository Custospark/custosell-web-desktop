import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import { setUser, loginSuccess } from '../../../app/store/slices/authSlice';
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
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';

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

export interface ProfileChangeInitiateInput {
  name: string;
  email: string;
  phone?: string;
  avatar?: File;
}

export function useInitiateProfileChange() {
  const { showToast } = useToast();
  return useMutation<{ message: string; requires_profile_confirmation: boolean }, AxiosError<ApiError>, ProfileChangeInitiateInput>({
    mutationFn: async (payload) => {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('email', payload.email);
      if (payload.phone) formData.append('phone', payload.phone);
      if (payload.avatar) formData.append('avatar', payload.avatar);
      const { data } = await axiosInstance.post<{ message: string; requires_profile_confirmation: boolean }>(
        AUTH.PROFILE_INITIATE,
        formData,
      );
      return data;
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Could not start the profile change.');
    },
  });
}

export function useConfirmProfileChange() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation<AuthUser, AxiosError<ApiError>, { code: string }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: AuthUser }>(AUTH.PROFILE_CONFIRM, payload);
      return data.data ?? (data as unknown as AuthUser);
    },
    onSuccess: async (user) => {
      dispatch(setUser(user));
      queryClient.setQueryData(['account', 'profile'], user);
      try {
        await updateStoredAuthUser(user);
      } catch (err) {
        console.warn('[Profile] Failed to persist profile update to local session:', err);
      }
      showToast('success', 'Profile updated successfully.');
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'That security code is invalid or has expired.');
    },
  });
}
