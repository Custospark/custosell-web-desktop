/** The user's browser IANA timezone, e.g. "Africa/Kampala" or "America/New_York". */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}