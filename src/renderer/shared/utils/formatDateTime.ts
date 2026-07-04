/**
 * Format a date/time string from the API (ISO 8601 UTC) into readable formats.
 * All functions convert UTC → local browser time automatically.
 */

export function formatShiftTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatShiftDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShiftDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/*
  ┌────────────────────────────────────────────────────────────┐
  │                     FORMAT OPTIONS                         │
  ├──────────┬──────────────────────────────┬──────────────────┤
  │ Option   │ Example Output              │ Best For         │
  ├──────────┼──────────────────────────────┼──────────────────┤
  │ A        │ 11:49 AM                    │ Navbar (compact) │
  │ B        │ Jun 4, 2026                 │ Date-only cols   │
  │ C        │ Jun 4, 2026 · 11:49 AM      │ Shift cards      │
  │ D        │ Thu, Jun 4, 2026 11:49 AM   │ Receipts         │
  └──────────┴──────────────────────────────┴──────────────────┘

  All examples assume 2026-06-04T08:49:46.000000Z as input.
*/
