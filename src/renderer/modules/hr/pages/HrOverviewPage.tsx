import { useMemo } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { cn } from '../../../shared/utils/cn';
import {
  type AttendanceDayStatus,
  type EmployeeStatus,
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
import { HrPageHeader } from '../ui/HrSurface';
import { HrKpiCard } from '../ui/HrOverviewWidgets';
import HrOverviewLeftColumn from '../ui/HrOverviewLeftColumn';
import HrOverviewRightColumn, { type PayRunPulse } from '../ui/HrOverviewRightColumn';
import { countByStatus, todayIso } from '../ui/hrOverviewStyles';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  CalendarDays,
  Clock,
  IdCard,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';

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

  const payRunPulse: PayRunPulse = useMemo(() => {
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
        <HrKpiCard
          label="Active people"
          value={String(peopleCounts.active)}
          badge="People"
          icon={Users}
          color="blue"
          hint={`${peopleCounts.total} total · ${departments.length} dept${departments.length === 1 ? '' : 's'}`}
          to={ROUTES.HR.PEOPLE}
        />
        <HrKpiCard
          label="Present today"
          value={String(attendanceCounts.present)}
          badge="Today"
          icon={Clock}
          color="green"
          hint={`${attendanceCounts.absent} absent · ${attendanceCounts.leave} on leave`}
          to={ROUTES.HR.ATTENDANCE}
        />
        <HrKpiCard
          label="Pending leave"
          value={String(pendingLeave.length)}
          badge="Inbox"
          icon={CalendarDays}
          color="amber"
          hint="Awaiting approval"
          to={ROUTES.HR.LEAVE}
        />
        <HrKpiCard
          label="Open pay runs"
          value={String(payRunPulse.draft + payRunPulse.calculated + payRunPulse.approved)}
          badge="Payroll"
          icon={Wallet}
          color="purple"
          hint={`${payRunPulse.posted} posted`}
          to={ROUTES.HR.PAYROLL}
        />
        <HrKpiCard
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
        <HrOverviewLeftColumn
          today={today}
          attendanceCounts={attendanceCounts}
          pendingLeave={pendingLeave}
          peopleCounts={peopleCounts}
        />

        <HrOverviewRightColumn
          payRunPulse={payRunPulse}
          affordabilityLoading={affordabilityQ.isLoading}
          affordabilityError={affordabilityQ.isError}
          coverage={coverage}
          burn={burn}
          pendingOnboardingCount={pendingOnboarding.length}
          draftReviewsCount={draftReviews.length}
          atRiskCount={atRiskCount}
        />
      </div>
    </div>
  );
}
