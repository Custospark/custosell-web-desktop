import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { USERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { mutationQueue } from '../../../../app/store/offline/mutationQueue';
import { localStaffStore, toStaffWithSyncMeta, type StaffWithSyncMeta } from '../../../../app/store/offline/localStaffStore';
import type { RoleWithSyncMeta } from '../../../../app/store/offline/localRolesStore';
import {
  completeOfflineCreateStaffInstant,
  completeOfflineDeleteStaffInstant,
  completeOfflineUpdateStaffInstant,
  shouldCompleteSettingsLocally,
} from '../../../../app/store/offline/completeOfflineSettings';
import { roleKeys } from './RoleQueries';
import type { StaffUser, CreateStaffData, UpdateStaffData } from './StaffTypes';

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: () => [...staffKeys.lists()] as const,
};

function resolveRole(roleId: number): { id: number; name: string } | null {
  const roles = queryClient.getQueryData<RoleWithSyncMeta[]>(roleKeys.list()) ?? [];
  const role = roles.filter(Boolean).find((r) => r.id === roleId);
  return role ? { id: role.id, name: role.name } : null;
}

function withResolvedRole(staff: StaffUser): StaffUser {
  return {
    ...staff,
    role: staff.role ?? resolveRole(staff.role_id),
  };
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

export function useStaff() {
  return useQuery<StaffWithSyncMeta[]>({
    queryKey: staffKeys.list(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<StaffUser[]>(staffKeys.list()) ?? [];
        const local = await loadLocalPendingStaff();
        return mergeStaffLists(cached, local.upserts, local.deletedIds);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE, {
          timeout: 10000,
        });
        const local = await loadLocalPendingStaff();
        return mergeStaffLists(response.data, local.upserts, local.deletedIds);
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
      if (shouldCompleteSettingsLocally()) {
        return completeOfflineCreateStaffInstant(p, role);
      }
      try {
        const { data: r } = await axiosInstance.post<{ data: StaffUser }>(USERS.BASE, p, { timeout: 10000 });
        return withResolvedRole(r.data) as StaffWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineCreateStaffInstant(p, role);
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
        return { ...existing, ...data, role, _pendingSync: true } as StaffWithSyncMeta;
      }

      if (shouldCompleteSettingsLocally()) {
        return completeOfflineUpdateStaffInstant(existing, data, role);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: StaffUser }>(USERS.BY_ID(id), data, { timeout: 10000 });
        return withResolvedRole(r.data) as StaffWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
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
        showToast('success', 'Changes saved — will sync when online');
      } else {
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
      const isPendingOnly = staff?._pendingSync || id < 0;

      if (isPendingOnly) {
        const mutationId = await localStaffStore.removeByStaffId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (shouldCompleteSettingsLocally()) {
        completeOfflineDeleteStaffInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(USERS.BY_ID(id), { timeout: 10000 });
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) return;
        if (!axiosErr.response) {
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
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete staff'));
    },
  });
}
