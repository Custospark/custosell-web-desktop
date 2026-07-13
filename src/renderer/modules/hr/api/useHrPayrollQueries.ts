import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  CreateCompensationPayload,
  CreatePayRunPayload,
  CreateSalaryStructurePayload,
  HrCompensation,
  HrPayRun,
  HrPayslip,
  HrSalaryStructure,
  UpdatePayRunPayload,
  UpdateSalaryStructurePayload,
} from './hrTypes';

export function useHrSalaryStructures(enabled = true) {
  return useQuery({
    queryKey: hrKeys.salaryStructures(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.SALARY_STRUCTURES);
      return unwrapList<HrSalaryStructure>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrSalaryStructure() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateSalaryStructurePayload) => {
      const { data } = await axiosInstance.post(HR.SALARY_STRUCTURES, payload);
      return unwrapEntity<HrSalaryStructure>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.salaryStructures() });
      showToast('success', 'Salary structure created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create salary structure'),
  });
}

export function useUpdateHrSalaryStructure() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSalaryStructurePayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.SALARY_STRUCTURE(id), payload);
      return unwrapEntity<HrSalaryStructure>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.salaryStructures() });
      showToast('success', 'Salary structure updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update salary structure'),
  });
}

export function useDeleteHrSalaryStructure() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.SALARY_STRUCTURE(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.salaryStructures() });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'compensations'] });
      showToast('success', 'Salary structure deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete salary structure'),
  });
}

export function useHrCompensations(filters?: { employee_id?: number }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.compensations(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.COMPENSATIONS, { params: cleanParams(filters) });
      return unwrapList<HrCompensation>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrCompensation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateCompensationPayload) => {
      const { data } = await axiosInstance.post(HR.COMPENSATIONS, payload);
      return unwrapEntity<HrCompensation>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'compensations'] });
      showToast('success', 'Compensation saved');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not save compensation'),
  });
}

export function useDeleteHrCompensation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.COMPENSATION(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'compensations'] });
      showToast('success', 'Compensation deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete compensation'),
  });
}

export function useHrPayRuns(filters?: { status?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.payRuns(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PAY_RUNS, { params: cleanParams(filters) });
      return unwrapList<HrPayRun>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrPayRun(id: number, enabled = true) {
  return useQuery({
    queryKey: hrKeys.payRun(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PAY_RUN(id));
      return unwrapEntity<HrPayRun>(data);
    },
    enabled: enabled && id > 0,
    ...listDefaults,
  });
}

export function useCreateHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreatePayRunPayload) => {
      const { data } = await axiosInstance.post(HR.PAY_RUNS, payload);
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      showToast('success', 'Pay run created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create pay run'),
  });
}

export function useUpdateHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdatePayRunPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.PAY_RUN(id), payload);
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (payRun) => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(payRun.id) });
      showToast('success', 'Pay run period updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update pay run'),
  });
}

export function useDeleteHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.PAY_RUN(id));
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      void qc.removeQueries({ queryKey: hrKeys.payRun(id) });
      showToast('success', 'Pay run deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete pay run'),
  });
}

export function useCalculateHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_CALCULATE(id));
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      showToast('success', 'Pay run calculated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not calculate pay run'),
  });
}

export function useApproveHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_APPROVE(id));
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      showToast('success', 'Pay run approved');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not approve pay run'),
  });
}

export function usePostHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_POST(id));
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reports'] });
      showToast('success', 'Pay run posted to accounting');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not post pay run'),
  });
}

export function useSettleHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({
      id,
      funding_account_code,
    }: {
      id: number;
      funding_account_code?: string;
    }) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_SETTLE(id), {
        funding_account_code,
      });
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(vars.id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      showToast('success', 'Net pay settled in accounting');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not settle pay run'),
  });
}

export function useRemitHrStatutory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({
      id,
      funding_account_code,
    }: {
      id: number;
      funding_account_code?: string;
    }) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_REMIT_STATUTORY(id), {
        funding_account_code,
      });
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(vars.id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      showToast('success', 'PAYE & NSSF remitted in accounting');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not remit statutory amounts'),
  });
}

export function useVoidHrPayRun() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.PAY_RUN_VOID(id));
      return unwrapEntity<HrPayRun>(data);
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: hrKeys.payRun(id) });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'pay-runs'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reports'] });
      showToast('success', 'Pay run voided and journals reversed');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not void pay run'),
  });
}

export function useHrPayslip(id: number) {
  return useQuery({
    queryKey: hrKeys.payslip(id),
    queryFn: async () => {
      // Payslips are embedded on pay-run lines; dedicated fetch is reserved for a future endpoint.
      return null as HrPayslip | null;
    },
    enabled: false, // Payslip endpoint not shipped yet; keep hook for future use.
    ...listDefaults,
  });
}
