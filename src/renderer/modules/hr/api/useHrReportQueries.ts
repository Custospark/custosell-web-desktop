import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  HrAuditLog,
  HrNssfReportRow,
  HrPayeReportRow,
  HrPayrollAffordability,
  HrPayrollAffordabilityRequest,
  HrStatutoryReport,
} from './hrTypes';

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

export interface HrAuditLogPage {
  items: HrAuditLog[];
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

interface HrAuditLogMeta {
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
}

export function useHrAuditLogs(
  filters: { subject_type?: string } = {},
  page = 1,
  perPage = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: hrKeys.auditLogs({ ...filters, page, per_page: perPage }),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.AUDIT_LOGS, {
        params: cleanParams({ ...filters, page, per_page: perPage }),
      });
      const body = data as { data?: unknown; meta?: HrAuditLogMeta };
      return {
        items: unwrapList<HrAuditLog>(body),
        currentPage: body.meta?.current_page ?? 1,
        perPage: body.meta?.per_page ?? perPage,
        total: body.meta?.total ?? 0,
        lastPage: body.meta?.last_page ?? 1,
      } satisfies HrAuditLogPage;
    },
    enabled,
    ...listDefaults,
  });
}
