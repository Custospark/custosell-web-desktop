/** First token of the user's display name, for friendly confirmations. */
export function getUserFirstName(name: string | null | undefined, fallback = 'User'): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  const first = trimmed.split(/\s+/)[0];
  return first || fallback;
}
