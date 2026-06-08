import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDateTime, formatShiftTime } from '../../shared/utils/formatDateTime';
import { netSaleAmount } from '../sales/utils/saleAmounts';
import type { SaleWithSyncMeta } from '../../app/store/offline/localSalesStore';

export interface ShiftHistoryPoint {
  id: string;
  label: string;
  netSales: number;
}

export interface ShiftProgressPoint {
  id: number;
  label: string;
  cumulative: number;
  receipt: string;
}

const LINE_COLOR = '#3b82f6';

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
    .map((shift) => ({
      id: shift.clock_in,
      label: formatShiftDateTime(shift.clock_in),
      netSales: parseShiftNetSales(shift.total_sales),
    }));
}

export function buildCurrentShiftProgressSeries(sales: SaleWithSyncMeta[]): ShiftProgressPoint[] {
  const sorted = [...sales].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let cumulative = 0;
  return sorted.map((sale, index) => {
    cumulative += netSaleAmount(sale);
    return {
      id: sale.id,
      label: formatShiftTime(sale.created_at),
      cumulative,
      receipt: sale.receipt_number,
    };
  });
}

/** Live shift momentum — cumulative net sales after each receipt. */
export function CurrentShiftProgressChart({ data }: { data: ShiftProgressPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Shift Progress</h3>
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          Sales on this shift will plot here as you record receipts
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Shift Progress</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Cumulative net sales on this shift · each point is a receipt
        </p>
      </div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: LINE_COLOR }} />
          Running net total
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftProgressPoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
                    <p className="font-semibold text-gray-800 mb-1 truncate">{row.receipt}</p>
                    <p className="text-gray-500 mb-2">{row.label}</p>
                    <p className="flex justify-between gap-4" style={{ color: LINE_COLOR }}>
                      <span>Running net</span>
                      <span className="font-bold tabular-nums">{formatCurrency(row.cumulative)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Running net total"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ fill: LINE_COLOR, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Past completed shifts — net sales saved when each shift was closed. */
export function ShiftHistoryTrendChart({ data }: { data: ShiftHistoryPoint[] }) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Past Shift Net Sales</h3>
        <p className="text-xs text-gray-500 mt-0.5">From shift history · oldest to newest</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as ShiftHistoryPoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[150px]">
                    <p className="font-semibold text-gray-800 mb-2">{row.label}</p>
                    <p className="flex justify-between gap-4" style={{ color: LINE_COLOR }}>
                      <span>Net sales</span>
                      <span className="font-bold tabular-nums">{formatCurrency(row.netSales)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="netSales"
              name="Net sales"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ fill: LINE_COLOR, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Backward-compatible exports
export type ShiftPerformancePoint = ShiftHistoryPoint;
export const ShiftPerformanceChart = ShiftHistoryTrendChart;
export const buildShiftPerformanceSeries = buildShiftHistorySeries;
