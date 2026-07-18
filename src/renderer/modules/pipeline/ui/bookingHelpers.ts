export function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toUtcIso(localValue: string): string {
  if (!localValue) return '';
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function fmtTimeRange(startIso: string | null, endIso: string | null): string {
  const start = fmtTime(startIso);
  const end = fmtTime(endIso);
  if (!start) return '';
  if (!end) return start;
  return `${start} — ${end}`;
}

export function ensureHttps(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};
