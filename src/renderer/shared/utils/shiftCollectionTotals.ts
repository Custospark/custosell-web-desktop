import type { Sale } from '../../modules/sales/api/salesTypes';
import { netSaleAmount, toAmount } from '../../modules/sales/utils/saleAmounts';

type SaleLike = Pick<
  Sale,
  'payment_method' | 'payment_status' | 'amount_paid' | 'payments' | 'total_amount' | 'sale_items' | 'refunds' | 'net_amount'
>;

/**
 * Cash/mobile/card actually collected on a sale.
 *
 * Canonical source is the per-sale NET after its own refunds (refunds live on
 * sale items, not payment rows), matching the backend - see
 * docs/shift-sales-formulas.md. Payment rows are only used to decide WHICH
 * method a sale was collected in, never to override the net amount.
 */
export function collectionsForSale(sale: SaleLike): { cash: number; mobile: number; card: number } {
  const net = netSaleAmount(sale);
  const paid = toAmount(sale.amount_paid);
  const collected = sale.payment_status === 'paid' ? net : Math.min(paid, net);
  if (collected <= 0) {
    return { cash: 0, mobile: 0, card: 0 };
  }

  const method = sale.payment_method;
  return {
    cash: method === 'cash' ? collected : 0,
    mobile: method === 'mobile_money' ? collected : 0,
    card: method === 'card' || method === 'other' ? collected : 0,
  };
}

/** Sum collections from sales in the shift (per-sale net-after-refunds). */
export function shiftCollectionTotals(sales: SaleLike[]): { cash: number; mobile: number; card: number } {
  return sales.reduce(
    (acc, sale) => {
      const row = collectionsForSale(sale);
      return {
        cash: acc.cash + row.cash,
        mobile: acc.mobile + row.mobile,
        card: acc.card + row.card,
      };
    },
    { cash: 0, mobile: 0, card: 0 },
  );
}

/**
 * Shift collections: always per-sale net-after-refunds (canonical).
 * Payment rows are not summed directly because refunds live on sale items,
 * so gross payment rows would overstate cash (docs/shift-sales-formulas.md).
 */
export function computeShiftCollections(
  _shiftPayments: unknown,
  sales: SaleLike[],
): { cash: number; mobile: number; card: number } {
  return shiftCollectionTotals(sales);
}
