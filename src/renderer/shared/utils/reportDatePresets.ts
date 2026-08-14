export type ReportDatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

/** Calendar day key in UTC - sale_date/expense_date are stored in UTC. */
function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveReportDateRange(
  preset: ReportDatePreset,
  customFrom: string,
  customTo: string,
): { dateFrom: string; dateTo: string } {
  const nowMs = Date.now();
  const end = toDateKey(new Date(nowMs));

  if (preset === 'today') {
    return { dateFrom: end, dateTo: end };
  }

  if (preset === 'week') {
    const utcDay = new Date(nowMs).getUTCDay();
    const diff = utcDay === 0 ? 6 : utcDay - 1;
    const start = new Date(nowMs - diff * 86400000);
    return { dateFrom: toDateKey(start), dateTo: end };
  }

  if (preset === 'month') {
    const d = new Date(nowMs);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    return { dateFrom: toDateKey(start), dateTo: end };
  }

  if (preset === 'year') {
    const d = new Date(nowMs);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { dateFrom: toDateKey(start), dateTo: end };
  }

  return {
    dateFrom: customFrom || end,
    dateTo: customTo || end,
  };
}

export function isValidDateRange(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return false;
  return dateFrom <= dateTo;
}

export const REPORT_DATE_PRESETS: { id: ReportDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];
