import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import { switchAccount, setSwitchingAccount } from '../../../app/store/slices/authSlice';
import { LINKED_ACCOUNTS } from '../../../shared/api/endpoints/endpoints';
import { persistAuthSnapshot } from '../../../app/store/offline/auth/persistAuthSnapshot';
import { redirectToPath } from '../../../app/store/auth/runAppLogout';
import { clearServiceWorkerApiCache } from '../../../app/sw/registerServiceWorker';
import { clearBusinessOfflineStores } from '../../../app/store/offline/core/offlineStoreClear';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
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
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result);
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
  return useMutation<SwitchPayload, AxiosError, number, SwitchPayload | null>({
    onMutate: () => {
      // Global full-page switch loader - hides the previous account's UI so no
      // stale data is visible while the new account's shell mounts.
      dispatch(setSwitchingAccount(true));
      return null;
    },
    mutationFn: async (userId) => {
      const { data } = await axiosInstance.post<{ data: SwitchPayload }>(LINKED_ACCOUNTS.SWITCH(userId));
      const payload = unwrap<SwitchPayload>(data);
      const user = payload.user;

      // Hydrate the auth slice with the target account's full context AND its
      // freshly minted token (switch = login without password). The previous
      // account's token is intentionally NOT revoked - it is the same person's
      // account and leaving it is harmless; revoking here was logging the user
      // out. The switch simply swaps the active session.
      dispatch(switchAccount({ user, token: payload.token }));

      // Hard full isolation - exactly like logout + fresh login: drop every
      // query, the service-worker API cache, and all business offline (IndexedDB)
      // stores. Auth/secure stores (session + its encryption key) are preserved
      // so the user stays logged into the new account - we only wipe business
      // data, never the session.
      qc.clear();
      clearServiceWorkerApiCache();
      await clearBusinessOfflineStores().catch(() => undefined);

      // Persist the NEW session so AuthBootstrap rehydrates the target account
      // on the full reload (auth stores are preserved by the clear above).
      await persistAuthSnapshot().catch(() => undefined);

      return payload;
    },
    onSuccess: (_data, _vars, result) => {
      const user = result?.user;
      showToast('success', 'Switched account');

      // Land on the modules the switched account can access - full navigation so
      // the whole app re-initializes from the new session (like login). Each
      // account has its own default landing page based on its modules/access
      // (dashboard is only the default if the account can access it). forceReload
      // guarantees we actually navigate even if the target path matches the
      // current page, so the user never stays on the previous account's page.
      const target = user ? getDefaultRoute(user) : '/';
      redirectToPath(target, undefined, true);
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to switch account';
      showToast('error', msg);
      dispatch(setSwitchingAccount(false));
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
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result);
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
      if (result.accounts) qc.setQueryData(linkedAccountKeys.list(), result);
      showToast('success', 'Account unlinked');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'That security code is invalid or has expired.';
      showToast('error', msg);
    },
  });
}
