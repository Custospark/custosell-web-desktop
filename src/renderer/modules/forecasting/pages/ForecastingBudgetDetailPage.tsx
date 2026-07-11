import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';
import {
  useApproveForecastBudgetLine,
  useCreateForecastBudgetLine,
  useDeleteForecastBudgetLine,
  useForecastBudget,
  useForecastSnapshots,
  useJustifyForecastBudgetLine,
  useRollForecastBudget,
  useUpdateForecastBudgetLine,
} from '../api/useForecastingQueries';
import type { ForecastBudgetLine } from '../api/forecastingTypes';
import { ZbbStatusBadge } from '../ui/ForecastBadges';
import { formatForecastMoney } from '../ui/forecastFormat';
import { ForecastingEmptyState, ForecastingPageHeader, ForecastingSectionCard } from '../ui/ForecastingSurface';
import { FORECAST_SURFACE } from '../ui/forecastingSurfaceStyles';

export default function ForecastingBudgetDetailPage() {
  const { budgetId: budgetIdParam } = useParams<{ budgetId: string }>();
  const budgetId = Number(budgetIdParam);
  const { data: budget, isLoading, isError, error, refetch } = useForecastBudget(budgetId);
  const { data: snapshots = [] } = useForecastSnapshots(budgetId, budgetId > 0);

  const createLine = useCreateForecastBudgetLine();
  const updateLine = useUpdateForecastBudgetLine();
  const deleteLine = useDeleteForecastBudgetLine();
  const justifyLine = useJustifyForecastBudgetLine();
  const approveLine = useApproveForecastBudgetLine();
  const rollBudget = useRollForecastBudget();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [justifyTarget, setJustifyTarget] = useState<ForecastBudgetLine | null>(null);
  const [justification, setJustification] = useState('');
  const [rollLabel, setRollLabel] = useState('');

  const total = useMemo(
    () => (budget?.lines ?? []).reduce((sum, line) => sum + line.amount, 0),
    [budget?.lines],
  );

  const handleAddLine = () => {
    if (!label.trim() || !budgetId) return;
    createLine.mutate(
      {
        budgetId,
        label: label.trim(),
        amount: amount === '' ? 0 : Number(amount),
      },
      {
        onSuccess: () => {
          setLabel('');
          setAmount('');
        },
      },
    );
  };

  const openJustify = (line: ForecastBudgetLine) => {
    setJustifyTarget(line);
    setJustification(line.justification ?? '');
  };

  const submitJustify = () => {
    if (!justifyTarget || !justification.trim()) return;
    justifyLine.mutate(
      { budgetId, lineId: justifyTarget.id, justification: justification.trim() },
      { onSuccess: () => setJustifyTarget(null) },
    );
  };

  if (!budgetId || Number.isNaN(budgetId)) {
    return (
      <div className="p-6">
        <ForecastingEmptyState
          title="Invalid budget"
          description="This budget link is not valid."
          action={
            <Link to={ROUTES.FORECASTING.BUDGETS}>
              <Button size="sm" variant="outline">
                Back to budgets
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        to={ROUTES.FORECASTING.BUDGETS}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Budgets
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError || !budget ? (
        <ForecastingEmptyState
          title="Budget not found"
          description={sanitizeErrorMessage(error, 'This budget may have been deleted.')}
          action={
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <ForecastingPageHeader
            icon={FileText}
            title={budget.name}
            description={`${budget.year} · ${budget.status} · ${budget.lines.length} lines · total ${formatForecastMoney(total)}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={rollLabel}
                  onChange={(e) => setRollLabel(e.target.value)}
                  placeholder="Snapshot label (optional)"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  loading={rollBudget.isPending}
                  onClick={() =>
                    rollBudget.mutate({
                      budgetId,
                      label: rollLabel.trim() || null,
                    })
                  }
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Roll forecast
                </Button>
              </div>
            }
          />

          <ForecastingSectionCard title="Add budget line" description="Every line starts at zero-based draft until justified.">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Label</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Office rent"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </label>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={handleAddLine} loading={createLine.isPending} disabled={!label.trim()}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
          </ForecastingSectionCard>

          <ForecastingSectionCard title="Lines" description="Justify each line, then approve. Amounts can be edited inline.">
            {budget.lines.length === 0 ? (
              <p className="text-sm text-gray-500">No lines yet. Add your first zero-based line above.</p>
            ) : (
              <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Justification</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {budget.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{line.label}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={line.amount}
                            className="w-28 rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                            onBlur={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isNaN(next) && next !== line.amount) {
                                updateLine.mutate({ budgetId, lineId: line.id, amount: next });
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ZbbStatusBadge status={line.zbb_status} />
                        </td>
                        <td className="max-w-xs px-3 py-2 text-xs text-gray-600">
                          {line.justification || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => openJustify(line)}>
                              Justify
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!line.justification || line.zbb_status === 'approved'}
                              loading={approveLine.isPending}
                              onClick={() => approveLine.mutate({ budgetId, lineId: line.id })}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              loading={deleteLine.isPending}
                              onClick={() => deleteLine.mutate({ budgetId, lineId: line.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ForecastingSectionCard>

          <ForecastingSectionCard title="Snapshots" description="Rolling a forecast captures budget lines plus YTD expense actuals.">
            {snapshots.length === 0 ? (
              <p className="text-sm text-gray-500">No snapshots yet. Use Roll forecast to capture one.</p>
            ) : (
              <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">As of</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {snapshots.map((snap) => (
                      <tr key={snap.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{snap.label}</td>
                        <td className="px-3 py-2 font-mono text-xs">{snap.as_of_date}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {snap.created_at ? new Date(snap.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ForecastingSectionCard>
        </>
      )}

      {justifyTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">Justify: {justifyTarget.label}</h3>
            <p className="mt-1 text-sm text-gray-500">Explain why this line starts from zero and deserves funding.</p>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Business justification…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setJustifyTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={justifyLine.isPending}
                disabled={!justification.trim()}
                onClick={submitJustify}
              >
                Save justification
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
