import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { cn } from '../../../shared/utils/cn';
import { useCreateForecastBudget, useForecastBudgets } from '../api/useForecastingQueries';
import type { ForecastBudgetStatus } from '../api/forecastingTypes';
import { formatForecastMoney } from '../ui/forecastFormat';
import { ForecastingEmptyState, ForecastingPageHeader, ForecastingSectionCard } from '../ui/ForecastingSurface';
import { FORECAST_SURFACE } from '../ui/forecastingSurfaceStyles';

const statusStyles: Record<ForecastBudgetStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  archived: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

export default function ForecastingBudgetsPage() {
  const navigate = useNavigate();
  const { data: budgets = [], isLoading } = useForecastBudgets();
  const createBudget = useCreateForecastBudget();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [name, setName] = useState(`${currentYear} Zero-based budget`);
  const [status, setStatus] = useState<ForecastBudgetStatus>('draft');

  const handleCreate = () => {
    if (!name.trim()) return;
    createBudget.mutate(
      { year, name: name.trim(), status },
      {
        onSuccess: (budget) => {
          navigate(ROUTES.FORECASTING.BUDGET(budget.id));
        },
      },
    );
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <ForecastingPageHeader
        icon={Layers}
        title="Forecast budgets"
        description="Zero-based annual budgets with line justification and rolling snapshots."
      />

      <ForecastingSectionCard title="Create year budget" description="Start a draft budget for a calendar year.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Year</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 2026 Operating budget"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ForecastBudgetStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={handleCreate} loading={createBudget.isPending} disabled={!name.trim()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create budget
          </Button>
        </div>
      </ForecastingSectionCard>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : budgets.length === 0 ? (
        <ForecastingEmptyState
          icon={<Layers className="h-6 w-6" />}
          title="No budgets yet"
          description="Create a year budget above, then add zero-based lines and justify each one."
        />
      ) : (
        <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Lines</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.map((budget) => {
                const total = budget.lines.reduce((sum, line) => sum + line.amount, 0);
                return (
                  <tr key={budget.id}>
                    <td className="px-3 py-2 font-mono text-xs">{budget.year}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{budget.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
                          statusStyles[budget.status],
                        )}
                      >
                        {budget.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{budget.lines.length}</td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(total)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={ROUTES.FORECASTING.BUDGET(budget.id)} className="text-sm text-blue-600 hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
