import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChartContainer } from '../../../../shared/components/charts/ChartContainer';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

interface OverviewDonutProps {
  data: ReadonlyArray<Record<string, unknown>>;
  title: string;
  subtitle?: string;
  dataKey: string;
  nameKey: string;
}

/** Cost-value donut with a legend - category and branch breakdowns. */
export function OverviewDonut({ data, title, subtitle, dataKey, nameKey }: OverviewDonutProps) {
  const empty = !data.length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {empty ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          No data yet
        </div>
      ) : (
        <>
          <ChartContainer className="h-64" minHeight={256}>
            {(size) => (
              <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey={dataKey}
                    nameKey={nameKey}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
          <div className="space-y-1.5 mt-3">
            {data.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate text-gray-700">{String(item[nameKey])}</span>
                </div>
                <span className="font-semibold text-gray-900 ml-2">{formatCurrency(Number(item[dataKey]))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}