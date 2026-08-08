/** Format a raw money string as the user types, grouping thousands with commas. */
export function formatTendered(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
  }
  const [int = '', dec] = cleaned.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
}

/** Parse a formatted money string (with commas) into a round-to-2 number. */
export function parseTendered(formatted: string): number {
  const cleaned = formatted.replace(/,/g, '').replace(/[^\d.]/g, '');
  return Math.round((parseFloat(cleaned) || 0) * 100) / 100;
}