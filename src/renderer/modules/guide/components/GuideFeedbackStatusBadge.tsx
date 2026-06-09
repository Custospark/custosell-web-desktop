import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
} from 'lucide-react';
import type { GuideFeedbackStatus } from '../api/GuideTypes';
import { cn } from '../../../shared/utils/cn';

export const GUIDE_FEEDBACK_STATUS_LABELS: Record<GuideFeedbackStatus, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

export const GUIDE_FEEDBACK_STATUS_META: Record<GuideFeedbackStatus, StatusMeta> = {
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-800',
    icon: CircleDot,
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-indigo-100 text-indigo-800',
    icon: Eye,
  },
  in_progress: {
    label: 'In progress',
    className: 'bg-amber-100 text-amber-800',
    icon: Clock3,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600',
    icon: Archive,
  },
};

function resolveStatusMeta(status: GuideFeedbackStatus | string): StatusMeta {
  if (status in GUIDE_FEEDBACK_STATUS_META) {
    return GUIDE_FEEDBACK_STATUS_META[status as GuideFeedbackStatus];
  }
  return {
    label: status.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-800',
    icon: CircleDot,
  };
}

interface GuideFeedbackStatusBadgeProps {
  status: GuideFeedbackStatus | string;
  className?: string;
}

export function GuideFeedbackStatusBadge({ status, className }: GuideFeedbackStatusBadgeProps) {
  const meta = resolveStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
