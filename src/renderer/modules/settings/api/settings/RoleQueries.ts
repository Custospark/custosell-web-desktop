import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { ROLES } from '../../../../shared/api/endpoints/endpoints';
import type { Role, CreateRoleData, UpdateRoleData } from './RoleTypes';

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: () => [...roleKeys.lists()] as const,
};

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: roleKeys.list(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Role[] }>(ROLES.BASE);
      return response.data;
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Role, AxiosError<ApiError>, CreateRoleData, { previous: Role[] | undefined }>({
    mutationFn: async (p) => {
      const { data: r } = await axiosInstance.post<{ data: Role }>(ROLES.BASE, p);
      return r.data;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: roleKeys.list() });
      const previous = qc.getQueryData<Role[]>(roleKeys.list());
      qc.setQueryData<Role[]>(roleKeys.list(), (old) => [...(old ?? []), {
        id: Date.now(), business_id: 0, name: p.name, slug: p.slug,
        description: p.description ?? null, permissions: p.permissions, is_default: p.is_default ?? false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      } as Role]);
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(roleKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to create role');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: roleKeys.list() }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Role, AxiosError<ApiError>, { id: number; data: UpdateRoleData }, { previous: Role[] | undefined }>({
    mutationFn: async ({ id, data }) => {
      const { data: r } = await axiosInstance.put<{ data: Role }>(ROLES.BY_ID(id), data);
      return r.data;
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: roleKeys.list() });
      const previous = qc.getQueryData<Role[]>(roleKeys.list());
      qc.setQueryData<Role[]>(roleKeys.list(), (old) => (old ?? []).map((r) => r.id === id ? { ...r, ...data } as Role : r));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(roleKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to update role');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: roleKeys.list() }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number, { previous: Role[] | undefined }>({
    mutationFn: async (id) => { await axiosInstance.delete(ROLES.BY_ID(id)); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: roleKeys.list() });
      const previous = qc.getQueryData<Role[]>(roleKeys.list());
      qc.setQueryData<Role[]>(roleKeys.list(), (old) => (old ?? []).filter((r) => r.id !== id));
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (e.response?.status === 404) {
        qc.invalidateQueries({ queryKey: roleKeys.list() });
        return;
      }
      if (ctx?.previous) qc.setQueryData(roleKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to delete role');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: roleKeys.list() }),
  });
}
