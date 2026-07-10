import { cn } from '../../../shared/utils/cn';
import type {
  EmployeeStatus,
  LeaveRequestStatus,
  OnboardingTaskStatus,
  PayRunStatus,
  ReviewStatus,
  AttendanceDayStatus,
} from '../api/hrTypes';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

const employeeStatusStyles: Record<EmployeeStatus, string> = {
  onboarding: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  on_leave: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  terminated: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const leaveStatusStyles: Record<LeaveRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const payRunStatusStyles: Record<PayRunStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  calculated: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  approved: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  posted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  void: 'bg-red-50 text-red-700 ring-red-600/20',
};

const attendanceStatusStyles: Record<AttendanceDayStatus, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  absent: 'bg-red-50 text-red-700 ring-red-600/20',
  leave: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  holiday: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const taskStatusStyles: Record<OnboardingTaskStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  skipped: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const reviewStatusStyles: Record<ReviewStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <span className={cn(base, employeeStatusStyles[status])}>{labelize(status)}</span>;
}

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <span className={cn(base, leaveStatusStyles[status])}>{labelize(status)}</span>;
}

export function PayRunStatusBadge({ status }: { status: PayRunStatus }) {
  return <span className={cn(base, payRunStatusStyles[status])}>{labelize(status)}</span>;
}

export function AttendanceStatusBadge({ status }: { status: AttendanceDayStatus }) {
  return <span className={cn(base, attendanceStatusStyles[status])}>{labelize(status)}</span>;
}

export function OnboardingTaskStatusBadge({ status }: { status: OnboardingTaskStatus }) {
  return <span className={cn(base, taskStatusStyles[status])}>{labelize(status)}</span>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={cn(base, reviewStatusStyles[status])}>{labelize(status)}</span>;
}
