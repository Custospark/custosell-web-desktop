import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Layers,
  LineChart,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
  Banknote,
  Flame,
  Gauge,
  Receipt,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
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

const cardStyles = {
  blue: {
    border: 'border-blue-500',
    shadow: 'hover:shadow-blue-500/20',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    glow: 'bg-blue-500/10',
    hoverBg: 'group-hover:bg-blue-200',
  },
  green: {
    border: 'border-green-500',
    shadow: 'hover:shadow-green-500/20',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
    glow: 'bg-green-500/10',
    hoverBg: 'group-hover:bg-green-200',
  },
  amber: {
    border: 'border-amber-500',
    shadow: 'hover:shadow-amber-500/20',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    glow: 'bg-amber-500/10',
    hoverBg: 'group-hover:bg-amber-200',
  },
  purple: {
    border: 'border-purple-500',
    shadow: 'hover:shadow-purple-500/20',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    glow: 'bg-purple-500/10',
    hoverBg: 'group-hover:bg-purple-200',
  },
  indigo: {
    border: 'border-indigo-500',
    shadow: 'hover:shadow-indigo-500/20',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
    glow: 'bg-indigo-500/10',
    hoverBg: 'group-hover:bg-indigo-200',
  },
} as const;

type CardColor = keyof typeof cardStyles;

const quickLinks = [
  { to: ROUTES.FORECASTING.BUDGETS, label: 'Budgets', icon: Layers },
  { to: ROUTES.FORECASTING.KPIS, label: 'KPIs', icon: Target },
  { to: ROUTES.FORECASTING.SCENARIOS, label: 'Scenarios', icon: TrendingUp },
  { to: ROUTES.ACCOUNTING.RATIOS, label: 'Accounting', icon: Receipt },
] as const;

function KpiCard({
  label,
  value,
  badge,
  icon: Icon,
  color,
  hint,
  to,
}: {
  label: string;
  value: string;
  badge: string;
  icon: typeof Wallet;
  color: CardColor;
  hint?: ReactNode;
  to?: string;
}) {
  const s = cardStyles[color];
  const body = (
    <div
      className={cn(
        'relative flex min-h-[130px] flex-col justify-center overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-gray-50/80 p-6 transition-all duration-300',
        s.border,
        s.shadow,
        'group hover:-translate-y-0.5',
        to && 'cursor-pointer',
      )}
    >
      <div className={cn('absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl', s.glow)} />
      <div className="relative mb-4 flex items-center justify-between">
        <div className={cn('rounded-xl p-3.5 transition-all duration-300 group-hover:scale-110', s.iconBg, s.hoverBg)}>
          <Icon className={cn('h-6 w-6', s.iconColor)} />
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.badge)}>{badge}</span>
      </div>
      <p className="relative mb-0.5 text-2xl font-bold leading-tight tabular-nums break-words text-gray-900 sm:text-3xl">{value}</p>
      <p className="relative text-sm font-medium text-gray-500">{label}</p>
      {hint ? <div className="relative mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
}

function BurnStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

function CashMonthsTable({ months }: { months: ForecastMonthRow[] }) {
  if (months.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No month projections for this horizon.</p>;
  }

  return (
    <div className={cn(FORECAST_SURFACE.tableWrap, 'max-h-[28rem] overflow-x-auto overflow-y-auto')}>
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="whitespace-nowrap px-3 py-2">Month</th>
            <th className="whitespace-nowrap px-3 py-2">Opening</th>
            <th className="whitespace-nowrap px-3 py-2">Inflows</th>
            <th className="whitespace-nowrap px-3 py-2">Payroll</th>
            <th className="whitespace-nowrap px-3 py-2">Opex</th>
            <th className="whitespace-nowrap px-3 py-2">Net</th>
            <th className="whitespace-nowrap px-3 py-2">Closing</th>
            <th className="whitespace-nowrap px-3 py-2">Cover</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {months.map((row) => (
            <tr key={`${row.offset}-${row.month_start}`} className="hover:bg-indigo-50/30">
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
    navigate(ROUTES.SETTINGS.MODULES);
  };

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div className="space-y-6">
      <ForecastingPageHeader
        icon={LineChart}
        title="Forecasting overview"
        description="Cash runway, burn, and budget vs actual — one pulse for the selected horizon."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span className="font-medium text-gray-700">Horizon</span>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-md border-0 bg-transparent py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0"
              >
                {[3, 6, 9, 12, 18, 24].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        )}
      />

      {isError ? (
        <ForecastingEmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="Could not load forecast"
          description={sanitizeErrorMessage(error, 'Check your connection and try again.')}
          action={(
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          )}
        />
      ) : !cash ? (
        <ForecastingEmptyState
          icon={<LineChart className="h-6 w-6" />}
          title="No forecast data yet"
          description="Open an accounting period or record sales and expenses so we can project cash."
          action={(
            <Link to={ROUTES.ACCOUNTING.PERIODS}>
              <Button size="sm">Open accounting periods</Button>
            </Link>
          )}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label="Cash available"
              value={formatForecastMoney(cash.cash.cash_available)}
              badge="Cash"
              icon={Wallet}
              color="blue"
              hint={`As of ${cash.as_of_date}`}
            />
            <KpiCard
              label="Unpaid payroll"
              value={formatForecastMoney(cash.liabilities.unpaid_payroll_liabilities)}
              badge="Liabilities"
              icon={Banknote}
              color="amber"
              hint="Salaries + PAYE + NSSF payable"
            />
            <KpiCard
              label="Monthly burn"
              value={formatForecastMoney(cash.burn.monthly_total_burn)}
              badge="Burn"
              icon={Flame}
              color="purple"
              hint={`Payroll ${formatForecastMoney(cash.burn.monthly_payroll_burn)} + opex`}
            />
            <KpiCard
              label="Cash runway"
              value={
                cash.coverage.runway_months == null
                  ? '∞'
                  : `${cash.coverage.runway_months_floor}+ mo`
              }
              badge="Runway"
              icon={Gauge}
              color="indigo"
              hint={<CoverageStatusBadge status={cash.coverage.status} />}
            />
            <KpiCard
              label="Assumed inflow"
              value={formatForecastMoney(cash.inflows.assumed_monthly_inflow)}
              badge="Inflow"
              icon={TrendingUp}
              color="green"
              hint={`Trailing sales ${formatForecastMoney(cash.inflows.trailing_30d_net_sales)}`}
              to={ROUTES.FORECASTING.SCENARIOS}
            />
          </div>

          <AssumptionsWarningsPanel assumptions={data?.assumptions} warnings={data?.warnings} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="min-w-0 space-y-6 lg:col-span-3">
              <ForecastingSectionCard
                title="Cash ladder"
                className="min-w-0 overflow-hidden"
                description={`${cash.horizon_months}-month projected cash position`}
                actions={(
                  <Link
                    to={ROUTES.FORECASTING.SCENARIOS}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Run scenarios
                  </Link>
                )}
              >
                <CashMonthsTable months={cash.months} />
              </ForecastingSectionCard>

              <ForecastingSectionCard
                title="Burn breakdown"
                description="Payroll from HR affordability; opex from trailing 30-day expenses"
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <BurnStat label="Payroll burn" value={formatForecastMoney(cash.burn.monthly_payroll_burn)} />
                  <BurnStat label="Trailing 30d opex" value={formatForecastMoney(cash.burn.trailing_30d_opex)} />
                  <BurnStat label="Extra opex" value={formatForecastMoney(cash.burn.extra_monthly_opex)} />
                  <BurnStat label="Trailing net sales" value={formatForecastMoney(cash.inflows.trailing_30d_net_sales)} />
                </div>
              </ForecastingSectionCard>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <ForecastingSectionCard
                title="Budget vs actual"
                description={
                  bva
                    ? `${bva.start_date} → ${bva.end_date}${bva.period ? ` · ${bva.period.name}` : ''}`
                    : 'Planned vs spent this period'
                }
                actions={(
                  <button
                    type="button"
                    onClick={goToExpenseCategories}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Expense categories
                  </button>
                )}
              >
                {!bva || bva.categories.length === 0 ? (
                  <ForecastingEmptyState
                    className="border-0 py-8 shadow-none"
                    title="No expense categories"
                    description="Add categories with budgets to compare planned vs actual spend."
                    action={(
                      <Button type="button" size="sm" variant="outline" onClick={goToExpenseCategories}>
                        Manage categories
                      </Button>
                    )}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <ForecastMetric label="Total budget" value={formatForecastMoney(bva.totals.budget)} />
                      <ForecastMetric label="Total actual" value={formatForecastMoney(bva.totals.actual)} />
                      <ForecastMetric
                        label="Variance"
                        value={`${formatForecastMoney(bva.totals.variance)} (${formatForecastPct(bva.totals.variance_pct)})`}
                      />
                    </div>
                    <div className={cn(FORECAST_SURFACE.tableWrap, 'max-h-64 overflow-auto')}>
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-white/90 text-left text-xs font-semibold uppercase text-gray-500 backdrop-blur">
                          <tr>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Var</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bva.categories.map((row) => (
                            <tr key={row.expense_category_id} className="hover:bg-indigo-50/30">
                              <td className="px-3 py-2">
                                <p className="font-medium text-gray-900">{row.name}</p>
                                <p className="text-[11px] text-gray-500">
                                  {formatForecastMoney(row.actual)} / {formatForecastMoney(row.budget)}
                                </p>
                              </td>
                              <td
                                className={cn(
                                  'px-3 py-2 font-mono text-xs tabular-nums',
                                  row.variance > 0 ? 'text-red-600' : 'text-emerald-700',
                                )}
                              >
                                {formatForecastPct(row.variance_pct)}
                              </td>
                              <td className="px-3 py-2">
                                <BvaStatusBadge status={row.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Link
                      to={ROUTES.FORECASTING.BUDGETS}
                      className="inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Open budgets
                    </Link>
                  </div>
                )}
              </ForecastingSectionCard>

              <ForecastingSectionCard title="Coverage snapshot" description="Can cash clear arrears and sustain burn?">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CoverageStatusBadge status={cash.coverage.status} />
                    <span className="text-sm text-gray-600">
                      {cash.coverage.can_clear_arrears ? 'Can clear arrears' : 'Cannot clear arrears yet'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">After arrears</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
                        {formatForecastMoney(cash.coverage.cash_after_arrears)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Cash / bank</p>
                      <p className="mt-1 text-sm tabular-nums text-gray-900">
                        {formatForecastMoney(cash.cash.cash_1101)} · {formatForecastMoney(cash.cash.bank_1102)}
                      </p>
                    </div>
                  </div>
                </div>
              </ForecastingSectionCard>

              <ForecastingSectionCard title="Quick links" description="Jump into forecasting work">
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-800"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              </ForecastingSectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
