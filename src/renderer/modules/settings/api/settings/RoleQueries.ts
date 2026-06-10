import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { ROLES } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { backupCatalogSnapshot, readCatalogBaseline, resolveAuthBusinessId } from '../../../../app/store/offline/catalogSnapshotUtils';
import { loadRoleCatalogBaseline, refreshRoleCatalogSnapshot } from '../../../../app/store/offline/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/mutationQueue';
import { localRolesStore, toRoleWithSyncMeta, type RoleWithSyncMeta } from '../../../../app/store/offline/localRolesStore';
import {
  completeOfflineCreateRoleInstant,
  completeOfflineDeleteRoleInstant,
  completeOfflineUpdatePendingRoleInstant,
  completeOfflineUpdateRoleInstant,
  shouldCompleteSettingsLocally,
} from '../../../../app/store/offline/completeOfflineSettings';
import type { Role, CreateRoleData, UpdateRoleData } from './RoleTypes';

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: () => [...roleKeys.lists()] as const,
};

async function loadLocalPendingRoles(): Promise<{
  upserts: RoleWithSyncMeta[];
  deletedIds: Set<number>;
}> {
  const pending = await localRolesStore.getPending();
  return {
    upserts: pending
      .filter((r) => r.mutationType !== 'delete')
      .map(toRoleWithSyncMeta)
      .filter(Boolean),
    deletedIds: new Set(pending.filter((r) => r.mutationType === 'delete').map((r) => r.role.id)),
  };
}

function mergeRoleLists(
  base: Role[] = [],
  local: RoleWithSyncMeta[] = [],
  deletedIds: Set<number> = new Set(),
): RoleWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Role[];
  const safeLocal = local.filter(Boolean) as RoleWithSyncMeta[];
  const localIds = new Set(safeLocal.map((r) => r.id));
  const localSlugs = new Set(safeLocal.map((r) => r.slug));
  const filtered = safeBase.filter((r) => !deletedIds.has(r.id) && !localIds.has(r.id) && !localSlugs.has(r.slug));
  return [...safeLocal, ...filtered] as RoleWithSyncMeta[];
}

async function readRolesBaseline(): Promise<Role[]> {
  return readCatalogBaseline('roles', roleKeys.list(), loadRoleCatalogBaseline);
}

export function useRoles() {
  return useQuery<RoleWithSyncMeta[]>({
    queryKey: roleKeys.list(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const baseline = await readRolesBaseline();
        const local = await loadLocalPendingRoles();
        return mergeRoleLists(baseline, local.upserts, local.deletedIds);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Role[] }>(ROLES.BASE, {
          timeout: 10000,
        });
        const list = Array.isArray(response.data) ? response.data : [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupCatalogSnapshot('roles', businessId, list);
        }
        const local = await loadLocalPendingRoles();
        return mergeRoleLists(list, local.upserts, local.deletedIds);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<RoleWithSyncMeta, AxiosError<ApiError>, CreateRoleData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      if (shouldCompleteSettingsLocally()) {
        return completeOfflineCreateRoleInstant(p);
      }
      try {
        const { data: r } = await axiosInstance.post<{ data: Role }>(ROLES.BASE, p, { timeout: 10000 });
        return r.data as RoleWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineCreateRoleInstant(p);
        }
        throw err;
      }
    },
    onSuccess: (role) => {
      if (!role) {
        qc.invalidateQueries({ queryKey: roleKeys.list() });
        return;
      }

      if (role._pendingSync) {
        qc.setQueryData<RoleWithSyncMeta[]>(roleKeys.list(), (old) => {
          const list = (old ?? []).filter(Boolean);
          if (list.some((r) => r.id === role.id || r.slug === role.slug)) return list;
          return [role, ...list];
        });
        showToast('success', 'Role saved — will sync when online');
      } else {
        void refreshRoleCatalogSnapshot();
        qc.invalidateQueries({ queryKey: roleKeys.list() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create role'));
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<RoleWithSyncMeta, AxiosError<ApiError>, { id: number; data: UpdateRoleData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const cached = queryClient.getQueryData<RoleWithSyncMeta[]>(roleKeys.list());
      const existing = cached?.filter(Boolean).find((r) => r.id === id);
      if (!existing) throw new Error('Role not found');

      const isPendingOnly = existing._pendingSync || id < 0;
      if (isPendingOnly) {
        return completeOfflineUpdatePendingRoleInstant(existing, data);
      }

      if (shouldCompleteSettingsLocally()) {
        return completeOfflineUpdateRoleInstant(existing, data);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: Role }>(ROLES.BY_ID(id), data, { timeout: 10000 });
        return r.data as RoleWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineUpdateRoleInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (role, { id }) => {
      if (!role) {
        qc.invalidateQueries({ queryKey: roleKeys.list() });
        return;
      }

      if (role._pendingSync) {
        qc.setQueryData<RoleWithSyncMeta[]>(roleKeys.list(), (old) =>
          (old ?? []).filter(Boolean).map((r) => r.id === id ? role : r),
        );
        showToast(
          'success',
          role._mutationType ? 'Corrected changes saved — will retry sync' : 'Changes saved — will sync when online',
        );
      } else {
        void refreshRoleCatalogSnapshot();
        qc.invalidateQueries({ queryKey: roleKeys.list() });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update role'));
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const cached = qc.getQueryData<RoleWithSyncMeta[]>(roleKeys.list());
      const role = cached?.filter(Boolean).find((r) => r.id === id);
      const isPendingOnly = role?._pendingSync || id < 0;

      if (isPendingOnly) {
        const mutationId = await localRolesStore.removeByRoleId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (shouldCompleteSettingsLocally()) {
        completeOfflineDeleteRoleInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(ROLES.BY_ID(id), { timeout: 10000 });
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) return;
        if (!axiosErr.response) {
          completeOfflineDeleteRoleInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<RoleWithSyncMeta[]>(roleKeys.list(), (old) =>
        (old ?? []).filter(Boolean).filter((r) => r.id !== id),
      );
      void refreshRoleCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete role'));
    },
  });
}
