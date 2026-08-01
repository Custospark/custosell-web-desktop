import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useCustomerOverview } from './api/customers/CustomerQueries';
import { Users, UserCheck, Repeat, DollarSign, ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import { type CardColor } from '../../shared/components/cards/statCardStyles';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { CHART_THEME, formatAxisCurrency } from '../../shared/components/charts/chartPrimitives';
import { ROUTES } from '../../app/routes/constants/shared.paths';

const PIE_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#94a3b8',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899',
];

function DonutChart({ data, title, dataKey, nameKey }: {
  data: ReadonlyArray<Record<string, unknown>>;
  title: string;
  dataKey: string;
  nameKey: string;
}) {
  const empty = !data.length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
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
                  <Tooltip formatter={(val) => String(Number(val ?? 0))} />
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
                <span className="font-semibold text-gray-900 ml-2">{Number(item[dataKey]).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(month: React.ReactNode): string {
  if (typeof month !== 'string') return '';
  const [, m] = month.split('-');
  return MONTH_LABELS[m] ?? month;
}

interface CardDef {
  label: string;
  value: string;
  icon: React.ElementType;
  color: CardColor;
  badge: string;
  sub?: string;
}

export default function CustomerOverviewPage() {
  const { data, isLoading, isError, refetch } = useCustomerOverview();

  if (isLoading) return <CustosellLoader message="Loading customer overview…" />;

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Could not load customer overview.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const d = data!;

  const repeatColor: CardColor = d.repeat_rate >= 30 ? 'green' : 'amber';

  const cards: CardDef[] = [
    {
      label: 'Total Customers',
      value: d.total_customers.toLocaleString(),
      sub: 'All registered customers',
      icon: Users,
      color: 'blue',
      badge: 'Total',
    },
    {
      label: 'Active Customers',
      value: d.active_customers.toLocaleString(),
      sub: `${d.total_customers > 0 ? Math.round((d.active_customers / d.total_customers) * 100) : 0}% have purchased`,
      icon: UserCheck,
      color: 'green',
      badge: 'Active',
    },
    {
      label: 'Repeat Rate',
      value: `${d.repeat_rate}%`,
      sub: `${d.repeat_customers} customers buy again`,
      icon: Repeat,
      color: repeatColor,
      badge: 'Loyalty',
    },
    {
      label: 'Customer Revenue',
      value: formatCurrency(d.total_revenue),
      sub: `Average ${formatCurrency(d.average_value)} per customer`,
      icon: DollarSign,
      color: 'purple',
      badge: 'Revenue',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Customers Overview</h1>
            <p className="text-sm text-gray-500">See who your customers are and how they buy</p>
          </div>
        </div>
        <Link
          to={ROUTES.CUSTOMERS.INDEX}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> View Customer List
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <DashboardStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={Icon}
              color={card.color}
              badge={card.badge}
              sub={card.sub}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          data={d.segments}
          title="Customers by Activity"
          dataKey="count"
          nameKey="label"
        />
        <DonutChart
          data={d.frequency}
          title="Purchase Frequency"
          dataKey="count"
          nameKey="bucket"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Customers per Month</h3>
          {d.new_customers_by_month.length > 0 ? (
            <ChartContainer className="h-64" minHeight={256}>
              {(size) => (
                <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
                  <BarChart data={d.new_customers_by_month}>
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(val) => String(val)} labelFormatter={formatMonth} />
                    <Bar dataKey="count" name="new customers" fill={CHART_THEME.line} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              No trend data yet
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Customer Revenue per Month</h3>
          {d.revenue_by_month.length > 0 ? (
            <ChartContainer className="h-64" minHeight={256}>
              {(size) => (
                <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
                  <BarChart data={d.revenue_by_month}>
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAxisCurrency} />
                    <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} labelFormatter={formatMonth} />
                    <Bar dataKey="revenue" name="revenue" fill={CHART_THEME.transactions} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              No revenue data yet
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Top Customers by Spend</h3>
          <Link to={ROUTES.CUSTOMERS.INDEX} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>
        {d.top_customers.length > 0 ? (
          <div className="space-y-1">
            {d.top_customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                  <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {c.purchase_count} purchase{c.purchase_count === 1 ? '' : 's'}
                    {c.last_purchase_at ? ` · last ${new Date(c.last_purchase_at).toLocaleDateString()}` : ''}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-2 shrink-0">{formatCurrency(c.total_purchases)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No customer purchases yet</p>
        )}
      </div>

      {d.total_customers === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No customers yet. Add customers to start tracking your base.</p>
        </div>
      )}
    </div>
  );
}
