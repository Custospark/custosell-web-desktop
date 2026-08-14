import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Building,
  CalendarDays,
  ClipboardCheck,
  Clock,
  IdCard,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import {
  employeeDisplayName,
  type AttendanceDayStatus,
  type EmployeeStatus,
  type HrPayrollAffordabilityStatus,
  type PayRunStatus,
} from '../api/hrTypes';
import {
  useHrAttendance,
  useHrDepartments,
  useHrEmployees,
  useHrLeaveRequests,
  useHrOnboardingTasks,
  useHrPayRuns,
  useHrPayrollAffordability,
  useHrPerformanceRoster,
  useHrReviews,
} from '../api/useHrQueries';
import { AttendanceStatusBadge, EmployeeStatusBadge, LeaveStatusBadge, PayRunStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';

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

const runwayStyles: Record<HrPayrollAffordabilityStatus, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  tight: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  unknown: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const quickLinks = [
  { to: ROUTES.HR.PEOPLE, label: 'People', icon: Users },
  { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
  { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
  { to: ROUTES.HR.PAYROLL, label: 'Payroll', icon: Wallet },
  { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
  { to: ROUTES.HR.REPORTS, label: 'Reports', icon: BarChart3 },
] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function countByStatus<T extends string>(items: { status: T }[], status: T) {
  return items.filter((item) => item.status === status).length;
}

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
  icon: typeof Users;
  color: CardColor;
  hint?: string;
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
      <p className="relative mb-0.5 text-3xl font-bold text-gray-900">{value}</p>
      <p className="relative text-sm font-medium text-gray-500">{label}</p>
      {hint ? <p className="relative mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
}

function AttendanceStat({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: AttendanceDayStatus;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <AttendanceStatusBadge status={status} />
      </div>
      <p className="text-2xl font-semibold tabular-nums text-gray-900">{count}</p>
    </div>
  );
}

export default function HrOverviewPage() {
  const today = todayIso();

  const employeesQ = useHrEmployees();
  const departmentsQ = useHrDepartments();
  const attendanceQ = useHrAttendance({ work_date: today });
  const leaveQ = useHrLeaveRequests({ status: 'pending' });
  const payRunsQ = useHrPayRuns();
  const onboardingQ = useHrOnboardingTasks({ status: 'pending' });
  const reviewsQ = useHrReviews({ status: 'draft' });
  const performanceQ = useHrPerformanceRoster();
  const affordabilityQ = useHrPayrollAffordability({ horizon_months: 3 });

  const employees = employeesQ.data ?? [];
  const departments = departmentsQ.data ?? [];
  const attendanceDays = attendanceQ.data?.days ?? [];
  const pendingLeave = leaveQ.data ?? [];
  const payRuns = payRunsQ.data ?? [];
  const pendingOnboarding = onboardingQ.data ?? [];
  const draftReviews = reviewsQ.data ?? [];
  const performanceRows = performanceQ.data ?? [];

  const peopleCounts = useMemo(() => {
    const by = (status: EmployeeStatus) => countByStatus(employees, status);
    return {
      total: employees.length,
      active: by('active'),
      onboarding: by('onboarding'),
      onLeave: by('on_leave'),
      terminated: by('terminated'),
    };
  }, [employees]);

  const attendanceCounts = useMemo(() => {
    const by = (status: AttendanceDayStatus) => countByStatus(attendanceDays, status);
    return {
      present: by('present'),
      absent: by('absent'),
      leave: by('leave'),
      holiday: by('holiday'),
      total: attendanceDays.length,
    };
  }, [attendanceDays]);

  const payRunPulse = useMemo(() => {
    const byStatus = (status: PayRunStatus) => countByStatus(payRuns, status);
    const latest = [...payRuns].sort((a, b) => {
      const aKey = a.period_end || a.created_at || '';
      const bKey = b.period_end || b.created_at || '';
      return bKey.localeCompare(aKey);
    })[0] ?? null;
    return {
      latest,
      draft: byStatus('draft'),
      calculated: byStatus('calculated'),
      approved: byStatus('approved'),
      posted: byStatus('posted'),
    };
  }, [payRuns]);

  const atRiskCount = useMemo(
    () => performanceRows.filter((row) => row.verdict === 'at_risk' || row.verdict === 'behind').length,
    [performanceRows],
  );

  const isLoading =
    employeesQ.isLoading
    || departmentsQ.isLoading
    || attendanceQ.isLoading
    || leaveQ.isLoading
    || payRunsQ.isLoading;

  const refreshAll = () => {
    void employeesQ.refetch();
    void departmentsQ.refetch();
    void attendanceQ.refetch();
    void leaveQ.refetch();
    void payRunsQ.refetch();
    void onboardingQ.refetch();
    void reviewsQ.refetch();
    void performanceQ.refetch();
    void affordabilityQ.refetch();
  };

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  const coverage = affordabilityQ.data?.coverage;
  const burn = affordabilityQ.data?.burn;

  return (
    <div className="space-y-6">
      <HrPageHeader
        icon={LayoutDashboard}
        title="HR dashboard"
        description="People, attendance, leave, payroll, and talent - one overview for full HR access."
        actions={(
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={refreshAll}
            disabled={
              employeesQ.isFetching
              || attendanceQ.isFetching
              || leaveQ.isFetching
              || payRunsQ.isFetching
              || affordabilityQ.isFetching
            }
          >
            <RefreshCw className={cn('h-4 w-4', (employeesQ.isFetching || affordabilityQ.isFetching) && 'animate-spin')} />
            Refresh
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Active people"
          value={String(peopleCounts.active)}
          badge="People"
          icon={Users}
          color="blue"
          hint={`${peopleCounts.total} total · ${departments.length} dept${departments.length === 1 ? '' : 's'}`}
          to={ROUTES.HR.PEOPLE}
        />
        <KpiCard
          label="Present today"
          value={String(attendanceCounts.present)}
          badge="Today"
          icon={Clock}
          color="green"
          hint={`${attendanceCounts.absent} absent · ${attendanceCounts.leave} on leave`}
          to={ROUTES.HR.ATTENDANCE}
        />
        <KpiCard
          label="Pending leave"
          value={String(pendingLeave.length)}
          badge="Inbox"
          icon={CalendarDays}
          color="amber"
          hint="Awaiting approval"
          to={ROUTES.HR.LEAVE}
        />
        <KpiCard
          label="Open pay runs"
          value={String(payRunPulse.draft + payRunPulse.calculated + payRunPulse.approved)}
          badge="Payroll"
          icon={Wallet}
          color="purple"
          hint={`${payRunPulse.posted} posted`}
          to={ROUTES.HR.PAYROLL}
        />
        <KpiCard
          label="Cash runway"
          value={
            coverage?.runway_months == null
              ? '-'
              : `${coverage.runway_months_floor}+ mo`
          }
          badge="Cash"
          icon={IdCard}
          color="indigo"
          hint={coverage ? `Status: ${coverage.status}` : 'Loading affordability…'}
          to={ROUTES.HR.REPORTS}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <HrSectionCard
            title="Today’s attendance"
            description={`Register for ${today}`}
            actions={(
              <Link to={ROUTES.HR.ATTENDANCE} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Open attendance
              </Link>
            )}
          >
            {attendanceCounts.total === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No attendance rows for today yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AttendanceStat label="Present" count={attendanceCounts.present} status="present" />
                <AttendanceStat label="Absent" count={attendanceCounts.absent} status="absent" />
                <AttendanceStat label="Leave" count={attendanceCounts.leave} status="leave" />
                <AttendanceStat label="Holiday" count={attendanceCounts.holiday} status="holiday" />
              </div>
            )}
          </HrSectionCard>

          <HrSectionCard
            title="Leave inbox"
            description="Pending requests that need a decision"
            actions={(
              <Link to={ROUTES.HR.LEAVE} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Manage leave
              </Link>
            )}
          >
            {pendingLeave.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No pending leave requests.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {pendingLeave.slice(0, 8).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {req.employee ? employeeDisplayName(req.employee) : `Employee #${req.employee_id}`}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {req.leave_type?.name ?? 'Leave'} · {formatShiftDateRange(req.start_date, req.end_date)} · {req.days} day{req.days === 1 ? '' : 's'}
                      </p>
                    </div>
                    <LeaveStatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </HrSectionCard>

          <HrSectionCard
            title="People snapshot"
            description="Workforce mix by employment status"
            actions={(
              <Link to={ROUTES.HR.PEOPLE} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View people
              </Link>
            )}
          >
            {peopleCounts.total === 0 ? (
              <HrEmptyState
                icon={<Users className="h-6 w-6" />}
                title="No employees yet"
                description="Add people to unlock attendance, leave, and payroll on this dashboard."
                action={(
                  <Link to={ROUTES.HR.PEOPLE}>
                    <Button size="sm">Go to People</Button>
                  </Link>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  ['active', peopleCounts.active],
                  ['onboarding', peopleCounts.onboarding],
                  ['on_leave', peopleCounts.onLeave],
                  ['terminated', peopleCounts.terminated],
                ] as const).map(([status, count]) => (
                  <div key={status} className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                    <div className="mb-2">
                      <EmployeeStatusBadge status={status} />
                    </div>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </HrSectionCard>
        </div>

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
            {payRunPulse.latest ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {formatShiftDateRange(payRunPulse.latest.period_start, payRunPulse.latest.period_end)}
                    </p>
                    <PayRunStatusBadge status={payRunPulse.latest.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <p>Gross <span className="font-semibold text-gray-900">{formatCurrency(payRunPulse.latest.total_gross ?? 0)}</span></p>
                    <p>Net <span className="font-semibold text-gray-900">{formatCurrency(payRunPulse.latest.total_net ?? 0)}</span></p>
                  </div>
                  <Link
                    to={ROUTES.HR.PAY_RUN(payRunPulse.latest.id)}
                    className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open pay run
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {([
                    ['Draft', payRunPulse.draft],
                    ['Calculated', payRunPulse.calculated],
                    ['Approved', payRunPulse.approved],
                    ['Posted', payRunPulse.posted],
                  ] as const).map(([label, count]) => (
                    <div key={label} className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                      <p className="text-gray-500">{label}</p>
                      <p className="text-base font-semibold tabular-nums text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">No pay runs yet.</p>
            )}
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
            {affordabilityQ.isLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">Loading affordability…</p>
            ) : affordabilityQ.isError || !coverage ? (
              <p className="py-6 text-center text-sm text-gray-500">Could not load cash runway.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
                      runwayStyles[coverage.status],
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
            )}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
                <span className="text-gray-600">Pending onboarding tasks</span>
                <span className="font-semibold tabular-nums text-gray-900">{pendingOnboarding.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
                <span className="text-gray-600">Draft reviews</span>
                <span className="font-semibold tabular-nums text-gray-900">{draftReviews.length}</span>
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
      </div>
    </div>
  );
}
