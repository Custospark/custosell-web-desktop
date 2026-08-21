/**
 * Format a quantity for display: whole numbers show without decimals (2),
 * fractional quantities keep up to 3 significant decimals (0.5, 1.25).
 * Handles legacy integer quantities and new decimal quantities alike.
 */
export function formatQuantity(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n % 1) < 0.0005) return String(Math.round(n));
  return String(Number(n.toFixed(3)));
}