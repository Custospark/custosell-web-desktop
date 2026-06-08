/**
 * Canonical net-sales formula used across Custosell.
 *
 * Scope determines which rows are included:
 * - Dashboard / daily trend: business + calendar date (sale_date, expense_date)
 * - My Shift: shift_id (all sales & shift-linked expenses for that shift)
 *
 * Shift headline net sales = gross − refunds only.
 * Shift expenses reduce cash handover, not mobile/card totals.
 * Dashboard net today = gross − refunds − expenses for the day.
 */

export function netSalesAfterRefunds(gross: number, refunds: number): number {
  return Math.max(0, gross - refunds);
}

export function netSalesForDay(gross: number, refunds: number, expenses: number): number {
  return Math.max(0, gross - refunds - expenses);
}

export function totalDeductions(refunds: number, expenses: number): number {
  return refunds + expenses;
}

export function cashHandover(netCashCollected: number, shiftExpenses: number): number {
  return Math.max(0, netCashCollected - shiftExpenses);
}
