/** Join first and last name for API payloads that expect a single full name. */
export function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

/** Split a stored full name into first and last parts for forms. */
export function splitFullName(name: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = name?.trim();
  if (!trimmed) return { firstName: '', lastName: '' };

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Friendly name for greetings and confirmations.
 * Uses the second name when the user has two or more names (e.g. "Jane Wanjiku" → "Wanjiku").
 */
export function getUserFirstName(name: string | null | undefined, fallback = 'User'): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];

  return parts[1] || fallback;
}
