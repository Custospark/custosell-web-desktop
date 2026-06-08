import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  loginStart, loginSuccess, loginFailure,
  registerStart, registerSuccess, registerFailure,
  logout, setUser,
} from '../../../app/store/slices/authSlice';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { clearServiceWorkerApiCache } from '../../../app/sw/registerServiceWorker';
import { useToast } from '../../../app/contexts/ToastContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  BusinessRegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ApiError,
} from './AccountTypes';
import {
  isCompletelyOffline,
  isNetworkFailure,
} from '../../../app/store/offline/offlineQueryUtils';
import { completeOfflineRegistration } from '../../../app/store/offline/completeOfflineRegistration';
import { completeOfflineLogin } from '../../../app/store/offline/completeOfflineLogin';
import { clearAuthSession } from '../../../app/store/offline/secureStorage';
import { persistLoginCredentials, refreshStoredUserSnapshot } from '../../../app/store/offline/deviceCredentials';
import type { AuthUser } from '../../../app/store/slices/authSlice';

export const accountKeys = {
  all: ['account'] as const,
  profile: () => ['account', 'profile'] as const,
};

function extractAuthUser(data: AuthResponse): AuthUser {
  const userData = data.user?.data ?? data.user;
  if (userData.business && typeof userData.business === 'object' && 'data' in userData.business) {
    userData.business = (userData.business as { data: AuthUser['business'] }).data;
  }
  return userData;
}

async function persistOnlineAuth(data: AuthResponse, password: string): Promise<void> {
  const user = extractAuthUser(data);
  await persistLoginCredentials({
    email: user.email,
    password,
    user,
    token: data.token,
    isLocalSession: false,
    pendingAuthSync: false,
  });
}

type LoginMutationResult = AuthResponse & {
  isLocalSession?: boolean;
  pendingAuthSync?: boolean;
};

export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation<LoginMutationResult, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      if (isCompletelyOffline()) {
        const offline = await completeOfflineLogin(credentials);
        return {
          token: offline.token,
          user: { data: offline.user },
          isLocalSession: true,
          pendingAuthSync: offline.pendingAuthSync,
        };
      }

      try {
        const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
        await persistOnlineAuth(data, credentials.password);
        return {
          ...data,
          isLocalSession: false,
          pendingAuthSync: false,
        };
      } catch (err) {
        if (isNetworkFailure(err)) {
          const offline = await completeOfflineLogin(credentials);
          return {
            token: offline.token,
            user: { data: offline.user },
            isLocalSession: true,
            pendingAuthSync: offline.pendingAuthSync,
          };
        }
        throw err;
      }
    },
    onMutate: () => {
      dispatch(loginStart());
    },
    onSuccess: (data) => {
      const userData = extractAuthUser(data);
      const isLocal = data.isLocalSession ?? data.token.startsWith('local_');
      dispatch(loginSuccess({
        user: userData,
        token: data.token,
        isLocalSession: isLocal,
        pendingAuthSync: data.pendingAuthSync ?? isLocal,
      }));

      if (isLocal) {
        showToast('success', isCompletelyOffline()
          ? 'Signed in offline. Changes will sync when reconnected.'
          : 'Signed in using offline credentials.');
      } else {
        showToast('success', 'Welcome back!');
      }
      navigate(ROUTES.DASHBOARD);
    },
    onError: (error) => {
      const axiosErr = error as AxiosError<ApiError>;
      const message = axiosErr.response?.data?.message || error.message || 'Invalid credentials';
      dispatch(loginFailure(message));
      showToast('error', message);
    },
  });
}

interface RegisterBusinessResult {
  user: AuthUser;
  token: string;
  isLocalSession: boolean;
  pendingAuthSync: boolean;
}

export function useRegisterBusiness() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation<RegisterBusinessResult, Error, BusinessRegisterRequest>({
    mutationFn: async (payload) => {
      if (isCompletelyOffline()) {
        const offline = await completeOfflineRegistration(payload);
        return {
          user: offline.user,
          token: offline.token,
          isLocalSession: true,
          pendingAuthSync: true,
        };
      }

      try {
        await axiosInstance.post('/businesses/register', payload);
        const { data } = await axiosInstance.post<AuthResponse>('/auth/login', {
          email: payload.email,
          password: payload.password,
        });
        await persistOnlineAuth(data, payload.password);
        return {
          user: extractAuthUser(data),
          token: data.token,
          isLocalSession: false,
          pendingAuthSync: false,
        };
      } catch (err) {
        if (isNetworkFailure(err)) {
          const offline = await completeOfflineRegistration(payload);
          return {
            user: offline.user,
            token: offline.token,
            isLocalSession: true,
            pendingAuthSync: true,
          };
        }
        throw err;
      }
    },
    onMutate: () => {
      dispatch(registerStart());
    },
    onSuccess: (result) => {
      dispatch(registerSuccess({
        user: result.user,
        token: result.token,
        isLocalSession: result.isLocalSession,
        pendingAuthSync: result.pendingAuthSync,
      }));

      if (result.isLocalSession) {
        showToast('success', 'Business registered offline. It will sync when you reconnect.');
      } else {
        showToast('success', 'Business registered successfully');
      }
      navigate(ROUTES.DASHBOARD);
    },
    onError: (error) => {
      const axiosErr = error as AxiosError<ApiError>;
      const message = axiosErr.response?.data?.message
        || axiosErr.response?.data?.errors?.owner_name?.[0]
        || error.message
        || 'Registration failed';
      dispatch(registerFailure(message));
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
      await persistOnlineAuth(response, data.password);
      return response;
    },
    onMutate: () => {
      dispatch(registerStart());
    },
    onSuccess: (data) => {
      const userData = extractAuthUser(data);
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
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);

  return useMutation({
    mutationFn: async () => {
      // Same detector as login/register: completely offline → local logout only, no API.
      if (isCompletelyOffline()) {
        return;
      }

      // Online or slow: revoke server session when holding a real (non-local) token.
      if (!isLocalSession) {
        try {
          await axiosInstance.post('/auth/logout', undefined, { skipAuthRedirect: true } as never);
        } catch {
          /* still clear local session if server unreachable */
        }
      }
    },
    onSettled: async () => {
      dispatch(logout());
      await clearAuthSession();
      queryClient.clear();
      clearServiceWorkerApiCache();
      showToast('success', 'Logged out successfully');
      navigate(ROUTES.LOGIN);
    },
  });
}

export function useProfile() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);

  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/me');
      const userData = data?.data ?? data;
      dispatch(setUser(userData));
      if (userData?.email) {
        await refreshStoredUserSnapshot(userData.email, userData);
      }
      return userData;
    },
    staleTime: 0,
    retry: false,
    enabled: Boolean(token) && !isLocalSession,
  });
}

export function useForgotPassword() {
  const { showToast } = useToast();
  return useMutation<{ message: string }, AxiosError<ApiError>, ForgotPasswordRequest>({
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.post('/auth/forgot-password', data);
      return response;
    },
    onSuccess: () => {
      showToast('success', 'If that email address is associated with an account, a password reset link has been sent.');
    },
    onError: () => {
      showToast('success', 'If that email address is associated with an account, a password reset link has been sent.');
    },
  });
}

export function useResetPassword() {
  const { showToast } = useToast();
  return useMutation<{ message: string }, AxiosError<ApiError>, ResetPasswordRequest>({
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.post('/auth/reset-password', data);
      return response;
    },
    onSuccess: () => {
      showToast('success', 'Password has been reset successfully.');
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to reset password.');
    },
  });
}
