import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { HrSectionCard } from './HrSurface';
import { PayRunStatusBadge } from './HrStatusBadges';
import { runwayStyles, quickLinks } from './hrOverviewStyles';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import type { HrPayRun } from '../api/hrTypes';
import type { HrPayrollAffordabilityBurn, HrPayrollAffordabilityCoverage } from '../api/hrPayrollAffordabilityTypes';
import { AlertTriangle, Building } from 'lucide-react';

export interface PayRunPulse {
  latest: HrPayRun | null;
  draft: number;
  calculated: number;
  approved: number;
  posted: number;
}

interface HrOverviewRightColumnProps {
  payRunPulse: PayRunPulse;
  affordabilityLoading: boolean;
  affordabilityError: boolean;
  coverage: HrPayrollAffordabilityCoverage | undefined;
  burn: HrPayrollAffordabilityBurn | undefined;
  pendingOnboardingCount: number;
  draftReviewsCount: number;
  atRiskCount: number;
}

function PayrollPulse({ pulse }: { pulse: PayRunPulse }) {
  if (!pulse.latest) {
    return <p className="py-6 text-center text-sm text-gray-500">No pay runs yet.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">
            {formatShiftDateRange(pulse.latest.period_start, pulse.latest.period_end)}
          </p>
          <PayRunStatusBadge status={pulse.latest.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <p>Gross <span className="font-semibold text-gray-900">{formatCurrency(pulse.latest.total_gross ?? 0)}</span></p>
          <p>Net <span className="font-semibold text-gray-900">{formatCurrency(pulse.latest.total_net ?? 0)}</span></p>
        </div>
        <Link
          to={ROUTES.HR.PAY_RUN(pulse.latest.id)}
          className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Open pay run
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {([
          ['Draft', pulse.draft],
          ['Calculated', pulse.calculated],
          ['Approved', pulse.approved],
          ['Posted', pulse.posted],
        ] as const).map(([label, count]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
            <p className="text-gray-500">{label}</p>
            <p className="text-base font-semibold tabular-nums text-gray-900">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashRunway({
  loading,
  isError,
  coverage,
  burn,
}: {
  loading: boolean;
  isError: boolean;
  coverage: HrOverviewRightColumnProps['coverage'];
  burn: HrOverviewRightColumnProps['burn'];
}) {
  if (loading) {
    return <p className="py-6 text-center text-sm text-gray-500">Loading affordability…</p>;
  }
  if (isError || !coverage) {
    return <p className="py-6 text-center text-sm text-gray-500">Could not load cash runway.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
            runwayStyles[coverage.status as keyof typeof runwayStyles] ?? runwayStyles.unknown,
          )}
        >
          {coverage.status}
        </span>
        <span className="text-sm text-gray-600">
          {coverage.runway_months == null
            ? 'Runway unavailable'
            : `${coverage.runway_months_floor}+ months runway`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Monthly burn</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {formatCurrency(burn?.monthly_burn ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Headcount on payroll</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {burn?.employee_count ?? 0}
          </p>
          {(burn?.employees_missing_compensation ?? 0) > 0 ? (
            <p className="mt-0.5 text-xs text-amber-700">
              {burn?.employees_missing_compensation} missing compensation
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TalentPulse({
  pendingOnboardingCount,
  draftReviewsCount,
  atRiskCount,
}: {
  pendingOnboardingCount: number;
  draftReviewsCount: number;
  atRiskCount: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
        <span className="text-gray-600">Pending onboarding tasks</span>
        <span className="font-semibold tabular-nums text-gray-900">{pendingOnboardingCount}</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
        <span className="text-gray-600">Draft reviews</span>
        <span className="font-semibold tabular-nums text-gray-900">{draftReviewsCount}</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          {(atRiskCount > 0) ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
          At risk / behind
        </span>
        <span className={cn('font-semibold tabular-nums', atRiskCount > 0 ? 'text-amber-700' : 'text-gray-900')}>
          {atRiskCount}
        </span>
      </div>
    </div>
  );
}

export default function HrOverviewRightColumn(props: HrOverviewRightColumnProps) {
  const {
    payRunPulse,
    affordabilityLoading,
    affordabilityError,
    coverage,
    burn,
    pendingOnboardingCount,
    draftReviewsCount,
    atRiskCount,
  } = props;
  return (
    <div className="space-y-6 lg:col-span-2">
      <HrSectionCard
        title="Payroll pulse"
        description="Latest run and pipeline"
        actions={(
          <Link to={ROUTES.HR.PAYROLL} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Open payroll
          </Link>
        )}
      >
        <PayrollPulse pulse={payRunPulse} />
      </HrSectionCard>

      <HrSectionCard
        title="Cash runway"
        description="Can payroll clear from available cash?"
        actions={(
          <Link to={ROUTES.HR.REPORTS} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Full report
          </Link>
        )}
      >
        <CashRunway loading={affordabilityLoading} isError={affordabilityError} coverage={coverage} burn={burn} />
      </HrSectionCard>

      <HrSectionCard
        title="Talent pulse"
        description="Onboarding, reviews, and performance risk"
        actions={(
          <Link to={ROUTES.HR.TALENT} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Open talent
          </Link>
        )}
      >
        <TalentPulse
          pendingOnboardingCount={pendingOnboardingCount}
          draftReviewsCount={draftReviewsCount}
          atRiskCount={atRiskCount}
        />
      </HrSectionCard>

      <HrSectionCard title="Quick links" description="Jump into an HR area">
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
          <Link
            to={ROUTES.HR.DEPARTMENTS}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-800"
          >
            <Building className="h-4 w-4 shrink-0 text-indigo-500" />
            Departments
          </Link>
        </div>
      </HrSectionCard>
    </div>
  );
}
