import { describe, expect, it } from 'vitest';
import { cashAtHandover, cashCollected, netSales } from '../../../shared/utils/accounting';
import { computeShiftCollections } from '../../../shared/utils/shiftCollectionTotals';
import { buildShiftCloseReportData } from '../buildShiftCloseReportData';
import type { SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';

/**
 * Locks the canonical shift formulas (docs/shift-sales-formulas.md) with the
 * real worked example:
 *   opening 50k; cash 100k, mobile 80k, cash 60k (20k refunded), card 40k;
 *   expenses 15k; counted cash 180k.
 *
 *   gross=280k, refunds=20k, expenses=15k
 *   cash (net per sale)=140k, mobile=80k, card=40k
 *   net_sales=245k, cash_collected=125k, cash_at_handover=175k, variance=+5k
 */

function sale(overrides: Record<string, unknown>): SaleWithSyncMeta {
  return {
    id: 1,
    business_id: 1,
    user_id: 1,
    customer_id: null,
    shift_id: null,
    receipt_number: 'R-1',
    subtotal: '0',
    tax_total: '0',
    discount_amount: '0',
    total_amount: '0',
    amount_paid: '0',
    amount_tendered: '0',
    payment_method: 'cash',
    payment_status: 'paid',
    sale_date: '2026-01-01',
    sale_items: [],
    payments: [],
    refunds: 0,
    net_amount: 0,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    ...overrides,
  } as unknown as SaleWithSyncMeta;
}

function item(refundedAmount: number) {
  return {
    id: 1,
    product_id: 1,
    sale_id: 1,
    product_name: 'Item',
    product_price: '0',
    quantity: 1,
    unit_price: '0',
    subtotal: '0',
    tax_amount: '0',
    discount_amount: '0',
    refunded_quantity: refundedAmount > 0 ? 1 : 0,
    refunded_amount: refundedAmount,
  };
}

describe('shift collections (per-sale net-after-refunds)', () => {
  const shiftSales = [
    sale({ id: 1, payment_method: 'cash', total_amount: '100000', sale_items: [item(0)] }),
    sale({ id: 2, payment_method: 'mobile_money', total_amount: '80000', sale_items: [item(0)] }),
    sale({ id: 3, payment_method: 'cash', total_amount: '60000', sale_items: [item(20000)] }),
    sale({ id: 4, payment_method: 'card', total_amount: '40000', sale_items: [item(0)] }),
  ];

  it('nets refunds per sale instead of summing gross payment rows', () => {
    const collections = computeShiftCollections([], shiftSales);
    expect(collections.cash).toBe(140_000); // 100k + (60k - 20k)
    expect(collections.mobile).toBe(80_000);
    expect(collections.card).toBe(40_000);
  });

  it('counts only what was actually paid on a partially-paid cash sale', () => {
    const partial = [
      sale({ id: 1, payment_method: 'cash', total_amount: '100000', amount_paid: '40000', payment_status: 'partially_paid', sale_items: [item(0)] }),
    ];
    const collections = computeShiftCollections([], partial);
    expect(collections.cash).toBe(40_000); // not the full 100k
  });

  it('nets refunds then caps at amount paid on a refunded partial sale', () => {
    const refundedPartial = [
      sale({ id: 1, payment_method: 'cash', total_amount: '100000', amount_paid: '50000', payment_status: 'partially_refunded', sale_items: [item(20000)] }),
    ];
    // net = 80k, but only 50k was paid → 50k counted.
    const collections = computeShiftCollections([], refundedPartial);
    expect(collections.cash).toBe(50_000);
  });
});

describe('cash drawer formulas (canonical)', () => {
  it('cash_collected = cash − expenses', () => {
    expect(cashCollected(140_000, 15_000)).toBe(125_000);
  });

  it('cash_at_handover = opening_balance + cash_collected', () => {
    expect(cashAtHandover(50_000, 140_000, 15_000)).toBe(175_000);
  });

  it('never goes negative when expenses exceed cash', () => {
    expect(cashCollected(10_000, 20_000)).toBe(0);
    expect(cashAtHandover(5_000, 10_000, 20_000)).toBe(5_000);
  });
});

describe('net sales formula', () => {
  it('net_sales = gross − refunds − expenses', () => {
    expect(netSales(280_000, 20_000, 15_000)).toBe(245_000);
  });
});

describe('buildShiftCloseReportData (UI-printed report matches backend)', () => {
  it('produces the worked-example figures', () => {
    const data = buildShiftCloseReportData({
      business: { name: 'Test Co' } as never,
      authUser: { name: 'Cashier', business_name: 'Test Co' } as never,
      clockIn: '2026-01-01T08:00:00Z',
      clockOut: '2026-01-01T17:00:00Z',
      shiftSales: [
        sale({ id: 1, payment_method: 'cash', total_amount: '100000', sale_items: [item(0)] }),
        sale({ id: 2, payment_method: 'mobile_money', total_amount: '80000', sale_items: [item(0)] }),
        sale({ id: 3, payment_method: 'cash', total_amount: '60000', sale_items: [item(20000)] }),
        sale({ id: 4, payment_method: 'card', total_amount: '40000', sale_items: [item(0)] }),
      ],
      shiftPayments: [],
      shiftExpenses: [{ id: 1, amount: '15000' }] as never,
      openingBalance: 50_000,
      countedCash: 180_000,
    });

    expect(data.grossSales).toBe(280_000);
    expect(data.refunds).toBe(20_000);
    expect(data.shiftExpenses).toBe(15_000);
    expect(data.netSales).toBe(245_000);
    expect(data.cash).toBe(140_000);
    expect(data.cashCollected).toBe(125_000);
    expect(data.cashHandover).toBe(175_000);
    expect(data.expectedCash).toBe(175_000);
    expect(data.openingBalance).toBe(50_000);
    expect(data.variance).toBe(5_000);
  });

  it('without expenses/refunds: handover = opening + cash', () => {
    const data = buildShiftCloseReportData({
      business: { name: 'Test Co' } as never,
      authUser: { name: 'Cashier' } as never,
      clockIn: '2026-01-01T08:00:00Z',
      clockOut: '2026-01-01T17:00:00Z',
      shiftSales: [
        sale({ id: 1, payment_method: 'cash', total_amount: '50000', sale_items: [item(0)] }),
      ],
      shiftPayments: [],
      shiftExpenses: [],
      openingBalance: 10_000,
      countedCash: 60_000,
    });

    expect(data.netSales).toBe(50_000);
    expect(data.cash).toBe(50_000);
    expect(data.cashCollected).toBe(50_000);
    expect(data.cashHandover).toBe(60_000);
    expect(data.variance).toBe(0);
  });
});
