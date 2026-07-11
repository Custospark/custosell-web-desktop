import { formatCurrency } from '../../../shared/utils/formatCurrency';

/** Business-currency money for Forecasting (same pattern as Sales / Inventory). */
export function formatForecastMoney(n: number | undefined | null) {
  if (n == null || Number.isNaN(n)) return '—';
  return formatCurrency(n);
}

export function formatForecastPct(n: number | undefined | null) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}
