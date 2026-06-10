import { localSalesStore } from './localSalesStore';
import { localRefundsStore } from './localRefundsStore';
import { localExpensesStore } from '../expenses/localExpensesStore';
import type { DashboardSummary, SalesTrendDay } from '../../../../modules/dashboard/DashboardTypes';
import type { Sale } from '../../../../modules/sales/api/salesTypes';

export interface OfflineSalesSummary {
  today_revenue: number;
  today_transactions: number;
  today_products_sold: number;
  cash_total: number;
  mobile_money_total: number;
  card_total: number;
  pending_sales: Sale[];
}

export async function computeOfflineSalesSummary(): Promise<OfflineSalesSummary> {
  const todayRecords = await localSalesStore.getTodayPendingSales();

  let today_revenue = 0;
  let today_products_sold = 0;
  let cash_total = 0;
  let mobile_money_total = 0;
  let card_total = 0;
  const pending_sales: Sale[] = [];

  for (const record of todayRecords) {
    const amount = parseFloat(record.sale.total_amount) || 0;
    today_revenue += amount;
    today_products_sold += record.payload.items.reduce((s, i) => s + i.quantity, 0);
    pending_sales.push(record.sale);

    switch (record.sale.payment_method) {
      case 'cash':
        cash_total += amount;
        break;
      case 'mobile_money':
        mobile_money_total += amount;
        break;
      case 'card':
      case 'other':
        card_total += amount;
        break;
    }
  }

  return {
    today_revenue,
    today_transactions: todayRecords.length,
    today_products_sold,
    cash_total,
    mobile_money_total,
    card_total,
    pending_sales,
  };
}

/** Pending offline refunds reduce net sales on the original sale date until synced. */
export async function computeOfflineRefundAdjustments(): Promise<Map<string, number>> {
  const pending = await localRefundsStore.getPending();
  const refundsByDate = new Map<string, number>();

  for (const record of pending) {
    const refundTotal = record.refundData.items.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0,
    );
    const dateKey = record.updatedSale.sale_date.slice(0, 10);
    refundsByDate.set(dateKey, (refundsByDate.get(dateKey) ?? 0) + refundTotal);
  }

  return refundsByDate;
}

export async function computeOfflineExpenseAdjustments(): Promise<Map<string, number>> {
  const pending = await localExpensesStore.getPending();
  const expensesByDate = new Map<string, number>();

  for (const record of pending) {
    const dateKey = record.expense.expense_date.slice(0, 10);
    const amount = parseFloat(record.expense.amount) || 0;
    expensesByDate.set(dateKey, (expensesByDate.get(dateKey) ?? 0) + (record.mutationType === 'delete' ? -amount : amount));
  }

  return expensesByDate;
}

/** All pending sales grouped by date for trend overlay. */
export async function computeOfflineSalesTrend(): Promise<Map<string, { revenue: number; transactions: number }>> {
  const allPending = await localSalesStore.getPending();
  const trendMap = new Map<string, { revenue: number; transactions: number }>();

  for (const record of allPending) {
    const dateKey = record.sale.sale_date.slice(0, 10);
    const amount = parseFloat(record.sale.total_amount) || 0;
    const existing = trendMap.get(dateKey) ?? { revenue: 0, transactions: 0 };
    existing.revenue += amount;
    existing.transactions += 1;
    trendMap.set(dateKey, existing);
  }

  return trendMap;
}

/** Server baseline + pending sales/refunds overlay — idempotent, no double-counting. */
export async function applyDashboardPendingOverlay(
  server: DashboardSummary,
): Promise<DashboardSummary> {
  const [offline, refundAdj, expenseAdj, offlineTrend] = await Promise.all([
    computeOfflineSalesSummary(),
    computeOfflineRefundAdjustments(),
    computeOfflineExpenseAdjustments(),
    computeOfflineSalesTrend(),
  ]);

  let merged = mergeDashboardWithOffline(server, offline, offlineTrend);

  const todayKey = new Date().toISOString().slice(0, 10);
  const pendingTodayRefunds = refundAdj.get(todayKey) ?? 0;
  const pendingTodayExpenses = expenseAdj.get(todayKey) ?? 0;

  if (pendingTodayRefunds !== 0 || pendingTodayExpenses !== 0) {
    const todayRefunds = (merged.today_refunds ?? 0) + pendingTodayRefunds;
    const todayExpenses = (merged.today_expenses ?? 0) + pendingTodayExpenses;
    const todayGross = merged.today_gross_sales ?? merged.today_revenue;
    const todayNetAfterRefunds = todayGross - todayRefunds;
    const todayNetSales = todayNetAfterRefunds - todayExpenses;

    merged = {
      ...merged,
      today_refunds: todayRefunds,
      today_expenses: todayExpenses,
      today_net_after_refunds: todayNetAfterRefunds,
      today_net_sales: todayNetSales,
      today_net_after_expenses: todayNetSales,
    };
  }

  merged = {
    ...merged,
    sales_trend: merged.sales_trend.map((day) => {
      const dateKey = day.date.slice(0, 10);
      const refunds = (day.refunds ?? 0) + (refundAdj.get(dateKey) ?? 0);
      const expenses = (day.expenses ?? 0) + (expenseAdj.get(dateKey) ?? 0);
      return {
        ...day,
        refunds,
        expenses,
        net_sales: day.revenue - refunds - expenses,
        net_revenue: day.revenue - refunds - expenses,
      };
    }),
  };

  return merged;
}

function mergeTrendDay(
  day: SalesTrendDay,
  offlineTrend: Map<string, { revenue: number; transactions: number }>,
): SalesTrendDay {
  const dateKey = day.date.slice(0, 10);
  const offline = offlineTrend.get(dateKey);
  if (!offline) return day;
  const revenue = day.revenue + offline.revenue;
  const refunds = day.refunds ?? 0;
  const expenses = day.expenses ?? 0;
  return {
    ...day,
    revenue,
    net_sales: revenue - refunds - expenses,
    net_revenue: revenue - refunds - expenses,
    transactions: day.transactions + offline.transactions,
  };
}

export function mergeDashboardWithOffline(
  summary: DashboardSummary,
  offline: OfflineSalesSummary,
  offlineTrend: Map<string, { revenue: number; transactions: number }>,
): DashboardSummary {
  const trendMerged = summary.sales_trend.map((day) => mergeTrendDay(day, offlineTrend));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOffline = offlineTrend.get(todayKey);

  if (todayOffline && !trendMerged.some((d) => d.date.slice(0, 10) === todayKey)) {
    trendMerged.push({
      date: todayKey,
      revenue: todayOffline.revenue,
      net_revenue: todayOffline.revenue,
      refunds: 0,
      expenses: 0,
      transactions: todayOffline.transactions,
    });
  }

  const offlineRecent = offline.pending_sales.slice(0, 5).map((s) => ({
    id: s.id,
    receipt_number: s.receipt_number,
    total_amount: parseFloat(s.total_amount) || 0,
    refunds: 0,
    net_amount: parseFloat(s.total_amount) || 0,
    payment_method: s.payment_method,
    created_at: s.created_at,
    items_count: s.sale_items?.length ?? 0,
  }));

  const existingIds = new Set(summary.recent_sales.map((r) => r.id));
  const mergedRecent = [
    ...offlineRecent.filter((r) => !existingIds.has(r.id)),
    ...summary.recent_sales,
  ].slice(0, 10);

  return {
    ...summary,
    today_revenue: summary.today_revenue + offline.today_revenue,
    today_gross_sales: (summary.today_gross_sales ?? summary.today_revenue) + offline.today_revenue,
    today_refunds: summary.today_refunds ?? 0,
    today_net_after_refunds:
      (summary.today_gross_sales ?? summary.today_revenue) + offline.today_revenue - (summary.today_refunds ?? 0),
    today_net_sales:
      (summary.today_gross_sales ?? summary.today_revenue) + offline.today_revenue - (summary.today_refunds ?? 0) - summary.today_expenses,
    today_transactions: summary.today_transactions + offline.today_transactions,
    today_products_sold: summary.today_products_sold + offline.today_products_sold,
    today_net_after_expenses:
      (summary.today_gross_sales ?? summary.today_revenue) + offline.today_revenue - (summary.today_refunds ?? 0) - summary.today_expenses,
    sales_trend: trendMerged,
    recent_sales: mergedRecent,
  };
}
