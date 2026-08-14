import type { TimeSlot } from '../api/useBookingQueries';

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatIsoTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatIsoDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA');
}

export function formatSlotRange(slot: TimeSlot): string {
  return `${formatIsoTime(slot.time_iso) || formatTime(slot.time)} - ${formatIsoTime(slot.end_time_iso) || formatTime(slot.end_time)}`;
}

export function utcPartsFromSlot(slot: TimeSlot): { date: string; time: string } {
  if (slot.time_iso) {
    const iso = new Date(slot.time_iso).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
  return { date: '', time: '' };
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu',
  5: 'Fri', 6: 'Sat', 7: 'Sun',
};

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
