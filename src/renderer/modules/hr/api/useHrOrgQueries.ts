import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  CreateDepartmentPayload,
  CreatePositionPayload,
  HrDepartment,
  HrPosition,
  UpdateDepartmentPayload,
  UpdatePositionPayload,
} from './hrTypes';

export function useHrDepartments(enabled = true) {
  return useQuery({
    queryKey: hrKeys.departments(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.DEPARTMENTS);
      return unwrapList<HrDepartment>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrDepartment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateDepartmentPayload) => {
      const { data } = await axiosInstance.post(HR.DEPARTMENTS, payload);
      return unwrapEntity<HrDepartment>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments() });
      showToast('success', 'Department created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create department'),
  });
}

export function useUpdateHrDepartment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateDepartmentPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.DEPARTMENT(id), payload);
      return unwrapEntity<HrDepartment>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments() });
      showToast('success', 'Department updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update department'),
  });
}

export function useDeleteHrDepartment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.DEPARTMENT(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.departments() });
      void qc.invalidateQueries({ queryKey: hrKeys.positions() });
      showToast('success', 'Department deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete department'),
  });
}

/* ─── Positions ─── */

export function useHrPositions(departmentId?: number | null, enabled = true) {
  return useQuery({
    queryKey: hrKeys.positions(departmentId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.POSITIONS, {
        params: cleanParams({ department_id: departmentId ?? undefined }),
      });
      return unwrapList<HrPosition>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrPosition() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreatePositionPayload) => {
      const { data } = await axiosInstance.post(HR.POSITIONS, payload);
      return unwrapEntity<HrPosition>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'positions'] });
      void qc.invalidateQueries({ queryKey: hrKeys.departments() });
      showToast('success', 'Position created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create position'),
  });
}

export function useUpdateHrPosition() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdatePositionPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.POSITION(id), payload);
      return unwrapEntity<HrPosition>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'positions'] });
      showToast('success', 'Position updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update position'),
  });
}

export function useDeleteHrPosition() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.POSITION(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'positions'] });
      showToast('success', 'Position deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete position'),
  });
}
