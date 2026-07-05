import type { Sale } from '../sales/api/salesTypes';
import type { Invoice } from '../invoices/api/InvoiceTypes';

export interface PaymentReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  taxAmount?: number;
  refundedQuantity?: number;
  refundedAmount?: number;
}

export interface PaymentReceiptBillDetails {
  lineItems: PaymentReceiptLineItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  totalRefunded: number;
  billTotal: number;
  customerName?: string | null;
}

function toNum(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export function buildBillDetailsFromSale(sale: Sale): PaymentReceiptBillDetails {
  const lineItems: PaymentReceiptLineItem[] = (sale.sale_items ?? []).map((item) => ({
    name: item.product_name,
    quantity: item.quantity,
    unitPrice: toNum(item.unit_price),
    subtotal: toNum(item.subtotal),
    discount: toNum(item.discount_amount),
    taxAmount: toNum(item.tax_amount),
    refundedQuantity: item.refunded_quantity ?? 0,
    refundedAmount: toNum(item.refunded_amount),
  }));

  const totalRefunded = lineItems.reduce((s, i) => s + (i.refundedAmount ?? 0), 0);
  const netBill = Math.max(0, toNum(sale.total_amount) - totalRefunded);

  return {
    lineItems,
    subtotal: toNum(sale.subtotal),
    discount: toNum(sale.discount_amount),
    taxTotal: toNum(sale.tax_total),
    totalRefunded,
    billTotal: netBill,
    customerName: sale.customer?.name ?? null,
  };
}

export function buildBillDetailsFromInvoice(invoice: Invoice): PaymentReceiptBillDetails {
  const lineItems: PaymentReceiptLineItem[] = (invoice.items ?? []).map((item) => ({
    name: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
    discount: 0,
    taxAmount: 0,
  }));

  const linesSubtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);

  return {
    lineItems,
    subtotal: linesSubtotal > 0 ? linesSubtotal : invoice.subtotal,
    discount: 0,
    taxTotal: invoice.tax_total,
    totalRefunded: 0,
    billTotal: invoice.total_amount,
    customerName: invoice.customer?.name ?? null,
  };
}
