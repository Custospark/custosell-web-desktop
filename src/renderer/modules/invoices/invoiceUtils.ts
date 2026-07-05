import type { Invoice } from './api/InvoiceTypes';

/** Find the billing invoice linked to a completed sale (via sale_id). */
export function findInvoiceBySaleId(
  invoices: Invoice[] | undefined,
  saleId: number,
): Invoice | undefined {
  if (!invoices?.length || saleId <= 0) return undefined;
  return invoices.find((inv) => inv.sale_id === saleId);
}
