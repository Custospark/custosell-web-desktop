import type { AttendanceDayStatus } from '../api/hrTypes';

export type HistoryRange = 'week' | 'month';

export const STATUS_COLORS: Record<AttendanceDayStatus, string> = {
  present: '#10b981',
  absent: '#ef4444',
  leave: '#f59e0b',
  holiday: '#6366f1',
};

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

export function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function shortDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function startOfMonthIso(d = new Date()) {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonthIso(d = new Date()) {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
