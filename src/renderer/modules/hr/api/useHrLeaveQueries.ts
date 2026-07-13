import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  CreateLeaveRequestPayload,
  CreateLeaveTypePayload,
  HrLeaveBalance,
  HrLeaveRequest,
  HrLeaveType,
  LeaveDecisionPayload,
  UpdateLeaveTypePayload,
} from './hrTypes';

export function useHrLeaveTypes(enabled = true) {
  return useQuery({
    queryKey: hrKeys.leaveTypes(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.LEAVE_TYPES);
      return unwrapList<HrLeaveType>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrLeaveType() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateLeaveTypePayload) => {
      const { data } = await axiosInstance.post(HR.LEAVE_TYPES, payload);
      return unwrapEntity<HrLeaveType>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveTypes() });
      showToast('success', 'Leave type created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create leave type'),
  });
}

export function useUpdateHrLeaveType() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateLeaveTypePayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.LEAVE_TYPE(id), payload);
      return unwrapEntity<HrLeaveType>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveTypes() });
      showToast('success', 'Leave type updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update leave type'),
  });
}

export function useDeleteHrLeaveType() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(HR.LEAVE_TYPE(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.leaveTypes() });
      showToast('success', 'Leave type deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete leave type'),
  });
}

export function useHrLeaveBalances(
  filters?: { employee_id?: number; year?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.leaveBalances(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.LEAVE_BALANCES, { params: cleanParams(filters) });
      return unwrapList<HrLeaveBalance>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrLeaveRequests(
  filters?: { status?: string; employee_id?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.leaveRequests(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.LEAVE_REQUESTS, { params: cleanParams(filters) });
      return unwrapList<HrLeaveRequest>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrLeaveRequest() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateLeaveRequestPayload) => {
      const { data } = await axiosInstance.post(HR.LEAVE_REQUESTS, payload);
      return unwrapEntity<HrLeaveRequest>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-requests'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-balances'] });
      showToast('success', 'Leave request submitted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not submit leave request'),
  });
}

export function useApproveHrLeaveRequest() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: LeaveDecisionPayload & { id: number }) => {
      const { data } = await axiosInstance.post(HR.LEAVE_REQUEST_APPROVE(id), payload);
      return unwrapEntity<HrLeaveRequest>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-requests'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-balances'] });
      showToast('success', 'Leave request approved');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not approve leave request'),
  });
}

export function useRejectHrLeaveRequest() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: LeaveDecisionPayload & { id: number }) => {
      const { data } = await axiosInstance.post(HR.LEAVE_REQUEST_REJECT(id), payload);
      return unwrapEntity<HrLeaveRequest>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-requests'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-balances'] });
      showToast('success', 'Leave request rejected');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not reject leave request'),
  });
}

export function useCancelHrLeaveRequest() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(HR.LEAVE_REQUEST_CANCEL(id));
      return unwrapEntity<HrLeaveRequest>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-requests'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'leave-balances'] });
      showToast('success', 'Leave request cancelled');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not cancel leave request'),
  });
}
