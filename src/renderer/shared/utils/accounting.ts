/**
 * Canonical net-sales formula used across Custosell.
 *
 * net_sales = gross − refunds − expenses
 * net_after_refunds = gross − refunds (per receipt / shift sales headline)
 *
 * Scope determines which rows are included:
 * - Dashboard / daily trend: business + calendar date (sale_date, expense_date)
 * - My Shift / shift close & reconciliation: shift_id; net_sales = gross - refunds - shift expenses
 *
 * Shift expenses reduce cash handover, not mobile/card totals.
 */

export function netSalesAfterRefunds(gross: number, refunds: number): number {
  return Math.max(0, gross - refunds);
}

/** Canonical period/day net sales = gross − refunds − expenses */
export function netSales(gross: number, refunds: number, expenses: number): number {
  return Math.max(0, gross - refunds - expenses);
}

/** @alias netSales */
export function netSalesForDay(gross: number, refunds: number, expenses: number): number {
  return netSales(gross, refunds, expenses);
}

export function totalDeductions(refunds: number, expenses: number): number {
  return refunds + expenses;
}

export function cashHandover(netCashCollected: number, shiftExpenses: number): number {
  return Math.max(0, netCashCollected - shiftExpenses);
}
