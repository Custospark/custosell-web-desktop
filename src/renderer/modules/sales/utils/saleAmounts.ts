import type { Sale } from '../api/salesTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';

export function toAmount(value: string | number | null | undefined): number {
  const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return Number.isFinite(amount) ? amount : 0;
}

function refundedAmountFromItems(
  sale: Pick<Sale | SaleWithSyncMeta, 'sale_items'>,
): number {
  return (sale.sale_items ?? []).reduce((sum, item) => sum + toAmount(item.refunded_amount), 0);
}

/** Line items are authoritative when present - header refunds can be stale after offline refund. */
export function refundedAmount(sale: Pick<Sale | SaleWithSyncMeta, 'refunds' | 'sale_items' | 'total_amount'>): number {
  if (sale.sale_items && sale.sale_items.length > 0) {
    return refundedAmountFromItems(sale);
  }
  if (sale.refunds !== undefined && sale.refunds !== null) return toAmount(sale.refunds);
  return 0;
}

export function grossSaleAmount(sale: Pick<Sale | SaleWithSyncMeta, 'total_amount'>): number {
  return toAmount(sale.total_amount);
}

export function netSaleAmount(sale: Pick<Sale | SaleWithSyncMeta, 'net_amount' | 'refunds' | 'sale_items' | 'total_amount'>): number {
  return Math.max(0, grossSaleAmount(sale) - refundedAmount(sale));
}

export function saleTaxAmount(sale: Pick<Sale | SaleWithSyncMeta, 'tax_total' | 'sale_items'>): number {
  const headerTax = toAmount(sale.tax_total);
  if (headerTax > 0) return headerTax;
  return (sale.sale_items ?? []).reduce((sum, item) => sum + toAmount(item.tax_amount), 0);
}

export function saleTaxRefundedAmount(sale: Pick<Sale | SaleWithSyncMeta, 'sale_items'>): number {
  return (sale.sale_items ?? []).reduce((sum, item) => sum + toAmount(item.tax_refunded_amount), 0);
}

export function netSaleTaxAmount(sale: Pick<Sale | SaleWithSyncMeta, 'tax_total' | 'sale_items'>): number {
  return Math.max(0, saleTaxAmount(sale) - saleTaxRefundedAmount(sale));
}
