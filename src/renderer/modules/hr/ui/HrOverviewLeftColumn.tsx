import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { HrEmptyState, HrSectionCard } from './HrSurface';
import { HrAttendanceStat } from './HrOverviewWidgets';
import { EmployeeStatusBadge, LeaveStatusBadge } from './HrStatusBadges';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { employeeDisplayName, type AttendanceDayStatus, type EmployeeStatus, type HrLeaveRequest } from '../api/hrTypes';
import { Users } from 'lucide-react';

interface HrOverviewLeftColumnProps {
  today: string;
  attendanceCounts: Record<AttendanceDayStatus, number> & { total: number };
  pendingLeave: HrLeaveRequest[];
  peopleCounts: Record<EmployeeStatus, number> & { total: number };
}

function LeaveInbox({ requests }: { requests: HrLeaveRequest[] }) {
  if (requests.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No pending leave requests.</p>;
  }
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {requests.slice(0, 8).map((req) => (
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
  );
}

function PeopleSnapshot({ counts }: { counts: HrOverviewLeftColumnProps['peopleCounts'] }) {
  if (counts.total === 0) {
    return (
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
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {([
        ['active', counts.active],
        ['onboarding', counts.onboarding],
        ['on_leave', counts.onLeave],
        ['terminated', counts.terminated],
      ] as const).map(([status, count]) => (
        <div key={status} className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
          <div className="mb-2">
            <EmployeeStatusBadge status={status} />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{count}</p>
        </div>
      ))}
    </div>
  );
}

export default function HrOverviewLeftColumn({
  today,
  attendanceCounts,
  pendingLeave,
  peopleCounts,
}: HrOverviewLeftColumnProps) {
  return (
    <div className="space-y-6 lg:col-span-3">
      <HrSectionCard
        title="Today's attendance"
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
            <HrAttendanceStat label="Present" count={attendanceCounts.present} status="present" />
            <HrAttendanceStat label="Absent" count={attendanceCounts.absent} status="absent" />
            <HrAttendanceStat label="Leave" count={attendanceCounts.leave} status="leave" />
            <HrAttendanceStat label="Holiday" count={attendanceCounts.holiday} status="holiday" />
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
        <LeaveInbox requests={pendingLeave} />
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
        <PeopleSnapshot counts={peopleCounts} />
      </HrSectionCard>
    </div>
  );
}
