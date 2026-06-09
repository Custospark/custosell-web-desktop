import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Ban,
  CircleOff,
  Clock3,
  LogIn,
  TrendingDown,
} from 'lucide-react';
import type { ActivityStatus, UserLoginActivity } from '../api/PlatformTypes';
import { ACTIVITY_STATUS_LABELS } from '../api/platformBusinessValidation';
import { LOGIN_ACTIVITY_LABELS } from '../api/platformUserValidation';
import { cn } from '../../../shared/utils/cn';

export type PlatformActivityStatus = UserLoginActivity | ActivityStatus;

interface ActivityMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

const ACTIVITY_STATUS_META: Record<PlatformActivityStatus, ActivityMeta> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 ring-emerald-200/60',
    icon: Activity,
  },
  dormant: {
    label: 'Dormant',
    className: 'bg-amber-100 text-amber-800 ring-amber-200/60',
    icon: Clock3,
  },
  churned: {
    label: 'Churned',
    className: 'bg-rose-100 text-rose-800 ring-rose-200/60',
    icon: TrendingDown,
  },
  never_logged_in: {
    label: 'Never logged in',
    className: 'bg-slate-100 text-slate-700 ring-slate-200/60',
    icon: LogIn,
  },
  never_used: {
    label: 'Never used',
    className: 'bg-slate-100 text-slate-700 ring-slate-200/60',
    icon: CircleOff,
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-violet-100 text-violet-800 ring-violet-200/60',
    icon: Ban,
  },
};

function resolveActivityMeta(status: PlatformActivityStatus | string): ActivityMeta {
  if (status in ACTIVITY_STATUS_META) {
    return ACTIVITY_STATUS_META[status as PlatformActivityStatus];
  }

  const loginLabel = LOGIN_ACTIVITY_LABELS[status as UserLoginActivity];
  const businessLabel = ACTIVITY_STATUS_LABELS[status as ActivityStatus];
  return {
    label: loginLabel ?? businessLabel ?? status.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: Activity,
  };
}

interface PlatformActivityStatusBadgeProps {
  status: PlatformActivityStatus | string;
  className?: string;
}

export function PlatformActivityStatusBadge({ status, className }: PlatformActivityStatusBadgeProps) {
  const meta = resolveActivityMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
