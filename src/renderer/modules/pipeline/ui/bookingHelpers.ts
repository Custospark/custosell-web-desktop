function pad2(n: number): string { return String(n).padStart(2, '0'); }

function extractDateParts(iso: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const p = extractDateParts(iso);
  if (!p) return '';
  return new Date(p.y, p.mo - 1, p.d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const p = extractDateParts(iso);
  if (!p) return '';
  const period = p.h >= 12 ? 'PM' : 'AM';
  const hour12 = p.h === 0 ? 12 : p.h > 12 ? p.h - 12 : p.h;
  return `${hour12}:${pad2(p.mi)} ${period}`;
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
