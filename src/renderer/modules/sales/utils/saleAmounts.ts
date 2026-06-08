import type { Sale } from '../api/salesTypes';
import type { SaleWithSyncMeta } from '../../../app/store/offline/localSalesStore';

export function toAmount(value: string | number | null | undefined): number {
  const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return Number.isFinite(amount) ? amount : 0;
}

export function refundedAmount(sale: Pick<Sale | SaleWithSyncMeta, 'refunds' | 'sale_items' | 'total_amount'>): number {
  if (sale.refunds !== undefined && sale.refunds !== null) return toAmount(sale.refunds);
  return (sale.sale_items ?? []).reduce((sum, item) => sum + toAmount(item.refunded_amount), 0);
}

export function grossSaleAmount(sale: Pick<Sale | SaleWithSyncMeta, 'total_amount'>): number {
  return toAmount(sale.total_amount);
}

export function netSaleAmount(sale: Pick<Sale | SaleWithSyncMeta, 'net_amount' | 'refunds' | 'sale_items' | 'total_amount'>): number {
  if (sale.net_amount !== undefined && sale.net_amount !== null) return Math.max(0, toAmount(sale.net_amount));
  return Math.max(0, grossSaleAmount(sale) - refundedAmount(sale));
}
