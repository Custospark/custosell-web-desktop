export type ReportPeriodParams = {
  period_id?: number;
  date_from?: string;
  date_to?: string;
  /** Stable React Query cache segment */
  cacheKey: string;
};

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

/** ISO date strings for the current month (first and last day). */
export function currentMonthBounds(): { from: string; to: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, d.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

/**
 * Build a ReportPeriodParams from a simple date range. Pass date_from/date_to
 * straight to the backend - no period-id juggling.
 */
export function dateRangeToReportParams(from: string, to: string): ReportPeriodParams | undefined {
  if (!from && !to) return undefined;
  if (from && to) {
    return { date_from: from, date_to: to, cacheKey: `range-${from}-${to}` };
  }
  // One-sided range.
  const p: ReportPeriodParams = { cacheKey: `range-${from || ''}-${to || ''}` };
  if (from) p.date_from = from;
  if (to) p.date_to = to;
  return p;
}
