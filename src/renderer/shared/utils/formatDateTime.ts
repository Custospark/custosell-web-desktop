/**
 * Format a date/time string from the API (ISO 8601 UTC) into readable formats.
 * All functions convert UTC → local browser time automatically.
 */

function parseApiDate(iso: string): Date {
  // Date-only (YYYY-MM-DD) - parse as local calendar day to avoid UTC midnight shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    const [y, m, d] = iso.trim().split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function formatShiftTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseApiDate(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatShiftDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseApiDate(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShiftDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseApiDate(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const hasTime = /T\d{2}:\d{2}/.test(iso);
  if (!hasTime) return datePart;

  return `${datePart} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

/** Inclusive range for leave periods, pay runs, etc. */
export function formatShiftDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const a = formatShiftDate(start);
  const b = formatShiftDate(end);
  if (a === '-' && b === '-') return '-';
  if (a === '-') return b;
  if (b === '-') return a;
  return `${a} → ${b}`;
}

/** Compact relative time: "just now", "5m ago", "2h ago", "3d ago", else a short date. */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
