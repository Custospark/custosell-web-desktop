import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import type { PlatformConversionMonth } from './api/PlatformTypes';

const TREND_COLORS = {
  trials: '#3b82f6',
  converted: '#10b981',
  rate: '#f59e0b',
} as const;

function tooltipPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function ConversionMonthlyTrendChart({ data }: { data: PlatformConversionMonth[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Monthly Conversion Trend</h3>
        <p className="text-xs text-gray-500 mt-0.5">Trials started vs converted each month, with conversion rate</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No conversion data yet</p>
      ) : (
        <ChartContainer className="h-72">
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
              <ComposedChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="counts" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Conversion rate') return [tooltipPercent(Number(value)), name];
                    return [Number(value), String(name)];
                  }}
                />
                <Legend />
                <Bar yAxisId="counts" dataKey="trials_started" name="Trials started" fill={TREND_COLORS.trials} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="counts" dataKey="converted" name="Converted" fill={TREND_COLORS.converted} radius={[4, 4, 0, 0]} />
                <Line yAxisId="rate" type="monotone" dataKey="conversion_rate" name="Conversion rate" stroke={TREND_COLORS.rate} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      )}
    </div>
  );
}

export function ConversionYearlyDistributionChart({ data }: { data: PlatformConversionMonth[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Yearly Conversion Distribution</h3>
        <p className="text-xs text-gray-500 mt-0.5">Conversion rate across the last 12 months</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No conversion data for this range</p>
      ) : (
        <ChartContainer className="h-64" minHeight={256}>
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
              <ComposedChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="counts" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Conversion rate') return [tooltipPercent(Number(value)), name];
                    return [Number(value), String(name)];
                  }}
                />
                <Legend />
                <Area yAxisId="rate" type="monotone" dataKey="conversion_rate" name="Conversion rate" stroke={TREND_COLORS.rate} strokeWidth={2.5} fill={TREND_COLORS.rate} fillOpacity={0.12} dot={{ r: 3 }} />
                <Line yAxisId="counts" type="monotone" dataKey="converted" name="Converted" stroke={TREND_COLORS.converted} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      )}
    </div>
  );
}
