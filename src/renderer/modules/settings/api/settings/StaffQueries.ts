import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { USERS } from '../../../../shared/api/endpoints/endpoints';
import type { StaffUser, CreateStaffData, UpdateStaffData } from './StaffTypes';

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: () => [...staffKeys.lists()] as const,
};

export function useStaff() {
  return useQuery<StaffUser[]>({
    queryKey: staffKeys.list(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE);
      return response.data;
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<StaffUser, AxiosError<ApiError>, CreateStaffData, { previous: StaffUser[] | undefined }>({
    mutationFn: async (p) => {
      const { data: r } = await axiosInstance.post<{ data: StaffUser }>(USERS.BASE, p);
      return r.data;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: staffKeys.list() });
      const previous = qc.getQueryData<StaffUser[]>(staffKeys.list());
      qc.setQueryData<StaffUser[]>(staffKeys.list(), (old) => [...(old ?? []), {
        id: Date.now(), business_id: 0, role_id: p.role_id, name: p.name, email: p.email,
        phone: p.phone ?? null, is_active: true, role: null, created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as StaffUser]);
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(staffKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to create staff');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: staffKeys.list() }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<StaffUser, AxiosError<ApiError>, { id: number; data: UpdateStaffData }, { previous: StaffUser[] | undefined }>({
    mutationFn: async ({ id, data }) => {
      const { data: r } = await axiosInstance.put<{ data: StaffUser }>(USERS.BY_ID(id), data);
      return r.data;
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: staffKeys.list() });
      const previous = qc.getQueryData<StaffUser[]>(staffKeys.list());
      qc.setQueryData<StaffUser[]>(staffKeys.list(), (old) => (old ?? []).map((s) => s.id === id ? { ...s, ...data } as StaffUser : s));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(staffKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to update staff');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: staffKeys.list() }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number, { previous: StaffUser[] | undefined }>({
    mutationFn: async (id) => { await axiosInstance.delete(USERS.BY_ID(id)); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: staffKeys.list() });
      const previous = qc.getQueryData<StaffUser[]>(staffKeys.list());
      qc.setQueryData<StaffUser[]>(staffKeys.list(), (old) => (old ?? []).filter((s) => s.id !== id));
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (e.response?.status === 404) {
        qc.invalidateQueries({ queryKey: staffKeys.list() });
        return;
      }
      if (ctx?.previous) qc.setQueryData(staffKeys.list(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to delete staff');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: staffKeys.list() }),
  });
}
