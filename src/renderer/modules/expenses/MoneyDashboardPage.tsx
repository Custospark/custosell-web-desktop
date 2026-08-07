import { useNavigate } from 'react-router-dom';
import { useMoneySummary, useBudgetAlerts } from './api/BudgetQueries';
import { Button } from '../../shared/components/buttons/Button';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import {
  ArrowUpRight, ArrowDownRight, PiggyBank, ShieldCheck, AlertTriangle, Bell, TrendingUp, Plus, LayoutDashboard, ListChecks,
} from 'lucide-react';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import type { BudgetAlert } from './api/BudgetTypes';

export default function MoneyDashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError, refetch } = useMoneySummary();
  const { data: alerts } = useBudgetAlerts();

  if (isLoading) return <CustosellLoader message="Loading your money summary…" />;

  if (isError || !summary) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Couldn't load your money summary.</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Money Summary</h1>
            <p className="text-sm text-gray-500">Your income, spending, savings, and whether your plans fit.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.EXPENSES.BUDGETS)}>
            <PiggyBank className="w-4 h-4 mr-1.5" /> My Budgets
          </Button>
          <Button onClick={() => navigate(ROUTES.EXPENSES.BUDGETS)}>
            <Plus className="w-4 h-4 mr-1.5" /> New budget
          </Button>
        </div>
      </div>

      {!summary.affordable && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Your plans may be too big</p>
            <p className="text-xs text-amber-700 mt-0.5">{summary.recommendation}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardStatCard
          label="Income this period"
          value={formatCurrency(summary.income)}
          sub="Money coming in"
          icon={ArrowUpRight}
          color="green"
          badge="Income"
        />
        <DashboardStatCard
          label="Spending this period"
          value={formatCurrency(summary.expense)}
          sub="Money going out"
          icon={ArrowDownRight}
          color="amber"
          badge="Spent"
        />
        <DashboardStatCard
          label="Net savings"
          value={formatCurrency(summary.savings)}
          sub="Income minus spending"
          icon={TrendingUp}
          color={summary.savings >= 0 ? 'blue' : 'red'}
          badge={summary.savings >= 0 ? 'Saved' : 'Overspent'}
        />
        <DashboardStatCard
          label="Planned across budgets"
          value={formatCurrency(summary.planned_total)}
          sub={`${summary.budget_count} active budget${summary.budget_count === 1 ? '' : 's'}`}
          icon={PiggyBank}
          color="blue"
          badge="Planned"
        />
      </div>

      {summary.affordable && (
        <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
          <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Your plans fit your income</p>
            <p className="text-xs text-green-700 mt-0.5">{summary.recommendation}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Budget health</h3>
        </div>
        <div className="p-4">
          {(alerts ?? []).length === 0 ? (
            <div className="text-center py-6">
              <ListChecks className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No alerts right now — your budgets are on track.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(alerts ?? []).map((a, i) => (
                <AlertRow key={i} alert={a} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: BudgetAlert }) {
  const isOver = alert.level === 'over';
  return (
    <li className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
      {isOver ? (
        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      ) : (
        <Bell className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{alert.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {isOver ? `${formatCurrency(Math.abs(alert.remaining))} over` : `${formatCurrency(alert.remaining)} left`} · {alert.name}
        </p>
      </div>
    </li>
  );
}