import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import type { BusinessAccountStatus, UserAccountStatus } from '../api/PlatformTypes';
import { STATUS_LABELS } from '../api/platformBusinessValidation';
import { USER_STATUS_LABELS } from '../api/platformUserValidation';
import { cn } from '../../../shared/utils/cn';

export type PlatformAccountStatus = UserAccountStatus | BusinessAccountStatus;

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

const ACCOUNT_STATUS_META: Record<PlatformAccountStatus, StatusMeta> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 ring-emerald-200/60',
    icon: CheckCircle2,
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-100 text-amber-800 ring-amber-200/60',
    icon: AlertTriangle,
  },
  notified: {
    label: 'Notified',
    className: 'bg-sky-100 text-sky-800 ring-sky-200/60',
    icon: Bell,
  },
  restricted: {
    label: 'Restricted',
    className: 'bg-orange-100 text-orange-800 ring-orange-200/60',
    icon: ShieldAlert,
  },
  deactivated: {
    label: 'Deactivated',
    className: 'bg-rose-100 text-rose-800 ring-rose-200/60',
    icon: UserX,
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-rose-100 text-rose-800 ring-rose-200/60',
    icon: Ban,
  },
};

function resolveStatusMeta(status: PlatformAccountStatus | string): StatusMeta {
  if (status in ACCOUNT_STATUS_META) {
    return ACCOUNT_STATUS_META[status as PlatformAccountStatus];
  }

  const userLabel = USER_STATUS_LABELS[status as UserAccountStatus];
  const businessLabel = STATUS_LABELS[status as BusinessAccountStatus];
  return {
    label: userLabel ?? businessLabel ?? status.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: AlertTriangle,
  };
}

interface PlatformAccountStatusBadgeProps {
  status: PlatformAccountStatus | string;
  className?: string;
}

export function PlatformAccountStatusBadge({ status, className }: PlatformAccountStatusBadgeProps) {
  const meta = resolveStatusMeta(status);
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
