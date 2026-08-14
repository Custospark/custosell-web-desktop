import { Link } from 'react-router-dom';
import { cn } from '../../../shared/utils/cn';
import { AttendanceStatusBadge } from './HrStatusBadges';
import { cardStyles, type CardColor } from './hrOverviewStyles';
import type { AttendanceDayStatus } from '../api/hrTypes';
import type { LucideIcon } from 'lucide-react';

export function HrKpiCard({
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
  icon: LucideIcon;
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

export function HrAttendanceStat({
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
