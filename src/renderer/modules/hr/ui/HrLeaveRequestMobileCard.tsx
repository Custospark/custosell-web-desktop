import type { ReactNode } from 'react';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { employeeDisplayName, type HrLeaveRequest } from '../api/hrTypes';
import { LeaveStatusBadge } from './HrStatusBadges';

interface HrLeaveRequestMobileCardProps {
  request: HrLeaveRequest;
  actions?: ReactNode;
}

/** Card fallback for leave request tables on viewports below `md`. */
export function HrLeaveRequestMobileCard({ request, actions }: HrLeaveRequestMobileCardProps) {
  const employee = request.employee
    ? employeeDisplayName(request.employee)
    : `#${request.employee_id}`;
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{employee}</p>
          <p className="mt-0.5 truncate text-sm text-gray-600">
            {request.leave_type?.name ?? request.leave_type_id}
          </p>
        </div>
        <div className="shrink-0"><LeaveStatusBadge status={request.status} /></div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-gray-100 pt-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Dates</p>
          <p className="text-sm font-medium text-gray-900">
            {formatShiftDateRange(request.start_date, request.end_date)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500">Days</p>
          <p className={cn('text-sm font-medium', request.days > 0 ? 'text-gray-900' : 'text-gray-400')}>
            {request.days}
          </p>
        </div>
      </div>

      {actions ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
