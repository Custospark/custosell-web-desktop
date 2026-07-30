import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useBudgets } from './api/IncomeQueries';
import { Wallet, TrendingUp, TrendingDown, Target, DollarSign, RefreshCw } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import { type CardColor } from '../../shared/components/cards/statCardStyles';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { CHART_THEME, formatAxisCurrency } from '../../shared/components/charts/chartPrimitives';

function CategoryProgress({ name, budget, actual, percentage }: {
  name: string; budget: number; actual: number; percentage: number;
}) {
  const color = percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 truncate">{name}</span>
        <span className="font-semibold text-gray-900 ml-2">
          {formatCurrency(actual)} / {formatCurrency(budget)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all', color)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {percentage.toFixed(1)}% used · {formatCurrency(budget - actual)} remaining
      </p>
    </div>
  );
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'year';

function getPeriodDates(key: PeriodKey) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return {
        date_from: start.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
      };
    }
    case 'month':
      return {
        date_from: new Date(y, m, 1).toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
      };
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return {
        date_from: new Date(y, qStart, 1).toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
      };
    }
    case 'year':
      return {
        date_from: new Date(y, 0, 1).toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
      };
  }
}

export default function MyBudgetsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isPersonal = user?.account_type === 'personal';
  const [period, setPeriod] = useState<PeriodKey>('month');
  const dateParams = useMemo(() => getPeriodDates(period), [period]);
  const { data, isLoading, isError, refetch } = useBudgets(dateParams.date_from, dateParams.date_to);

  if (isLoading) return <CustosellLoader message="Loading budgets…" />;

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Could not load budgets.</p>
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

  const chartData = [
    { name: 'Income', target: d.income_target, actual: d.income_actual },
    { name: 'Expenses', target: d.expense_budget, actual: d.expense_actual },
    { name: 'Net', target: d.net_target, actual: d.net_actual },
  ];

  const netColor: CardColor = d.net_actual >= 0 ? 'blue' : 'amber';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Budgets</h1>
            <p className="text-sm text-gray-500">{d.period.label} · {d.period.days_remaining} days remaining</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-0.5">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <DashboardStatCard
          label="Income Target"
          value={formatCurrency(d.income_target)}
          sub={`Actual: ${formatCurrency(d.income_actual)}`}
          icon={Wallet}
          color="green"
          badge="Target"
        />
        <DashboardStatCard
          label="Expense Budget"
          value={formatCurrency(d.expense_budget)}
          sub={`Actual: ${formatCurrency(d.expense_actual)}`}
          icon={DollarSign}
          color="amber"
          badge="Budget"
        />
        <DashboardStatCard
          label="Net Budget"
          value={formatCurrency(d.net_target)}
          sub={d.net_actual >= 0 ? `Actual: ${formatCurrency(d.net_actual)}` : `Actual: -${formatCurrency(Math.abs(d.net_actual))}`}
          icon={d.net_actual >= 0 ? TrendingUp : TrendingDown}
          color={netColor}
          badge="Net"
        />
        <DashboardStatCard
          label="Daily Remaining"
          value={formatCurrency(d.daily_remaining)}
          sub="Budget left per day"
          icon={Target}
          color="purple"
          badge="Daily"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Budget vs Actual</h3>
        <ChartContainer className="h-72" minHeight={288}>
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAxisCurrency} />
                <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
                <Bar dataKey="target" fill={CHART_THEME.line} radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="actual" fill={CHART_THEME.transactions} radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>

      {d.categories.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Category Budget Breakdown</h3>
          <div className="space-y-4">
            {d.categories
              .slice()
              .sort((a, b) => b.percentage - a.percentage)
              .map((cat) => (
                <CategoryProgress
                  key={cat.id}
                  name={cat.name}
                  budget={cat.budget}
                  actual={cat.actual}
                  percentage={cat.percentage}
                />
              ))}
          </div>
        </div>
      )}

      {d.income_target === 0 && d.expense_budget === 0 && (
        <div className="text-center py-12">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {isPersonal
              ? 'No budgets set yet. Set an income target in your preferences and expense category budgets to see your plan vs actual.'
              : 'No budgets set yet. Set an income target in your business settings and expense category budgets to see your plan vs actual.'}
          </p>
        </div>
      )}
    </div>
  );
}
