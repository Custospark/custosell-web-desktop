export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const CALENDAR_WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatCalendarHeading(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function buildMonthCells(year: number, month: number): Array<{ day: number | null; dateKey?: string }> {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number | null; dateKey?: string }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: toDateKey(year, month, d) });
  }
  return cells;
}

export function isWeekend(dateKey: string): boolean {
  const day = new Date(`${dateKey}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

export function isPastDate(dateKey: string, todayKey: string): boolean {
  return dateKey < todayKey;
}
