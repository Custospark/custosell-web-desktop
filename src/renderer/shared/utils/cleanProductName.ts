/**
 * Some legacy/imported product names carry a trailing " #<number>" that was
 * never meant to be part of the display name (e.g. "Paper Towels 2 Rolls #1999").
 * Strip it defensively wherever item names are shown on documents/orders -
 * the stored product name stays untouched.
 */
export function cleanProductName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().replace(/\s+#\d+\s*$/, '');
}
