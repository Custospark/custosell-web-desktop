import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useIncomeOverview } from './api/IncomeQueries';
import { Card } from '../../shared/components/cards/Card';
import { Wallet, ShoppingCart, TrendingDown, TrendingUp, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Wallet; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4 flex items-start gap-3">
      <div className={cn('rounded-lg p-2.5 shrink-0', color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DonutChart({ data, title, dataKey, nameKey }: {
  data: { [key: string]: string | number }[];
  title: string;
  dataKey: string;
  nameKey: string;
}) {
  if (!data.length) return null;
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
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
          <Tooltip formatter={(val: number) => formatCurrency(val)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-1">
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
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTH_LABELS[m] ?? month;
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const { data, isLoading, isError, refetch } = useIncomeOverview();

  const dateParams = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'thisMonth':
        return {
          date_from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          date_to: now.toISOString().split('T')[0],
        };
      case 'lastMonth':
        return {
          date_from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
          date_to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
        };
      case 'thisYear':
        return {
          date_from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
          date_to: now.toISOString().split('T')[0],
        };
    }
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading overview…
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Income & Expenses Overview</h1>
            <p className="text-sm text-gray-500">See where your money comes from and where it goes</p>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Total Income"
          value={formatCurrency(d.total_income)}
          sub={`${d.income_count} record${d.income_count === 1 ? '' : 's'}`}
          color="bg-gradient-to-br from-green-500 to-green-700"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Expenses"
          value={formatCurrency(d.total_expenses)}
          sub={`${d.expense_count} record${d.expense_count === 1 ? '' : 's'}`}
          color="bg-gradient-to-br from-red-500 to-red-700"
        />
        <StatCard
          icon={d.net_balance >= 0 ? TrendingUp : TrendingDown}
          label="Net Balance"
          value={formatCurrency(Math.abs(d.net_balance))}
          sub={d.net_balance >= 0 ? 'You have money left' : 'You are overspending'}
          color={d.net_balance >= 0
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
            : 'bg-gradient-to-br from-orange-500 to-red-600'}
        />
        <StatCard
          icon={ArrowRight}
          label="Transactions"
          value={String(d.income_count + d.expense_count)}
          sub={`${d.income_count} income, ${d.expense_count} expenses`}
          color="bg-gradient-to-br from-purple-500 to-purple-700"
        />
      </div>

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

      {d.monthly_trends.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.monthly_trends}>
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name === 'income' ? 'Income' : 'Expenses']}
                labelFormatter={formatMonth}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {d.recent_transactions.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white/80 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Transactions</h3>
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
        </div>
      )}

      {d.total_income === 0 && d.total_expenses === 0 && (
        <div className="text-center py-12">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No data for this period. Record some income or expenses to see your overview.</p>
        </div>
      )}
    </div>
  );
}
