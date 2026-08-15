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

/**
 * Net cash taken in during a shift, after cash refunds (already netted per sale)
 * and after expenses paid from the drawer.
 *
 * cash_collected = cash_receipts − shift_expenses
 */
export function cashCollected(cashReceipts: number, shiftExpenses: number): number {
  return Math.max(0, cashReceipts - shiftExpenses);
}

/**
 * Expected cash in the drawer at close.
 *
 * cash_at_handover = opening_balance + cash_collected
 * (synonymous with "expected cash in drawer"; variance = counted − this)
 */
export function cashAtHandover(openingBalance: number, cashReceipts: number, shiftExpenses: number): number {
  return openingBalance + cashCollected(cashReceipts, shiftExpenses);
}

/** @alias cashAtHandover - the drawer expectation used by end-shift reconciliation. */
export function expectedCashInDrawer(openingBalance: number, cashReceipts: number, shiftExpenses: number): number {
  return cashAtHandover(openingBalance, cashReceipts, shiftExpenses);
}
