export type ReportDatePreset = 'today' | 'week' | 'month' | 'custom';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveReportDateRange(
  preset: ReportDatePreset,
  customFrom: string,
  customTo: string,
): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const end = toDateKey(today);

  if (preset === 'today') {
    return { dateFrom: end, dateTo: end };
  }

  if (preset === 'week') {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { dateFrom: toDateKey(start), dateTo: end };
  }

  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
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
  { id: 'custom', label: 'Custom' },
];
