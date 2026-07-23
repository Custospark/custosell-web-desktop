import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  loginStart, loginSuccess, loginFailure,
  registerStart, registerSuccess, registerFailure,
  setUser,
} from '../../../app/store/slices/authSlice';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/ToastContext';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { BILLING, SUBSCRIPTIONS } from '../endpoints/endpoints';
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
  sanitizeErrorMessage,
} from '../../../app/store/offline/core/offlineQueryUtils';
import { completeOfflineRegistration } from '../../../app/store/offline/auth/completeOfflineRegistration';
import { completeOfflineLogin } from '../../../app/store/offline/auth/completeOfflineLogin';
import { persistLoginCredentials, refreshStoredUserSnapshot } from '../../../app/store/offline/auth/deviceCredentials';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { refreshAllServerCatalogSnapshots } from '../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { upgradeLocalSessionIfOnline } from '../../../app/store/offline/auth/sessionUpgrade';
import { useLogoutFallback } from '../../../app/contexts/LogoutContext';
import type { AuthUser } from '../../../app/store/slices/authSlice';

export const accountKeys = {
  all: ['account'] as const,
  profile: () => ['account', 'profile'] as const,
};

const AUTH_ENTRY_PATHS: ReadonlySet<string> = new Set([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
]);

/** Prefer the pre-login route when safe; otherwise the user's default module (dashboard). */
function resolvePostLoginPath(user: AuthUser, from: unknown): string {
  if (typeof from === 'string'
    && from.startsWith('/')
    && !from.startsWith('//')
    && !AUTH_ENTRY_PATHS.has(from)) {
    return from;
  }
  return getDefaultRoute(user);
}

function extractAuthUser(data: AuthResponse): AuthUser {
  const userData = data.user?.data ?? data.user;
  if (userData.business && typeof userData.business === 'object' && 'data' in userData.business) {
    userData.business = (userData.business as { data: AuthUser['business'] }).data;
  }
  return userData;
}

/** Best-effort offline backup after server auth — must not block or replace online login. */
function backupOnlineAuthToOffline(data: AuthResponse, password: string): void {
  const user = extractAuthUser(data);
  void persistLoginCredentials({
    email: user.email,
    password,
    user,
    token: data.token,
    isLocalSession: false,
    pendingAuthSync: false,
  }).catch((err) => {
    console.warn('[Auth] Offline credential backup failed:', err);
  });
}

function getAuthErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiError>;
  const serverMessage = axiosErr.response?.data?.message
    || axiosErr.response?.data?.errors?.owner_name?.[0];
  if (serverMessage) return serverMessage;
  if (isNetworkFailure(err)) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  return sanitizeErrorMessage(err, fallback);
}

type LoginMutationResult = AuthResponse & {
  isLocalSession?: boolean;
  pendingAuthSync?: boolean;
};

export function useLogin(options?: { redirect?: boolean }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const shouldRedirect = options?.redirect !== false;
  const returnFrom = (location.state as { from?: string } | null)?.from;

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

      const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
      backupOnlineAuthToOffline(data, credentials.password);
      return {
        ...data,
        isLocalSession: false,
        pendingAuthSync: false,
      };
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
        pendingAuthSync: data.pendingAuthSync ?? false,
      }));
      if (!isLocal) {
        queryClient.setQueryData(accountKeys.profile(), userData);
      }

      if (isLocal) {
        if (!isCompletelyOffline()) {
          void upgradeLocalSessionIfOnline();
        }
        showToast('success', isCompletelyOffline()
          ? 'Signed in offline. Changes will sync when reconnected.'
          : 'Signed in using offline credentials.');
      } else {
        showToast('success', 'Welcome back!');
        void refreshAllServerCatalogSnapshots();
      }
      if (shouldRedirect) {
        navigate(resolvePostLoginPath(userData, returnFrom));
      }
    },
    onError: (error) => {
      const message = getAuthErrorMessage(error, 'Invalid credentials');
      dispatch(loginFailure(message));
      // Discover dialog shows inline error; skip duplicate toast when staying in-shell
      if (shouldRedirect) {
        showToast('error', message);
      }
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

      await axiosInstance.post('/businesses/register', payload);
      const { data } = await axiosInstance.post<AuthResponse>('/auth/login', {
        email: payload.email,
        password: payload.password,
      });
      backupOnlineAuthToOffline(data, payload.password);
      return {
        user: extractAuthUser(data),
        token: data.token,
        isLocalSession: false,
        pendingAuthSync: false,
      };
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
        void refreshAllServerCatalogSnapshots();
      }

      const needsOnboarding = !result.isLocalSession
        && (!result.user?.business?.subscription
          || result.user?.business?.subscription?.onboarding_fee_paid === false);

      if (needsOnboarding) {
        navigate(ROUTES.ONBOARDING);
      } else {
        navigate(getDefaultRoute(result.user));
      }
    },
    onError: (error) => {
      const message = getAuthErrorMessage(error, 'Registration failed');
      dispatch(registerFailure(message));
      showToast('error', message);
    },
  });
}

export function useRegister(options?: { redirect?: boolean }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const shouldRedirect = options?.redirect !== false;

  return useMutation<AuthResponse, AxiosError<ApiError>, RegisterRequest>({
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.post<AuthResponse>('/auth/register', data);
      backupOnlineAuthToOffline(response, data.password);
      return response;
    },
    onMutate: () => {
      dispatch(registerStart());
    },
    onSuccess: (data) => {
      const userData = extractAuthUser(data);
      dispatch(registerSuccess({ user: userData, token: data.token }));
      showToast('success', 'Account created successfully');
      if (shouldRedirect) {
        navigate(getDefaultRoute(userData));
      }
    },
    onError: (error) => {
      const message = getAuthErrorMessage(error, 'Registration failed');
      dispatch(registerFailure(message));
      if (shouldRedirect) {
        showToast('error', message);
      }
    },
  });
}

export function useLogout() {
  const { logout, isLoggingOut } = useLogoutFallback();
  return { logout, isLoggingOut, isPending: isLoggingOut };
}

export function useProfile() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const cachedUser = useAppSelector((state) => state.auth.user);

  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: async () => {
      const { data } = await axiosInstance.get('/auth/me');
      const userData = data?.data ?? data;
      dispatch(setUser(userData));
      try {
        await updateStoredAuthUser(userData);
        if (userData?.email) {
          await refreshStoredUserSnapshot(userData.email, userData);
        }
      } catch (err) {
        console.warn('[Auth] Profile offline backup failed:', err);
      }
      return userData;
    },
    placeholderData: cachedUser ?? undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
    enabled: isInitialized && Boolean(token) && !isLocalSession,
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

export function useSubscribe() {
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, { plan_id: number; billing_cycle?: string }>({
    mutationFn: async (payload) => {
      await axiosInstance.post(SUBSCRIPTIONS.SUBSCRIBE, payload);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create subscription.';
      showToast('error', message);
    },
  });
}

export function useInitiateOnboardingPayment() {
  const { showToast } = useToast();
  return useMutation<{ success: boolean; payment_id: number; message: string; redirect_url?: string }, AxiosError<ApiError>, {
    amount: number;
    currency: string;
    phone?: string;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(BILLING.INITIATE, {
        gateway_name: 'pesapal',
        amount: payload.amount,
        currency: payload.currency,
        payment_type: 'onboarding',
        phone: payload.phone,
      });
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to initiate payment. Please try again.';
      showToast('error', message);
    },
  });
}

export function useBillingPayment(id: number | null) {
  return useQuery({
    queryKey: ['billing', 'payment', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(BILLING.PAYMENT(id!));
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const payment = query.state.data;
      if (payment?.data?.status === 'completed' || payment?.data?.status === 'failed') {
        return false;
      }
      return 3000;
    },
  });
}

export function useUpgrade() {
  const { showToast } = useToast();
  return useMutation<{ scheduled_change: unknown; proration: unknown }, AxiosError<ApiError>, {
    subscriptionId: number;
    to_plan_id: number;
    effective?: 'immediate' | 'end_of_period';
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.UPGRADE(payload.subscriptionId), {
        to_plan_id: payload.to_plan_id,
        effective: payload.effective ?? 'immediate',
      });
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Plan upgraded successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to upgrade plan.';
      showToast('error', message);
    },
  });
}

export function useDowngrade() {
  const { showToast } = useToast();
  return useMutation<{ scheduled_change: unknown; proration: unknown }, AxiosError<ApiError>, {
    subscriptionId: number;
    to_plan_id: number;
    effective?: 'immediate' | 'end_of_period';
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.DOWNGRADE(payload.subscriptionId), {
        to_plan_id: payload.to_plan_id,
        effective: payload.effective ?? 'end_of_period',
      });
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Downgrade scheduled successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to downgrade plan.';
      showToast('error', message);
    },
  });
}

export function useSubscriptionChanges(subscriptionId: number | null) {
  return useQuery({
    queryKey: ['subscription', 'changes', subscriptionId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Record<string, unknown>[] }>(SUBSCRIPTIONS.CHANGES(subscriptionId!));
      return data.data;
    },
    enabled: !!subscriptionId,
  });
}
