import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  CreateEmployeeAccountPayload,
  CreateEmployeePayload,
  CreateEmployeeWithAccountPayload,
  HrAccountOptions,
  HrEmployee,
  UpdateEmployeePayload,
} from './hrTypes';

export function useHrEmployees(
  filters?: { q?: string; status?: string; department_id?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.employees(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.EMPLOYEES, { params: cleanParams(filters) });
      return unwrapList<HrEmployee>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrEmployee(id: number, enabled = true) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.EMPLOYEE(id));
      return unwrapEntity<HrEmployee>(data);
    },
    enabled: enabled && id > 0,
    ...listDefaults,
  });
}

export function useCreateHrEmployee() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEES, payload);
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Employee created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create employee'),
  });
}

export function useCreateHrEmployeeWithAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateEmployeeWithAccountPayload) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEES_WITH_ACCOUNT, payload);
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Employee and app login created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create employee with login'),
  });
}

export function useHrAccountOptions(enabled = true) {
  return useQuery({
    queryKey: hrKeys.accountOptions(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ACCOUNT_OPTIONS);
      return unwrapEntity<HrAccountOptions>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useUpdateHrEmployee() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateEmployeePayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.EMPLOYEE(id), payload);
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.employee(vars.id) });
      showToast('success', 'Employee updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update employee'),
  });
}

export function useDeleteHrEmployee() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, remove_account }: { id: number; remove_account?: boolean }) => {
      await axiosInstance.delete(HR.EMPLOYEE(id), {
        params: remove_account ? { remove_account: true } : undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Employee deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete employee'),
  });
}

export function useLinkHrEmployeeUser() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, user_id }: { id: number; user_id: number }) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEE_LINK_USER(id), { user_id });
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employee(vars.id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Staff user linked');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not link staff user'),
  });
}

export function useUnlinkHrEmployeeUser() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEE_UNLINK_USER(id));
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employee(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Login disconnected - staff account kept');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not unlink staff user'),
  });
}

export function useCreateHrEmployeeAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: CreateEmployeeAccountPayload & { id: number }) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEE_CREATE_ACCOUNT(id), payload);
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employee(vars.id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'App login ready');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create app login'),
  });
}

export function useRemoveHrEmployeeAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.EMPLOYEE_REMOVE_ACCOUNT(id));
      return unwrapEntity<HrEmployee>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employee(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'employees'] });
      void qc.invalidateQueries({ queryKey: hrKeys.accountOptions() });
      showToast('success', 'Detached from organization');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not detach from organization'),
  });
}
