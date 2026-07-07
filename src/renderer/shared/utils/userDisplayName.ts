/** First name for compact labels; full string when only one word. */
export function shortDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Unknown';
  return parts[0];
}
