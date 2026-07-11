import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, LineChart, RefreshCw } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canAccessModule } from '../../../shared/utils/moduleAccess';
import { useForecastingOverview } from '../api/useForecastingQueries';
import type { ForecastMonthRow } from '../api/forecastingTypes';
import {
  AssumptionsWarningsPanel,
  BvaStatusBadge,
  CoverageStatusBadge,
  ForecastMetric,
} from '../ui/ForecastBadges';
import { formatForecastMoney, formatForecastPct } from '../ui/forecastFormat';
import { ForecastingEmptyState, ForecastingPageHeader, ForecastingSectionCard } from '../ui/ForecastingSurface';
import { FORECAST_SURFACE } from '../ui/forecastingSurfaceStyles';

function CashMonthsTable({ months }: { months: ForecastMonthRow[] }) {
  if (months.length === 0) {
    return <p className="text-sm text-gray-500">No month projections for this horizon.</p>;
  }

  return (
    <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Month</th>
            <th className="px-3 py-2">Opening</th>
            <th className="px-3 py-2">Inflows</th>
            <th className="px-3 py-2">Payroll</th>
            <th className="px-3 py-2">Opex</th>
            <th className="px-3 py-2">Net</th>
            <th className="px-3 py-2">Closing</th>
            <th className="px-3 py-2">Cover</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {months.map((row) => (
            <tr key={`${row.offset}-${row.month_start}`}>
              <td className="px-3 py-2">
                <span className="font-medium text-gray-900">{row.label}</span>
                <span className="ml-1.5 font-mono text-[11px] text-gray-400">{row.month_start}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(row.opening_cash)}</td>
              <td className="px-3 py-2 font-mono text-xs tabular-nums text-emerald-700">{formatForecastMoney(row.inflows)}</td>
              <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(row.payroll_outflow)}</td>
              <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(row.opex_outflow)}</td>
              <td
                className={cn(
                  'px-3 py-2 font-mono text-xs tabular-nums',
                  row.net_change < 0 ? 'text-red-600' : 'text-emerald-700',
                )}
              >
                {formatForecastMoney(row.net_change)}
              </td>
              <td
                className={cn(
                  'px-3 py-2 font-mono text-xs tabular-nums font-medium',
                  row.closing_cash < 0 ? 'text-red-600' : 'text-gray-900',
                )}
              >
                {formatForecastMoney(row.closing_cash)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                    row.can_cover
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-red-50 text-red-700 ring-red-600/20',
                  )}
                >
                  {row.can_cover ? 'Yes' : 'No'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ForecastingOverviewPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [horizon, setHorizon] = useState(6);
  const { data, isLoading, isFetching, isError, error, refetch } = useForecastingOverview({
    horizon_months: horizon,
  });

  const cash = data?.cash_forecast;
  const bva = data?.budget_vs_actual;

  const goToExpenseCategories = () => {
    if (canAccessModule(user, 'expenses')) {
      navigate(ROUTES.EXPENSES.CATEGORIES);
      return;
    }
    // Categories live under Expenses — send owners to module access if Expenses is off.
    navigate(ROUTES.SETTINGS.MODULES);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <ForecastingPageHeader
        icon={LineChart}
        title="Forecasting overview"
        description="Cash runway, burn breakdown, and budget vs actual for the selected horizon."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              Horizon
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
              >
                {[3, 6, 9, 12, 18, 24].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <ForecastingEmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="Could not load forecast"
          description={sanitizeErrorMessage(error, 'Check your connection and try again.')}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : !cash ? (
        <ForecastingEmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="No forecast data yet"
          description="Open an accounting period or record sales and expenses so we can project cash."
          action={
            <Link to={ROUTES.ACCOUNTING.PERIODS}>
              <Button size="sm">Open accounting periods</Button>
            </Link>
          }
        />
      ) : (
        <>
          <AssumptionsWarningsPanel assumptions={data?.assumptions} warnings={data?.warnings} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ForecastMetric
              label="Cash available"
              value={formatForecastMoney(cash.cash.cash_available)}
              hint={`As of ${cash.as_of_date}`}
            />
            <ForecastMetric
              label="Unpaid payroll"
              value={formatForecastMoney(cash.liabilities.unpaid_payroll_liabilities)}
            />
            <ForecastMetric
              label="Monthly total burn"
              value={formatForecastMoney(cash.burn.monthly_total_burn)}
              hint={`Payroll ${formatForecastMoney(cash.burn.monthly_payroll_burn)} + opex ${formatForecastMoney(cash.burn.monthly_opex)}`}
            />
            <ForecastMetric
              label="Runway"
              value={
                <span className="inline-flex items-center gap-2">
                  {cash.coverage.runway_months == null
                    ? '∞'
                    : `${cash.coverage.runway_months} mo`}
                  <CoverageStatusBadge status={cash.coverage.status} />
                </span>
              }
              hint={`Assumed inflow ${formatForecastMoney(cash.inflows.assumed_monthly_inflow)}/mo`}
            />
          </div>

          <ForecastingSectionCard
            title="Burn breakdown"
            description="Payroll burn from HR affordability; opex from trailing 30-day expenses."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ForecastMetric label="Payroll burn" value={formatForecastMoney(cash.burn.monthly_payroll_burn)} />
              <ForecastMetric label="Trailing 30d opex" value={formatForecastMoney(cash.burn.trailing_30d_opex)} />
              <ForecastMetric label="Extra opex" value={formatForecastMoney(cash.burn.extra_monthly_opex)} />
              <ForecastMetric
                label="Trailing 30d net sales"
                value={formatForecastMoney(cash.inflows.trailing_30d_net_sales)}
              />
            </div>
          </ForecastingSectionCard>

          <ForecastingSectionCard title="Cash ladder" description={`${cash.horizon_months}-month projected cash position.`}>
            <CashMonthsTable months={cash.months} />
          </ForecastingSectionCard>

          <ForecastingSectionCard
            title="Budget vs actual"
            description={
              bva
                ? `${bva.start_date} → ${bva.end_date}${bva.period ? ` · ${bva.period.name}` : ''}`
                : undefined
            }
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                onClick={goToExpenseCategories}
              >
                Expense categories
              </Button>
            }
          >
            {!bva || bva.categories.length === 0 ? (
              <ForecastingEmptyState
                className="border-0 shadow-none"
                title="No expense categories"
                description="Add expense categories with budgets to compare planned vs actual spend."
                action={
                  <Button type="button" size="sm" variant="outline" onClick={goToExpenseCategories}>
                    Manage categories
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <ForecastMetric label="Total budget" value={formatForecastMoney(bva.totals.budget)} />
                  <ForecastMetric label="Total actual" value={formatForecastMoney(bva.totals.actual)} />
                  <ForecastMetric
                    label="Variance"
                    value={`${formatForecastMoney(bva.totals.variance)} (${formatForecastPct(bva.totals.variance_pct)})`}
                  />
                </div>
                <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Budget</th>
                        <th className="px-3 py-2">Actual</th>
                        <th className="px-3 py-2">Variance</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bva.categories.map((row) => (
                        <tr key={row.expense_category_id}>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(row.budget)}</td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatForecastMoney(row.actual)}</td>
                          <td
                            className={cn(
                              'px-3 py-2 font-mono text-xs tabular-nums',
                              row.variance > 0 ? 'text-red-600' : 'text-emerald-700',
                            )}
                          >
                            {formatForecastMoney(row.variance)} ({formatForecastPct(row.variance_pct)})
                          </td>
                          <td className="px-3 py-2">
                            <BvaStatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </ForecastingSectionCard>
        </>
      )}
    </div>
  );
}
