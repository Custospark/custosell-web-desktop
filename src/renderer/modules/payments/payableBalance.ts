import type { Sale } from '../../modules/sales/api/salesTypes';
import type { Invoice } from '../../modules/invoices/api/InvoiceTypes';
import { netSaleAmount, toAmount } from '../../modules/sales/utils/saleAmounts';

export function computeInvoiceBalance(invoice: Pick<Invoice, 'total_amount' | 'amount_paid'>): number {
  const total = toAmount(invoice.total_amount);
  const paid = toAmount(invoice.amount_paid);
  return Math.max(0, total - paid);
}

export function computeSaleBalance(sale: Pick<Sale, 'total_amount' | 'amount_paid' | 'sale_items' | 'refunds' | 'net_amount'>): number {
  const netTotal = netSaleAmount(sale);
  const paid = toAmount(sale.amount_paid);
  return Math.max(0, netTotal - paid);
}

export function computePayableTotal(payable: Sale | Invoice, type: 'sale' | 'invoice'): number {
  return type === 'sale' ? netSaleAmount(payable as Sale) : toAmount((payable as Invoice).total_amount);
}
