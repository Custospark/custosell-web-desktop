import { formatShiftDateTime, formatShiftTime } from '../../shared/utils/formatDateTime';
import { netSaleAmount } from '../sales/utils/saleAmounts';
import type { SaleWithSyncMeta } from '../../app/store/offline/localSalesStore';

export interface ShiftHistoryPoint {
  id: string;
  label: string;
  shortLabel: string;
  netSales: number;
}

export interface ShiftProgressPoint {
  id: number;
  label: string;
  cumulative: number;
  saleAmount: number;
  receipt: string;
  index: number;
}

function parseShiftNetSales(value: string | number | null | undefined): number {
  const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
  return Number.isFinite(amount) ? amount : 0;
}

export function buildShiftHistorySeries(
  completedShifts: Array<{ clock_in: string; total_sales: string | number }>,
  limit = 10,
): ShiftHistoryPoint[] {
  return [...completedShifts]
    .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime())
    .slice(-limit)
    .map((shift) => {
      const date = new Date(shift.clock_in);
      return {
        id: shift.clock_in,
        label: formatShiftDateTime(shift.clock_in),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        netSales: parseShiftNetSales(shift.total_sales),
      };
    });
}

export function buildCurrentShiftProgressSeries(sales: SaleWithSyncMeta[]): ShiftProgressPoint[] {
  const sorted = [...sales].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let cumulative = 0;
  return sorted.map((sale, index) => {
    const saleAmount = netSaleAmount(sale);
    cumulative += saleAmount;
    return {
      id: sale.id,
      index: index + 1,
      label: formatShiftTime(sale.created_at),
      cumulative,
      saleAmount,
      receipt: sale.receipt_number,
    };
  });
}

// Backward-compatible aliases
export type ShiftPerformancePoint = ShiftHistoryPoint;
export const buildShiftPerformanceSeries = buildShiftHistorySeries;
