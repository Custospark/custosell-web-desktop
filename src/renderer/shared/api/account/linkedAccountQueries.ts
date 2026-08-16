import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import { switchAccount } from '../../../app/store/slices/authSlice';
import { LINKED_ACCOUNTS } from '../../../shared/api/endpoints/endpoints';
import { persistAuthSnapshot } from '../../../app/store/offline/auth/persistAuthSnapshot';
import { useToast } from '../../../app/contexts/useToast';
import type { AuthUser } from '../../../app/store/slices/authSlice';

export interface LinkedAccountSummary {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar: string | null;
  account_type: string;
  relation: 'primary' | 'secondary';
  is_business_owner: boolean;
  role: { id: number; name: string; slug: string } | null;
  business: {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
    status: string;
    subscription_status: string | null;
  } | null;
}

export interface LinkedAccountsData {
  primary: LinkedAccountSummary | null;
  accounts: LinkedAccountSummary[];
}

interface SwitchPayload {
  user: AuthUser;
  token: string;
}

export const linkedAccountKeys = {
  all: ['linked-accounts'] as const,
  list: () => [...linkedAccountKeys.all, 'list'] as const,
};

function unwrap<T>(payload: unknown, field = 'data'): T {
  const obj = payload as Record<string, unknown>;
  return (obj?.[field] ?? payload) as T;
}

export function useLinkedAccounts() {
  return useQuery<LinkedAccountsData>({
    queryKey: linkedAccountKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: LinkedAccountsData }>(LINKED_ACCOUNTS.BASE);
      return unwrap<LinkedAccountsData>(data);
    },
    staleTime: 30_000,
  });
}

export function useInitiateLinkAccount() {
  const { showToast } = useToast();
  return useMutation<{ message: string; target_user_id: number }, AxiosError, { email: string; password: string }>({
    mutationFn: async (credentials) => {
      const { data } = await axiosInstance.post<{ data: { message: string; target_user_id: number } }>(
        LINKED_ACCOUNTS.BASE,
        credentials,
      );
      return unwrap<{ message: string; target_user_id: number }>(data);
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to link account';
      showToast('error', msg);
    },
  });
}

export function useConfirmLinkAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<LinkedAccountsData, AxiosError, { target_user_id: number; code: string }>({
    mutationFn: async ({ target_user_id, code }) => {
      const { data } = await axiosInstance.post<{ data: LinkedAccountsData }>(LINKED_ACCOUNTS.CONFIRM_LINK, {
        target_user_id,
        code,
      });
      return unwrap<LinkedAccountsData>(data);
    },
    onSuccess: (result) => {
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result.accounts);
      showToast('success', 'Account linked. You can now switch to it from your profile.');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'That security code is invalid or has expired.';
      showToast('error', msg);
    },
  });
}

export function useSwitchAccount() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (userId) => {
      const { data } = await axiosInstance.post<{ data: SwitchPayload }>(LINKED_ACCOUNTS.SWITCH(userId));
      const payload = unwrap<SwitchPayload>(data);
      const user = payload.user;

      // Hydrate the auth slice with the target account's full context AND its
      // freshly minted token (switch = login without password). All subsequent
      // requests use the target account's token, so /auth/me and the profile
      // dropdown reflect the active account.
      dispatch(switchAccount({ user, token: payload.token }));

      await persistAuthSnapshot().catch(() => undefined);

      // Business-scoped caches must not leak another account's data.
      qc.clear();
    },
    onSuccess: () => {
      showToast('success', 'Switched account');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to switch account';
      showToast('error', msg);
    },
  });
}

export function useSetPrimary() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<LinkedAccountsData, AxiosError, number>({
    mutationFn: async (userId) => {
      const { data } = await axiosInstance.post<{ data: LinkedAccountsData }>(
        LINKED_ACCOUNTS.SET_PRIMARY(userId),
      );
      return unwrap<LinkedAccountsData>(data);
    },
    onSuccess: (result) => {
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result.accounts);
      showToast('success', 'Default account updated');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to update default account';
      showToast('error', msg);
    },
  });
}

export function useInitiateUnlinkAccount() {
  const { showToast } = useToast();
  return useMutation<{ message: string; linked_user_id: number }, AxiosError, number>({
    mutationFn: async (userId) => {
      const { data } = await axiosInstance.post<{ data: { message: string; linked_user_id: number } }>(
        LINKED_ACCOUNTS.UNLINK(userId),
      );
      return unwrap<{ message: string; linked_user_id: number }>(data);
    },
    onSuccess: () => {
      showToast('success', 'Security code sent. Check the account inbox.');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to start unlinking';
      showToast('error', msg);
    },
  });
}

export function useConfirmUnlinkAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<LinkedAccountsData, AxiosError, { user_id: number; code: string }>({
    mutationFn: async ({ user_id, code }) => {
      const { data } = await axiosInstance.post<{ data: LinkedAccountsData }>(
        LINKED_ACCOUNTS.CONFIRM_UNLINK(user_id),
        { code },
      );
      return unwrap<LinkedAccountsData>(data);
    },
    onSuccess: (result) => {
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result.accounts);
      showToast('success', 'Account unlinked');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'That security code is invalid or has expired.';
      showToast('error', msg);
    },
  });
}
