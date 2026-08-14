import type { Sale } from '../../modules/sales/api/salesTypes';
import type { Payment } from '../../modules/payments/paymentTypes';
import { netSaleAmount, toAmount } from '../../modules/sales/utils/saleAmounts';

type SaleLike = Pick<
  Sale,
  'payment_method' | 'payment_status' | 'amount_paid' | 'payments' | 'total_amount' | 'sale_items' | 'refunds' | 'net_amount'
>;

function sumByMethod(payments: Payment[], method: string): number {
  return payments
    .filter((p) => p.payment_method === method)
    .reduce((sum, p) => sum + toAmount(p.amount), 0);
}

function sumCardAndOther(payments: Payment[]): number {
  return payments
    .filter((p) => p.payment_method === 'card' || p.payment_method === 'other')
    .reduce((sum, p) => sum + toAmount(p.amount), 0);
}

/** Mirror rows on linked sales duplicate invoice collections - skip them. */
export function isMirrorSalePayment(payment: Payment): boolean {
  return payment.payable_type === 'sale' && (payment.notes?.startsWith('From invoice') ?? false);
}

export function collectionsFromPayments(payments: Payment[]): { cash: number; mobile: number; card: number } {
  const eligible = payments.filter((p) => !isMirrorSalePayment(p));
  return {
    cash: sumByMethod(eligible, 'cash'),
    mobile: sumByMethod(eligible, 'mobile_money'),
    card: sumCardAndOther(eligible),
  };
}

/** Cash/mobile/card actually collected on a sale (payment rows, then header fallback). */
export function collectionsForSale(sale: SaleLike): { cash: number; mobile: number; card: number } {
  const payments = sale.payments ?? [];
  if (payments.length > 0) {
    return collectionsFromPayments(payments);
  }

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

/** Legacy: sum collections from sales in the shift (pre shift_id on payments). */
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
 * Prefer shift-attributed payment rows; fall back to sale-based totals when none are available.
 */
export function computeShiftCollections(
  shiftPayments: Payment[] | undefined,
  sales: SaleLike[],
): { cash: number; mobile: number; card: number } {
  if (shiftPayments && shiftPayments.length > 0) {
    return collectionsFromPayments(shiftPayments);
  }
  return shiftCollectionTotals(sales);
}
