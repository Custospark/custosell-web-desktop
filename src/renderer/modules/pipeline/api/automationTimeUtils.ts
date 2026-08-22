const pad = (n: number): string => String(n).padStart(2, '0');

const validTime = (value: string): boolean => /^\d{2}:\d{2}$/.test(value);

/**
 * Convert a browser-local wall-clock "HH:MM" to UTC "HH:MM".
 * Uses the user's browser timezone via getTimezoneOffset().
 * e.g. "09:00" in Africa/Kampala (UTC+3) -> "06:00".
 */
export function localTimeToUtc(localTime: string): string {
  if (!validTime(localTime)) return localTime;
  const [h, m] = localTime.split(':').map(Number);
  const localTotal = h * 60 + m;
  // getTimezoneOffset() = UTC - local (minutes); utc = local + offset.
  const utcTotal = (localTotal + new Date().getTimezoneOffset() + 1440) % 1440;

  return `${pad(Math.floor(utcTotal / 60))}:${pad(utcTotal % 60)}`;
}

/**
 * Convert a UTC "HH:MM" to the browser's local "HH:MM".
 * e.g. "06:00" UTC -> "09:00" in Africa/Kampala (UTC+3).
 */
export function utcTimeToLocal(utcTime: string): string {
  if (!validTime(utcTime)) return utcTime;
  const [h, m] = utcTime.split(':').map(Number);
  const utcTotal = h * 60 + m;
  const localTotal = (utcTotal - new Date().getTimezoneOffset() + 1440) % 1440;

  return `${pad(Math.floor(localTotal / 60))}:${pad(localTotal % 60)}`;
}