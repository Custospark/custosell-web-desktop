import { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useIncomeOverview } from './api/IncomeQueries';
import { Wallet, ShoppingCart, TrendingUp, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import { type CardColor } from '../../shared/components/cards/statCardStyles';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { useAppSelector } from '../../app/store/hooks/useApp';
import {
  DailySpendingTrend,
  MonthlySpendingTrend,
  IncomeExpenseTrend,
} from './components/OverviewTrendCharts';

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
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
                  <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
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

interface CardDef {
  label: string;
  value: string;
  icon: React.ElementType;
  color: CardColor;
  badge: string;
  sub?: string;
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const accountType = useAppSelector((s) => s.auth.user?.account_type);
  const isPersonal = accountType === 'personal';
  const { data, isLoading, isError, refetch } = useIncomeOverview();

  if (isLoading) return <CustosellLoader message="Loading overview…" />;

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Could not load overview.</p>
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
  const isPersonalData = d.account_type === 'personal';
  const showIncome = isPersonal && isPersonalData;

  const netColor: CardColor = d.net_balance >= 0 ? 'blue' : 'amber';

  const cards: CardDef[] = showIncome
    ? [
        {
          label: 'Total Income',
          value: formatCurrency(d.total_income),
          sub: `${d.income_count} record${d.income_count === 1 ? '' : 's'}`,
          icon: Wallet,
          color: 'green',
          badge: 'Income',
        },
        {
          label: 'Total Expenses',
          value: formatCurrency(d.total_expenses),
          sub: `${d.expense_count} record${d.expense_count === 1 ? '' : 's'}`,
          icon: ShoppingCart,
          color: 'amber',
          badge: 'Expenses',
        },
        {
          label: 'Net Balance',
          value: formatCurrency(Math.abs(d.net_balance)),
          sub: d.net_balance >= 0 ? 'You have money left' : 'You are overspending',
          icon: d.net_balance >= 0 ? TrendingUp : TrendingDown,
          color: netColor,
          badge: 'Balance',
        },
        {
          label: 'Transactions',
          value: String(d.income_count + d.expense_count),
          sub: `${d.income_count} income, ${d.expense_count} expenses`,
          icon: ArrowRight,
          color: 'purple',
          badge: 'Total',
        },
      ]
    : [
        {
          label: 'Total Expenses',
          value: formatCurrency(d.total_expenses),
          sub: `${d.expense_count} record${d.expense_count === 1 ? '' : 's'}`,
          icon: ShoppingCart,
          color: 'amber',
          badge: 'Expenses',
        },
        {
          label: 'Monthly Average',
          value: formatCurrency(d.daily_spending_trends.length ? d.total_expenses / (d.daily_spending_trends.length || 1) * 30 : 0),
          sub: 'Estimated monthly spend',
          icon: TrendingUp,
          color: 'blue',
          badge: 'Spend',
        },
        {
          label: 'This Year',
          value: formatCurrency(d.monthly_spending_trends.reduce((sum, m) => sum + m.expenses, 0)),
          sub: `${d.monthly_spending_trends.filter((m) => m.expenses > 0).length} month${d.monthly_spending_trends.filter((m) => m.expenses > 0).length === 1 ? '' : 's'} with spend`,
          icon: TrendingDown,
          color: 'purple',
          badge: 'Year',
        },
        {
          label: 'Largest Category',
          value: d.expenses_by_category.length
            ? formatCurrency(Math.max(...d.expenses_by_category.map((c) => c.total)))
            : '—',
          sub: d.expenses_by_category.length
            ? d.expenses_by_category.reduce((a, b) => (b.total > a.total ? b : a), d.expenses_by_category[0]).category_name
            : 'No categories yet',
          icon: Wallet,
          color: 'green',
          badge: 'Top',
        },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {showIncome ? 'Income & Expenses Overview' : 'Expenses Overview'}
            </h1>
            <p className="text-sm text-gray-500">
              {showIncome ? 'See where your money comes from and where it goes' : 'See what you spend and where the money goes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-0.5">
          {(['thisMonth', 'lastMonth', 'thisYear'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : 'This Year'}
            </button>
          ))}
        </div>
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

      {showIncome && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChart
            data={d.income_by_source}
            title="Income by Source"
            dataKey="total"
            nameKey="source"
          />
          <DonutChart
            data={d.expenses_by_category}
            title="Expenses by Category"
            dataKey="total"
            nameKey="category_name"
          />
        </div>
      )}

      {!showIncome && d.expenses_by_category.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChart
            data={d.expenses_by_category}
            title="Expenses by Category"
            dataKey="total"
            nameKey="category_name"
          />
          <MonthlySpendingTrend
            data={d.monthly_spending_trends}
            title="Spending by Month"
            subtitle="Expenses across the current year"
          />
        </div>
      )}

      {showIncome && (
        <IncomeExpenseTrend data={d.monthly_trends} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailySpendingTrend
          data={d.daily_spending_trends}
          title="Daily Spending Trend"
          subtitle="Expenses per day across the current month"
        />
        {showIncome && (
          <MonthlySpendingTrend
            data={d.monthly_spending_trends}
            title="Spending by Month"
            subtitle="Expenses across the current year"
          />
        )}
      </div>

      <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Transactions</h3>
        {d.recent_transactions.length > 0 ? (
          <div className="space-y-1">
            {d.recent_transactions.map((t, i) => (
              <div key={`${t.type}-${t.id}-${i}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    t.type === 'income' ? 'bg-green-500' : 'bg-red-500',
                  )} />
                  <span className="text-sm text-gray-700 truncate">{t.description}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    t.type === 'income' ? 'text-green-700' : 'text-red-700',
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No transactions yet</p>
        )}
      </div>

      {d.total_expenses === 0 && (showIncome ? d.total_income === 0 : true) && (
        <div className="text-center py-12">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {showIncome
              ? 'No data for this period. Record some income or expenses to see your overview.'
              : 'No data for this period. Record some expenses to see your overview.'}
          </p>
        </div>
      )}
    </div>
  );
}