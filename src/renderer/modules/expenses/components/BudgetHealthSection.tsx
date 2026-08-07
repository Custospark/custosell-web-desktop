import { useMoneySummary, useBudgetAlerts } from '../api/BudgetQueries';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { ShieldCheck, AlertTriangle, Bell, PiggyBank, ChevronRight } from 'lucide-react';
import type { BudgetAlert } from '../api/BudgetTypes';

function AlertRow({ alert }: { alert: BudgetAlert }) {
  const isOver = alert.level === 'over';
  return (
    <li className="flex items-start gap-2 rounded-lg border border-gray-100 px-3 py-2">
      {isOver ? (
        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      ) : (
        <Bell className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-700">{alert.message}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {isOver ? `${formatCurrency(Math.abs(alert.remaining))} over` : `${formatCurrency(alert.remaining)} left`} · {alert.name}
        </p>
      </div>
    </li>
  );
}

export default function BudgetHealthSection() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useMoneySummary();
  const { data: alerts } = useBudgetAlerts();

  if (isLoading || !summary) return null;

  const healthy = summary.affordable;
  const visibleItems = (alerts ?? []).slice(0, 3);

  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 ${
          healthy ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        {healthy ? (
          <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${healthy ? 'text-green-800' : 'text-amber-800'}`}>
            {healthy ? 'Your plans fit your income' : 'Your plans may be too big'}
          </p>
          <p className={`text-xs mt-0.5 ${healthy ? 'text-green-700' : 'text-amber-700'}`}>{summary.recommendation}</p>
        </div>
        <div className="hidden sm:block shrink-0">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Planned across {summary.budget_count} budget{summary.budget_count === 1 ? '' : 's'}</p>
            <p className="text-sm font-bold text-gray-800">{formatCurrency(summary.planned_total)}</p>
          </div>
        </div>
      </div>

      {visibleItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" /> Budget alerts
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.EXPENSES.BUDGETS)}>
              <PiggyBank className="w-3.5 h-3.5 mr-1" /> View budgets <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <ul className="p-2 space-y-1">
            {visibleItems.map((a, i) => (
              <AlertRow key={i} alert={a} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}