import type { PipelineCalendarDateField, PipelineCalendarLead } from '../api/pipelineTypes';

export const DATE_FIELD_OPTIONS: { value: PipelineCalendarDateField; label: string; shortLabel: string; hint: string }[] = [
  { value: 'due', label: 'Due dates', shortLabel: 'Due', hint: 'Due date or expected close' },
  { value: 'start', label: 'Start dates', shortLabel: 'Start', hint: 'When work begins' },
  { value: 'close', label: 'Close dates', shortLabel: 'Close', hint: 'Expected close only' },
  { value: 'all', label: 'All dates', shortLabel: 'All', hint: 'Start, due, and close' },
];

export const DATE_KIND_STYLES: Record<string, { ring: string; label: string }> = {
  start: { ring: 'ring-sky-300', label: 'Start' },
  due: { ring: 'ring-amber-300', label: 'Due' },
  close: { ring: 'ring-violet-300', label: 'Close' },
};

export const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

export function formatTimeAmPm(time: string | null | undefined): string | null {
  if (!time) return null;
  if (time.includes('T')) {
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return null;
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

export function sortByTime(leads: PipelineCalendarLead[]): PipelineCalendarLead[] {
  return [...leads].sort((a, b) => {
    const ta = a.time ?? '';
    const tb = b.time ?? '';
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });
}
