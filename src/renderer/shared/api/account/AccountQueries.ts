import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import {
  loginStart, loginSuccess, loginFailure,
  registerStart, registerSuccess, registerFailure,
  logout, setUser,
} from '../../../app/store/slices/authSlice';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/ToastContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { LoginRequest, RegisterRequest, AuthResponse, ApiError } from './AccountTypes';

export const accountKeys = {
  all: ['account'] as const,
  profile: () => ['account', 'profile'] as const,
};

export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation<AuthResponse, AxiosError<ApiError>, LoginRequest>({
    mutationFn: async (credentials) => {
      const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
      return data;
    },
    onMutate: () => {
      dispatch(loginStart());
    },
    onSuccess: (data) => {
      const userData = data.user?.data ?? data.user;
      dispatch(loginSuccess({ user: userData, token: data.token }));
      showToast('success', 'Welcome back!');
      navigate(ROUTES.DASHBOARD);
    },
    onError: (error) => {
      console.error('[Login Error]', error.response?.status, error.response?.data, error.message);
      const message = error.response?.data?.message || error.message || 'Invalid credentials';
      dispatch(loginFailure(message));
      showToast('error', message);
    },
  });
}

export function useRegister() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation<AuthResponse, AxiosError<ApiError>, RegisterRequest>({
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.post<AuthResponse>('/auth/register', data);
      return response;
    },
    onMutate: () => {
      dispatch(registerStart());
    },
    onSuccess: (data) => {
      const userData = data.user?.data ?? data.user;
      dispatch(registerSuccess({ user: userData, token: data.token }));
      showToast('success', 'Account created successfully');
      navigate(ROUTES.DASHBOARD);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch(registerFailure(message));
      showToast('error', message);
    },
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/auth/logout');
    },
    onSettled: () => {
      dispatch(logout());
      queryClient.clear();
      showToast('success', 'Logged out successfully');
      navigate(ROUTES.LOGIN);
    },
  });
}

export function useProfile() {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/me');
      const userData = data?.data ?? data;
      dispatch(setUser(userData));
      return userData;
    },
    staleTime: 0,
    retry: false,
    enabled: !!localStorage.getItem('token'),
  });
}
