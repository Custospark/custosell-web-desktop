import type { AccountingPeriod } from '../api/AccountingTypes';

export type ReportPeriodParams = {
  period_id?: number;
  date_from?: string;
  date_to?: string;
  /** Stable React Query cache segment */
  cacheKey: string;
};

const STORAGE_KEY = 'custosell.accounting.periodFilter';

export function loadStoredPeriodFilter(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function persistPeriodFilter(value: string): void {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function parsePeriodFilter(value: string): number[] {
  if (!value.trim()) return [];
  return value.split(',').map((id) => Number(id)).filter((id) => id > 0);
}

export function reportingYearBounds(periods: AccountingPeriod[] | undefined): { startYear: number; endYear: number } {
  const currentYear = new Date().getFullYear();
  if (!periods?.length) {
    return { startYear: currentYear - 5, endYear: currentYear + 1 };
  }

  const years = periods.map((p) => new Date(p.start_date).getFullYear());
  return {
    startYear: Math.min(...years),
    endYear: Math.max(currentYear + 1, ...years),
  };
}

export function periodIdsForYear(
  periods: Array<Pick<AccountingPeriod, 'id' | 'start_date'>>,
  year: number,
): number[] {
  return periods
    .filter((p) => new Date(p.start_date).getFullYear() === year)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .map((p) => p.id);
}

export function periodFilterToReportParams(
  periodFilter: string,
  periods: AccountingPeriod[] | undefined,
): ReportPeriodParams | undefined {
  const ids = parsePeriodFilter(periodFilter);
  if (ids.length === 0 || !periods?.length) return undefined;

  if (ids.length === 1) {
    return { period_id: ids[0], cacheKey: `period-${ids[0]}` };
  }

  const selected = periods
    .filter((p) => ids.includes(p.id))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (selected.length === 0) return undefined;

  const dateFrom = selected[0].start_date.slice(0, 10);
  const dateTo = selected[selected.length - 1].end_date.slice(0, 10);

  return {
    date_from: dateFrom,
    date_to: dateTo,
    cacheKey: `range-${dateFrom}-${dateTo}`,
  };
}

export function buildReportQueryString(params?: ReportPeriodParams): string {
  if (!params) return '';
  if (params.period_id && !params.date_from) {
    return `?period_id=${params.period_id}`;
  }
  if (params.date_from && params.date_to) {
    return `?date_from=${encodeURIComponent(params.date_from)}&date_to=${encodeURIComponent(params.date_to)}`;
  }
  return '';
}

export function selectionLabel(periodFilter: string, periods: AccountingPeriod[] | undefined): string {
  const ids = parsePeriodFilter(periodFilter);
  if (!ids.length || !periods?.length) return '';

  const selected = periods
    .filter((p) => ids.includes(p.id))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (!selected.length) return '';
  if (selected.length === 1) return selected[0].name;

  const first = selected[0];
  const last = selected[selected.length - 1];
  return `${first.start_date.slice(0, 7)} – ${last.end_date.slice(0, 7)}`;
}
