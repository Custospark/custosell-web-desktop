import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Megaphone,
  MessageSquare,
  RefreshCw,
  User,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface MetaBadgeProps {
  label: string;
  className: string;
  icon: LucideIcon;
}

function MetaBadge({ label, className, icon: Icon }: MetaBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

const AUDIENCE_META = {
  user: {
    label: 'Users',
    className: 'bg-sky-100 text-sky-800 ring-sky-200/60',
    icon: User,
  },
  business: {
    label: 'Businesses',
    className: 'bg-violet-100 text-violet-800 ring-violet-200/60',
    icon: Building2,
  },
} as const;

const TYPE_META = {
  message: {
    label: 'Custom message',
    className: 'bg-indigo-100 text-indigo-800 ring-indigo-200/60',
    icon: MessageSquare,
  },
  status_change: {
    label: 'Status change',
    className: 'bg-amber-100 text-amber-800 ring-amber-200/60',
    icon: ArrowLeftRight,
  },
} as const;

const INTENTION_META: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  announcement: {
    label: 'Announcement',
    className: 'bg-blue-100 text-blue-800 ring-blue-200/60',
    icon: Megaphone,
  },
  warning_notice: {
    label: 'Warning',
    className: 'bg-amber-100 text-amber-800 ring-amber-200/60',
    icon: AlertTriangle,
  },
  payment_reminder: {
    label: 'Payment reminder',
    className: 'bg-orange-100 text-orange-800 ring-orange-200/60',
    icon: CreditCard,
  },
  policy_update: {
    label: 'Policy update',
    className: 'bg-slate-100 text-slate-700 ring-slate-200/60',
    icon: FileText,
  },
  reactivation_nudge: {
    label: 'Re-engagement',
    className: 'bg-emerald-100 text-emerald-800 ring-emerald-200/60',
    icon: RefreshCw,
  },
  account_notice: {
    label: 'Account notice',
    className: 'bg-rose-100 text-rose-800 ring-rose-200/60',
    icon: Bell,
  },
  custom: {
    label: 'Custom',
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: MessageSquare,
  },
};

export function DispatchAudienceBadge({ targetKind }: { targetKind: string }) {
  const meta = AUDIENCE_META[targetKind as keyof typeof AUDIENCE_META] ?? {
    label: targetKind.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: User,
  };
  return <MetaBadge {...meta} />;
}

export function DispatchTypeBadge({ dispatchType }: { dispatchType: string }) {
  const meta = TYPE_META[dispatchType as keyof typeof TYPE_META] ?? {
    label: dispatchType.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: MessageSquare,
  };
  return <MetaBadge {...meta} />;
}

export function DispatchIntentionBadge({ intention }: { intention: string }) {
  const meta = INTENTION_META[intention] ?? {
    label: intention.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700 ring-gray-200/60',
    icon: Bell,
  };
  return <MetaBadge {...meta} />;
}
