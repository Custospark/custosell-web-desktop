import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { USERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, isOfflineMode, sanitizeErrorMessage, shouldCompleteMutationLocally } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { backupCatalogSnapshot, readCatalogBaseline, resolveAuthBusinessId } from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import { loadStaffCatalogBaseline, refreshStaffCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/sync/mutationQueue';
import { localStaffStore, toStaffWithSyncMeta, type StaffWithSyncMeta } from '../../../../app/store/offline/settings/localStaffStore';
import type { RoleWithSyncMeta } from '../../../../app/store/offline/settings/localRolesStore';
import type { BusinessWithSyncMeta } from '../../../../app/store/offline/settings/localBusinessSettingsStore';
import { store } from '../../../../app/store/store';
import { setUser } from '../../../../app/store/slices/authSlice';
import { updateStoredAuthUser } from '../../../../app/store/offline/auth/secureStorage';
import { AUTH } from '../../../../shared/api/endpoints/endpoints';
import type { AuthUser } from '../../../../app/store/slices/authSlice';
import {
  completeOfflineCreateStaffInstant,
  completeOfflineUpdatePendingStaffInstant,
  completeOfflineUpdateStaffInstant,
} from '../../../../app/store/offline/settings/completeOfflineSettings';
import { roleKeys } from './RoleQueries';
import { businessKeys } from './BusinessQueries';
import type { StaffUser, CreateStaffData, UpdateStaffData, AttachStaffData, StaffLookupResult } from './StaffTypes';
import { assertCanDetachStaffAccount, getBusinessOwnerId } from './staffAccountRules';

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: () => [...staffKeys.lists()] as const,
};

function resolveRole(roleId: number | null | undefined): { id: number; name: string; slug?: string | null } | null {
  if (!roleId) return null;
  const roles = queryClient.getQueryData<RoleWithSyncMeta[]>(roleKeys.list()) ?? [];
  const role = roles.filter(Boolean).find((r) => r.id === roleId);
  return role ? { id: role.id, name: role.name, slug: role.slug } : null;
}

function normalizeStaffUser(staff: StaffUser): StaffUser {
  return {
    ...staff,
    is_active: staff.is_active ?? true,
    modules: staff.modules ?? [],
  };
}

function withResolvedRole(staff: StaffUser): StaffUser {
  return normalizeStaffUser({
    ...staff,
    role: staff.role ?? resolveRole(staff.role_id),
  });
}

async function findServerStaffByEmail(email: string): Promise<StaffWithSyncMeta | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE);
  const staff = response.data
    .filter(Boolean)
    .find((item) => item.email.trim().toLowerCase() === normalizedEmail);

  return staff ? withResolvedRole(staff) as StaffWithSyncMeta : null;
}

async function loadLocalPendingStaff(): Promise<{
  upserts: StaffWithSyncMeta[];
  deletedIds: Set<number>;
}> {
  const pending = await localStaffStore.getPending();
  return {
    upserts: pending
      .filter((r) => r.mutationType !== 'delete')
      .map(toStaffWithSyncMeta)
      .map((staff) => ({ ...staff, role: staff.role ?? resolveRole(staff.role_id) }))
      .filter(Boolean),
    deletedIds: new Set(pending.filter((r) => r.mutationType === 'delete').map((r) => r.staff.id)),
  };
}

function mergeStaffLists(
  base: StaffUser[] = [],
  local: StaffWithSyncMeta[] = [],
  deletedIds: Set<number> = new Set(),
): StaffWithSyncMeta[] {
  const safeBase = base.filter(Boolean).map(withResolvedRole);
  const safeLocal = local.filter(Boolean) as StaffWithSyncMeta[];
  const localIds = new Set(safeLocal.map((s) => s.id));
  const localEmails = new Set(safeLocal.map((s) => s.email));
  const filtered = safeBase.filter((s) => !deletedIds.has(s.id) && !localIds.has(s.id) && !localEmails.has(s.email));
  return [...safeLocal, ...filtered] as StaffWithSyncMeta[];
}

async function readStaffBaseline(): Promise<StaffUser[]> {
  return readCatalogBaseline('staff', staffKeys.list(), loadStaffCatalogBaseline);
}

export function useStaff() {
  return useQuery<StaffWithSyncMeta[]>({
    queryKey: staffKeys.list(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const baseline = await readStaffBaseline();
        const local = await loadLocalPendingStaff();
        return mergeStaffLists(baseline, local.upserts, local.deletedIds);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE);
        const list = Array.isArray(response.data) ? response.data : [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupCatalogSnapshot('staff', businessId, list);
        }
        const local = await loadLocalPendingStaff();
        return mergeStaffLists(list, local.upserts, local.deletedIds);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<StaffWithSyncMeta, AxiosError<ApiError>, CreateStaffData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      const role = resolveRole(p.role_id);
      if (isOfflineMode()) {
        return completeOfflineCreateStaffInstant(p, role);
      }
      try {
        const { data: r } = await axiosInstance.post<{ data: StaffUser }>(USERS.BASE, p);
        return withResolvedRole(r.data) as StaffWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          try {
            const serverStaff = await findServerStaffByEmail(p.email);
            if (serverStaff) return serverStaff;
          } catch {
            // Online writes should not create a pending row unless the app is explicitly offline.
          }
        }
        throw err;
      }
    },
    onSuccess: (staff) => {
      if (!staff) {
        qc.invalidateQueries({ queryKey: staffKeys.list() });
        return;
      }

      if (staff._pendingSync) {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) => {
          const list = (old ?? []).filter(Boolean);
          if (list.some((s) => s.id === staff.id || s.email === staff.email)) return list;
          return [staff, ...list];
        });
        showToast('success', 'Staff saved - will sync when online');
      } else {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) => {
          const list = (old ?? []).filter(Boolean);
          if (list.some((s) => s.id === staff.id || s.email === staff.email)) {
            return list.map((s) => s.id === staff.id || s.email === staff.email ? staff : s);
          }
          return [staff, ...list];
        });
        showToast('success', 'Staff created');
        void refreshStaffCatalogSnapshot();
        qc.invalidateQueries({ queryKey: staffKeys.list() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create staff'));
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<StaffWithSyncMeta, AxiosError<ApiError>, { id: number; data: UpdateStaffData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const cached = queryClient.getQueryData<StaffWithSyncMeta[]>(staffKeys.list());
      const existing = cached?.filter(Boolean).find((s) => s.id === id);
      if (!existing) throw new Error('Staff member not found');

      const role = data.role_id ? resolveRole(data.role_id) : existing.role ?? null;
      const isPendingOnly = existing._pendingSync || id < 0;
      if (isPendingOnly) {
        return completeOfflineUpdatePendingStaffInstant(existing, data, role);
      }

      if (isOfflineMode()) {
        return completeOfflineUpdateStaffInstant(existing, data, role);
      }
      try {
        // Backend rejects is_active on PUT - never send it.
        const { data: r } = await axiosInstance.put<{ data: StaffUser }>(USERS.BY_ID(id), data);
        return withResolvedRole(r.data) as StaffWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteMutationLocally()) {
          return completeOfflineUpdateStaffInstant(existing, data, role);
        }
        throw err;
      }
    },
    onSuccess: (staff, { id }) => {
      if (!staff) {
        qc.invalidateQueries({ queryKey: staffKeys.list() });
        return;
      }

      if (staff._pendingSync) {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
          (old ?? []).filter(Boolean).map((s) => s.id === id ? staff : s),
        );
        showToast(
          'success',
          staff._mutationType ? 'Corrected changes saved - will retry sync' : 'Changes saved - will sync when online',
        );
      } else {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
          (old ?? []).filter(Boolean).map((s) => s.id === id ? staff : s),
        );
        showToast('success', 'Staff updated');
        void refreshStaffCatalogSnapshot();
        qc.invalidateQueries({ queryKey: staffKeys.list() });
        const currentUserId = store.getState().auth.user?.id;
        if (currentUserId === id) {
          // Prefer ME, but fall back to the update response so sidebar modules refresh immediately
          // (especially after owner module changes from Staff drawer).
          const applyAuthUser = async (userData: AuthUser) => {
            store.dispatch(setUser(userData));
            try {
              await updateStoredAuthUser(userData);
            } catch {
              /* non-critical */
            }
          };

          void axiosInstance.get<{ data?: AuthUser } | AuthUser>(AUTH.ME).then(({ data }) => {
            const userData = (data && typeof data === 'object' && 'data' in data && data.data)
              ? data.data
              : data as AuthUser;
            void applyAuthUser(userData);
          }).catch(() => {
            const current = store.getState().auth.user;
            if (!current) return;
            void applyAuthUser({
              ...current,
              name: staff.name,
              email: staff.email,
              phone: staff.phone ?? current.phone,
              modules: staff.modules ?? current.modules,
            });
          });
        }
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update staff'));
    },
  });
}

const OFFLINE_ATTACH_MESSAGE = 'Attach staff requires an online connection.';
const OFFLINE_DETACH_MESSAGE = 'Detach staff requires an online connection.';
const OFFLINE_LOOKUP_MESSAGE = 'Email lookup requires an online connection.';

export async function lookupStaffEmail(email: string): Promise<StaffLookupResult> {
  if (isOfflineMode()) {
    throw new Error(OFFLINE_LOOKUP_MESSAGE);
  }
  const { data: response } = await axiosInstance.get<{ data: StaffLookupResult }>(USERS.LOOKUP, {
    params: { email: email.trim() },
  });
  return response.data;
}

export function useAttachStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<StaffWithSyncMeta, AxiosError<ApiError>, AttachStaffData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (isOfflineMode()) {
        throw new Error(OFFLINE_ATTACH_MESSAGE);
      }
      const { data: r } = await axiosInstance.post<{ data: StaffUser }>(USERS.ATTACH, payload);
      return withResolvedRole(r.data) as StaffWithSyncMeta;
    },
    onSuccess: (staff) => {
      qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) => {
        const list = (old ?? []).filter(Boolean);
        if (list.some((s) => s.id === staff.id || s.email === staff.email)) {
          return list.map((s) => (s.id === staff.id || s.email === staff.email ? staff : s));
        }
        return [staff, ...list];
      });
      showToast('success', 'Staff attached to organization');
      void refreshStaffCatalogSnapshot();
      qc.invalidateQueries({ queryKey: staffKeys.list() });
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to attach staff'));
    },
  });
}

export function useDetachStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const cached = qc.getQueryData<StaffWithSyncMeta[]>(staffKeys.list());
      const staff = cached?.filter(Boolean).find((s) => s.id === id);
      const authUser = store.getState().auth.user;
      const business = qc.getQueryData<BusinessWithSyncMeta>(businessKeys.mine());
      assertCanDetachStaffAccount(id, {
        currentUserId: authUser?.id ?? null,
        businessOwnerId: getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null }),
      });

      const isPendingCreate = Boolean(staff?._pendingSync && (staff._mutationType === 'create' || id < 0));
      if (isPendingCreate) {
        const mutationId = await localStaffStore.removeByStaffId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (isOfflineMode()) {
        throw new Error(OFFLINE_DETACH_MESSAGE);
      }

      await axiosInstance.post(USERS.DETACH(id));
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
        (old ?? []).filter(Boolean).filter((s) => s.id !== id),
      );
      showToast('success', 'Detached from organization. Their login remains; they no longer access this business.');
      void refreshStaffCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to detach staff'));
    },
  });
}
