import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  ClockPayload,
  HrAttendanceDay,
  HrAttendanceEvent,
  HrAttendanceRegister,
  UpdateAttendanceDayPayload,
} from './hrTypes';

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
