import type { PaymentReceiptBillDetails } from '../../modules/payments/paymentReceiptDetails';

const MONEY_EPS = 0.02;

export function isTaxExclusiveBill(
  subtotal: number,
  discount: number,
  taxTotal: number,
  billTotal: number,
): boolean {
  if (taxTotal <= MONEY_EPS) return false;
  return Math.abs(subtotal - discount + taxTotal - billTotal) <= MONEY_EPS;
}

export function resolveBillTotal(details: PaymentReceiptBillDetails): number {
  if (details.billTotal != null && details.billTotal >= 0) {
    return details.billTotal;
  }
  const linesSum = details.lineItems.reduce((s, i) => s + i.subtotal, 0);
  const base = linesSum > 0 ? linesSum : details.subtotal;
  if (isTaxExclusiveBill(base, details.discount, details.taxTotal, base + details.taxTotal)) {
    return Math.max(0, base - details.discount + details.taxTotal - details.totalRefunded);
  }
  return Math.max(0, base - details.discount - details.totalRefunded);
}

export function resolveDisplaySubtotal(details: PaymentReceiptBillDetails): number {
  const linesSum = details.lineItems.reduce((s, i) => s + i.subtotal, 0);
  return linesSum > 0 ? linesSum : details.subtotal;
}

export function shouldShowTaxLine(details: PaymentReceiptBillDetails, billTotal: number): boolean {
  if (details.taxTotal <= MONEY_EPS) return false;
  const subtotal = resolveDisplaySubtotal(details);
  if (isTaxExclusiveBill(subtotal, details.discount, details.taxTotal, billTotal)) {
    return true;
  }
  // Tax-inclusive: show VAT as informational when it fits inside the bill
  return details.taxTotal <= subtotal + MONEY_EPS;
}

export function taxLineLabel(details: PaymentReceiptBillDetails, billTotal: number): string {
  const subtotal = resolveDisplaySubtotal(details);
  return isTaxExclusiveBill(subtotal, details.discount, details.taxTotal, billTotal)
    ? 'VAT'
    : 'VAT (incl.)';
}
