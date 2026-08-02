import type { Invoice } from '../../invoices/api/InvoiceTypes';

export type SuccessPhase = 'draft' | 'sent';

export function balanceDue(inv: Invoice): number {
  return Math.max(0, inv.total_amount - (inv.amount_paid || 0));
}

export function parsePaidAmount(value?: string | number | null): number {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}