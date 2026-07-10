import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calendar,
  Gauge,
  RefreshCw,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';
import type {
  HrPayrollAffordabilityCoverage,
  HrPayrollAffordabilityHirePayload,
  HrPayrollAffordabilityMonth,
  HrPayrollAffordabilityRequest,
  HrPayrollAffordabilityStatus,
} from '../api/hrTypes';
import { useHrPayrollAffordability } from '../api/useHrQueries';
import { HrSectionCard } from './HrSurface';
import { HrFormSection, HrIconField, hrInputClass, hrSelectClass } from './hrFormFields';
import { HR_SURFACE } from './hrSurfaceStyles';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

const statusStyles: Record<HrPayrollAffordabilityStatus, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  tight: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  unknown: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function RunwayStatusBadge({ status }: { status: HrPayrollAffordabilityStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-gray-50/80 p-3', accent)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</div>
      {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function MonthsTable({ months }: { months: HrPayrollAffordabilityMonth[] }) {
  if (months.length === 0) {
    return <p className="text-sm text-gray-500">No month projections for this horizon.</p>;
  }

  return (
    <div className={HR_SURFACE.tableWrap}>
      <table className="min-w-full text-sm">
        <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Month</th>
            <th className="px-3 py-2">Need</th>
            <th className="px-3 py-2">Surplus / deficit</th>
            <th className="px-3 py-2">Can cover</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {months.map((row) => (
            <tr key={`${row.offset}-${row.month_start}`}>
              <td className="px-3 py-2">
                <span className="font-medium text-gray-900">{row.label}</span>
                <span className="ml-1.5 font-mono text-[11px] text-gray-400">{row.month_start}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{formatMoney(row.need)}</td>
              <td
                className={cn(
                  'px-3 py-2 font-mono text-xs',
                  row.surplus_deficit < 0 ? 'text-red-600' : 'text-emerald-700',
                )}
              >
                {formatMoney(row.surplus_deficit)}
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

function CoverageSummary({
  coverage,
  label,
}: {
  coverage: HrPayrollAffordabilityCoverage;
  label?: string;
}) {
  const runway =
    coverage.runway_months == null
      ? '—'
      : `${coverage.runway_months.toFixed(1)} mo`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
      {label ? <span className="font-medium text-gray-900">{label}</span> : null}
      <span className="font-mono tabular-nums">{runway}</span>
      <RunwayStatusBadge status={coverage.status} />
      <span className="text-xs text-gray-500">
        {coverage.can_clear_arrears ? 'Can clear arrears' : 'Cannot clear arrears'}
      </span>
    </div>
  );
}

export function HrPayrollAffordabilityPanel() {
  const [asOfDate, setAsOfDate] = useState('');
  const [horizonMonths, setHorizonMonths] = useState(3);
  const [hireSalary, setHireSalary] = useState('');
  const [hireOffset, setHireOffset] = useState(0);
  const [applied, setApplied] = useState<HrPayrollAffordabilityRequest>({
    horizon_months: 3,
    hire: null,
  });

  const queryFilters = useMemo(
    () => ({
      as_of_date: applied.as_of_date || undefined,
      period_id: applied.period_id ?? null,
      horizon_months: applied.horizon_months ?? 3,
      hire: applied.hire ?? null,
    }),
    [applied],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useHrPayrollAffordability(queryFilters);

  const applyAndLoad = (hire: HrPayrollAffordabilityHirePayload | null = null) => {
    const next: HrPayrollAffordabilityRequest = {
      as_of_date: asOfDate || undefined,
      horizon_months: horizonMonths,
      hire,
    };
    const sameKey = JSON.stringify(next) === JSON.stringify(applied);
    setApplied(next);
    if (sameKey) void refetch();
  };

  const runHireScenario = () => {
    const salary = Number(hireSalary);
    if (!Number.isFinite(salary) || salary <= 0) return;
    applyAndLoad({
      basic_salary: salary,
      allowances: [],
      deductions: [],
      start_month_offset: hireOffset,
    });
  };

  const errorMessage = isError
    ? sanitizeErrorMessage(error, 'Could not load payroll affordability')
    : null;

  return (
    <HrSectionCard
      title="Payroll cash runway"
      description={`Can we clear salaries and statutory obligations this month and for the next ${applied.horizon_months ?? 3} months?`}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isFetching && !isLoading}
          onClick={() => applyAndLoad(null)}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      <HrFormSection title="Runway controls" icon={Gauge} description="As-of date and how far ahead to project cash need.">
        <div className="grid gap-4 sm:grid-cols-2">
          <HrIconField label="As of date" icon={Calendar}>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className={hrInputClass}
            />
          </HrIconField>
          <HrIconField label="Horizon (months)" icon={Gauge}>
            <select
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className={hrSelectClass}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </HrIconField>
        </div>
      </HrFormSection>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric
              label="Cash available"
              value={formatMoney(data.cash.cash_available)}
              hint={`Cash ${formatMoney(data.cash.cash_1101)} · Bank ${formatMoney(data.cash.bank_1102)}`}
            />
            <SummaryMetric
              label="Unpaid payroll liabilities"
              value={formatMoney(data.liabilities.unpaid_payroll_liabilities)}
              hint={
                data.coverage.can_clear_arrears ? 'Enough cash to clear arrears' : 'Shortfall vs arrears'
              }
            />
            <SummaryMetric
              label="Monthly burn"
              value={formatMoney(data.burn.monthly_burn)}
              hint={`${data.burn.employee_count} employee(s) · gross + employer NSSF`}
            />
            <SummaryMetric
              label="Runway"
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {data.coverage.runway_months == null
                      ? '—'
                      : `${data.coverage.runway_months.toFixed(1)}`}
                  </span>
                  <RunwayStatusBadge status={data.coverage.status} />
                </span>
              }
              hint={`Floor ${data.coverage.runway_months_floor} mo · after arrears ${formatMoney(data.coverage.cash_after_arrears)}`}
            />
          </div>

          {data.period ? (
            <p className="text-xs text-gray-500">
              Period {data.period.name} ({data.period.start_date} – {data.period.end_date})
              {data.period.is_closed ? ' · closed' : ' · open'} · as of {data.as_of_date}
            </p>
          ) : null}

          {data.warnings.length > 0 ? (
            <ul className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              {data.warnings.map((warning) => (
                <li key={warning} className="flex gap-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Month coverage
            </h3>
            <MonthsTable months={data.months} />
          </div>

          <HrFormSection
            title="Hire what-if"
            icon={UserPlus}
            description="Estimate incremental burn and runway if you add one person."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <HrIconField label="Basic salary" icon={Wallet}>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={hireSalary}
                  onChange={(e) => setHireSalary(e.target.value)}
                  placeholder="e.g. 2500000"
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Start month offset" icon={Calendar}>
                <select
                  value={hireOffset}
                  onChange={(e) => setHireOffset(Number(e.target.value))}
                  className={hrSelectClass}
                >
                  {Array.from({ length: Math.max(1, applied.horizon_months ?? 3) }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? 'This month (0)' : i === 1 ? 'Next month (1)' : `Month +${i}`}
                    </option>
                  ))}
                </select>
              </HrIconField>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!hireSalary || Number(hireSalary) <= 0}
                  loading={isFetching && !!applied.hire}
                  onClick={runHireScenario}
                >
                  Run hire scenario
                </Button>
              </div>
            </div>
          </HrFormSection>

          {data.hire_scenario ? (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Hire scenario result</h3>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Incremental monthly burn{' '}
                    <span className="font-mono font-medium text-gray-900">
                      {formatMoney(data.hire_scenario.incremental_monthly_burn)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CoverageSummary coverage={data.coverage} label="Before hire" />
                <CoverageSummary coverage={data.hire_scenario.coverage} label="After hire" />
              </div>
              <MonthsTable months={data.hire_scenario.months} />
            </div>
          ) : null}

          <p className="text-xs leading-relaxed text-gray-500">
            Disclaimer: cash runway assumes no non-payroll cash inflows or other operating outflows.
          </p>
        </div>
      ) : null}
    </HrSectionCard>
  );
}
