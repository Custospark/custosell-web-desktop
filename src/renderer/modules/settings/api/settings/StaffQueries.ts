import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { USERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, isOfflineMode, sanitizeErrorMessage } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { backupCatalogSnapshot, readCatalogBaseline, resolveAuthBusinessId } from '../../../../app/store/offline/catalogSnapshotUtils';
import { loadStaffCatalogBaseline, refreshStaffCatalogSnapshot } from '../../../../app/store/offline/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/mutationQueue';
import { localStaffStore, toStaffWithSyncMeta, type StaffWithSyncMeta } from '../../../../app/store/offline/localStaffStore';
import type { RoleWithSyncMeta } from '../../../../app/store/offline/localRolesStore';
import type { BusinessWithSyncMeta } from '../../../../app/store/offline/localBusinessSettingsStore';
import { store } from '../../../../app/store/store';
import {
  completeOfflineCreateStaffInstant,
  completeOfflineDeleteStaffInstant,
  completeOfflineUpdatePendingStaffInstant,
  completeOfflineUpdateStaffInstant,
} from '../../../../app/store/offline/completeOfflineSettings';
import { roleKeys } from './RoleQueries';
import { businessKeys } from './BusinessQueries';
import type { StaffUser, CreateStaffData, UpdateStaffData } from './StaffTypes';
import { assertCanDeleteStaffAccount, getBusinessOwnerId } from './staffAccountRules';

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

function withResolvedRole(staff: StaffUser): StaffUser {
  return {
    ...staff,
    role: staff.role ?? resolveRole(staff.role_id),
  };
}

async function findServerStaffByEmail(email: string): Promise<StaffWithSyncMeta | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE, {
    timeout: 10000,
  });
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
        const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE, {
          timeout: 10000,
        });
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
        const { data: r } = await axiosInstance.post<{ data: StaffUser }>(USERS.BASE, p, { timeout: 10000 });
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
        showToast('success', 'Staff saved — will sync when online');
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
        const { data: r } = await axiosInstance.put<{ data: StaffUser }>(USERS.BY_ID(id), data, { timeout: 10000 });
        return withResolvedRole(r.data) as StaffWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response && isOfflineMode()) {
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
          staff._mutationType ? 'Corrected changes saved — will retry sync' : 'Changes saved — will sync when online',
        );
      } else {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
          (old ?? []).filter(Boolean).map((s) => s.id === id ? staff : s),
        );
        showToast('success', 'Staff updated');
        void refreshStaffCatalogSnapshot();
        qc.invalidateQueries({ queryKey: staffKeys.list() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update staff'));
    },
  });
}

export function useDeleteStaff() {
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
      assertCanDeleteStaffAccount(id, {
        currentUserId: authUser?.id ?? null,
        businessOwnerId: getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null }),
      });
      const isPendingOnly = staff?._pendingSync || id < 0;

      if (isPendingOnly) {
        if (id > 0 && staff?._mutationType !== 'create' && !isOfflineMode()) {
          try {
            await axiosInstance.delete(USERS.BY_ID(id), { timeout: 10000 });
            const mutationId = await localStaffStore.removeByStaffId(id);
            if (mutationId) {
              await mutationQueue.removeById(mutationId);
            }
            return;
          } catch (err: unknown) {
            const axiosErr = err as AxiosError;
            if (axiosErr.response?.status === 404) {
              const mutationId = await localStaffStore.removeByStaffId(id);
              if (mutationId) {
                await mutationQueue.removeById(mutationId);
              }
              return;
            }
            if (axiosErr.response) {
              throw err;
            }
          }
        }

        const mutationId = await localStaffStore.removeByStaffId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (isOfflineMode()) {
        completeOfflineDeleteStaffInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(USERS.BY_ID(id), { timeout: 10000 });
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) return;
        if (!axiosErr.response && isOfflineMode()) {
          completeOfflineDeleteStaffInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
        (old ?? []).filter(Boolean).filter((s) => s.id !== id),
      );
      void refreshStaffCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete staff'));
    },
  });
}
