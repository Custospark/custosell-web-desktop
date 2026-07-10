import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import type {
  ClockPayload,
  CreateCompensationPayload,
  CreateDepartmentPayload,
  CreateEmployeeAccountPayload,
  CreateEmployeePayload,
  CreateEmployeeWithAccountPayload,
  CreateLeaveRequestPayload,
  CreateLeaveTypePayload,
  CreateOnboardingTaskPayload,
  CreateOnboardingTemplatePayload,
  CreatePayRunPayload,
  CreatePositionPayload,
  CreateReviewPayload,
  CreateSalaryStructurePayload,
  HrAccountOptions,
  HrAttendanceDay,
  HrAttendanceEvent,
  HrAttendanceRegister,
  HrAuditLog,
  HrCompensation,
  HrDepartment,
  HrEmployee,
  HrLeaveBalance,
  HrLeaveRequest,
  HrLeaveType,
  HrNssfReportRow,
  HrOnboardingTask,
  HrOnboardingTemplate,
  HrPayeReportRow,
  HrPayrollAffordability,
  HrPayrollAffordabilityRequest,
  HrPayRun,
  HrPayslip,
  HrPerformanceRosterRow,
  HrPerformanceSnapshot,
  HrPosition,
  HrReview,
  HrSalaryStructure,
  HrStatutoryReport,
  LeaveDecisionPayload,
  UpdateAttendanceDayPayload,
  UpdateDepartmentPayload,
  UpdateEmployeePayload,
  UpdateLeaveTypePayload,
  UpdateOnboardingTaskPayload,
  UpdatePayRunPayload,
  UpdatePositionPayload,
  UpdateReviewPayload,
  UpdateSalaryStructurePayload,
} from './hrTypes';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: unknown };
    if (Array.isArray(body.data)) return body.data as T[];
  }
  return [];
}

function cleanParams(params?: Record<string, string | number | undefined | null>) {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

const listDefaults = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

function useHrErrorToast() {
  const { showToast } = useToast();
  return (err: AxiosError<{ message?: string }>, fallback: string) => {
    showToast('error', sanitizeErrorMessage(err, fallback));
  };
}

/* ─── Departments ─── */

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

/* ─── Employees ─── */

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
      showToast('success', 'Login disconnected — staff account kept');
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
      showToast('success', 'App login created');
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
      showToast('success', 'App login removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not remove app login'),
  });
}

/* ─── Attendance ─── */

export function useHrAttendance(
  filters?: { work_date?: string; employee_id?: number; from?: string; to?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.attendance(filters),
    queryFn: async () => {
      const dateParams = cleanParams({
        employee_id: filters?.employee_id,
        date_from: filters?.work_date ?? filters?.from,
        date_to: filters?.work_date ?? filters?.to,
      });
      const [registerRes, eventsRes] = await Promise.all([
        axiosInstance.get(HR.ATTENDANCE_REGISTER, { params: dateParams }),
        axiosInstance.get(HR.ATTENDANCE_EVENTS, { params: dateParams }),
      ]);
      return {
        days: unwrapList<HrAttendanceDay>(registerRes.data),
        events: unwrapList<HrAttendanceEvent>(eventsRes.data),
      } satisfies HrAttendanceRegister;
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrClock() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: ClockPayload) => {
      const { data } = await axiosInstance.post(HR.ATTENDANCE_CLOCK, payload);
      return unwrapEntity<HrAttendanceEvent>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'attendance'] });
      const label = vars.type.replace('_', ' ');
      showToast('success', `Clock ${label} recorded`);
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not record clock event'),
  });
}

export function useUpdateHrAttendanceDay() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: UpdateAttendanceDayPayload) => {
      const { data } = await axiosInstance.put(HR.ATTENDANCE_DAYS, payload);
      return unwrapEntity<HrAttendanceDay>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'attendance'] });
      showToast('success', 'Attendance day updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update attendance day'),
  });
}

export function useImportHrTimesheets() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: { date_from: string; date_to: string; employee_id?: number }) => {
      const { data } = await axiosInstance.post(HR.ATTENDANCE_IMPORT_TIMESHEETS, payload);
      return unwrapEntity<{ imported: number; skipped: number }>(data);
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'attendance'] });
      showToast('success', `Imported ${result.imported} timesheet day(s)`);
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not import timesheets'),
  });
}

export function useHrPosShifts(
  filters?: { work_date?: string; employee_id?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: [...hrKeys.all, 'pos-shifts', filters] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ATTENDANCE_SHIFTS, {
        params: cleanParams({
          work_date: filters?.work_date,
          employee_id: filters?.employee_id,
        }),
      });
      return unwrapList<{
        id: number;
        user_id: number;
        employee_id: number | null;
        employee_name: string | null;
        clock_in: string | null;
        clock_out: string | null;
        status: string;
        total_sales: number;
      }>(data);
    },
    enabled,
    ...listDefaults,
  });
}

/* ─── Leave ─── */

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

/* ─── Payroll ─── */

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

/* ─── Talent ─── */

export function useHrOnboardingTemplates(enabled = true) {
  return useQuery({
    queryKey: hrKeys.onboardingTemplates(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ONBOARDING_TEMPLATES);
      return unwrapList<HrOnboardingTemplate>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateOnboardingTemplatePayload) => {
      const { data } = await axiosInstance.post(HR.ONBOARDING_TEMPLATES, payload);
      return unwrapEntity<HrOnboardingTemplate>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.onboardingTemplates() });
      showToast('success', 'Onboarding template created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create template'),
  });
}

export function useHrOnboardingTasks(filters?: { employee_id?: number; status?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.onboardingTasks(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ONBOARDING_TASKS, { params: cleanParams(filters) });
      return unwrapList<HrOnboardingTask>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrOnboardingTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateOnboardingTaskPayload) => {
      const { data } = await axiosInstance.post(HR.ONBOARDING_TASKS, payload);
      return unwrapEntity<HrOnboardingTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'onboarding-tasks'] });
      showToast('success', 'Onboarding task created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create task'),
  });
}

export function useUpdateHrOnboardingTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateOnboardingTaskPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.ONBOARDING_TASK(id), payload);
      return unwrapEntity<HrOnboardingTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'onboarding-tasks'] });
      showToast('success', 'Task updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update task'),
  });
}

export function useHrReviews(filters?: { employee_id?: number; status?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.reviews(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.REVIEWS, { params: cleanParams(filters) });
      return unwrapList<HrReview>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await axiosInstance.post(HR.REVIEWS, payload);
      return unwrapEntity<HrReview>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      showToast('success', 'Review created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create review'),
  });
}

export function useUpdateHrReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateReviewPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.REVIEW(id), payload);
      return unwrapEntity<HrReview>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      showToast('success', 'Review updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update review'),
  });
}

export type HrPerformancePeriodFilters = {
  period?: string;
  from?: string;
  to?: string;
};

export function useHrPerformanceRoster(filters?: HrPerformancePeriodFilters, enabled = true) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceRoster(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE, { params: cleanParams(params) });
      return unwrapList<HrPerformanceRosterRow>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrPerformanceEmployee(
  employeeId: number | null | undefined,
  filters?: HrPerformancePeriodFilters,
  enabled = true,
) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceEmployee(employeeId ?? 0, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE_EMPLOYEE(employeeId!), {
        params: cleanParams(params),
      });
      return unwrapEntity<HrPerformanceSnapshot>(data);
    },
    enabled: enabled && !!employeeId,
    ...listDefaults,
  });
}

export function useHrPerformanceByUser(
  userId: number | null | undefined,
  filters?: HrPerformancePeriodFilters,
  enabled = true,
) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceByUser(userId ?? 0, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE_BY_USER(userId!), {
        params: cleanParams(params),
      });
      return unwrapEntity<HrPerformanceSnapshot>(data);
    },
    enabled: enabled && !!userId,
    ...listDefaults,
  });
}

export function useSeedHrPerformanceReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({
      employeeId,
      period,
      from,
      to,
    }: {
      employeeId: number;
      period?: string;
      from?: string;
      to?: string;
    }) => {
      const { data } = await axiosInstance.post(
        HR.PERFORMANCE_SEED_REVIEW(employeeId),
        null,
        { params: cleanParams({ period, from, to }) },
      );
      return unwrapEntity<{ review: HrReview; snapshot: HrPerformanceSnapshot }>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'performance'] });
      showToast('success', 'Draft review seeded from Pipeline/Projects work');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not seed review from work data'),
  });
}

/* ─── Reports & audit ─── */

export function useHrPayeReport(
  filters?: { pay_run_id?: number; period_start?: string; period_end?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.reportPaye(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.REPORTS_PAYE, { params: cleanParams(filters) });
      if (data && typeof data === 'object' && 'rows' in (data as object)) {
        return data as HrStatutoryReport;
      }
      const rows = unwrapList<HrPayeReportRow>(data);
      return { rows, totals: {} } satisfies HrStatutoryReport;
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrNssfReport(
  filters?: { pay_run_id?: number; period_start?: string; period_end?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.reportNssf(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.REPORTS_NSSF, { params: cleanParams(filters) });
      if (data && typeof data === 'object' && 'rows' in (data as object)) {
        return data as HrStatutoryReport;
      }
      const rows = unwrapList<HrNssfReportRow>(data);
      return { rows, totals: {} } satisfies HrStatutoryReport;
    },
    enabled,
    ...listDefaults,
  });
}

function buildAffordabilityBody(filters?: HrPayrollAffordabilityRequest) {
  const body: Record<string, unknown> = {
    horizon_months: filters?.horizon_months ?? 3,
    period_id: filters?.period_id ?? null,
  };
  if (filters?.as_of_date) body.as_of_date = filters.as_of_date;
  if (filters?.hire) body.hire = filters.hire;
  return body;
}

/** POST report fetch keyed by as-of, horizon, and optional hire scenario. */
export function useHrPayrollAffordability(
  filters?: HrPayrollAffordabilityRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.reportAffordability(filters ?? { horizon_months: 3 }),
    queryFn: async () => {
      const { data } = await axiosInstance.post(HR.REPORTS_AFFORDABILITY, buildAffordabilityBody(filters));
      return unwrapEntity<HrPayrollAffordability>(data);
    },
    enabled,
    ...listDefaults,
  });
}

/** One-shot recalculate (e.g. hire what-if) without changing the baseline query cache key. */
export function useHrPayrollAffordabilityMutation() {
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload?: HrPayrollAffordabilityRequest) => {
      const { data } = await axiosInstance.post(HR.REPORTS_AFFORDABILITY, buildAffordabilityBody(payload));
      return unwrapEntity<HrPayrollAffordability>(data);
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not load payroll affordability'),
  });
}

export function useHrAuditLogs(filters?: { subject_type?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.auditLogs(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.AUDIT_LOGS, { params: cleanParams(filters) });
      return unwrapList<HrAuditLog>(data);
    },
    enabled,
    ...listDefaults,
  });
}
