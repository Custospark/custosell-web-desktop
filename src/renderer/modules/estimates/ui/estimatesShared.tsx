import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { cn } from '../../../shared/utils/cn';
import { ArrowLeft } from 'lucide-react';

export { PipelineFormSection, PipelineIconField, PipelineModalHero, pipelineSelectClass, pipelineInputClass, pipelineLabelClass } from '../../pipeline/ui/pipelineFormFields';

export const ESTIMATE_STATUS_CHART_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  expired: '#f59e0b',
  converted: '#8b5cf6',
};

interface EstimatePageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconTone?: 'indigo' | 'blue' | 'emerald' | 'violet' | 'amber';
  action?: ReactNode;
}

const headerIconTones = {
  indigo: 'bg-indigo-50 text-indigo-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
};

export function EstimatePageHeader({
  title,
  description,
  icon: Icon,
  iconTone = 'indigo',
  action,
}: EstimatePageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn('shrink-0 rounded-xl p-2.5 shadow-sm', headerIconTones[iconTone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

interface EstimateCompactStatProps {
  label: string;
  value: string | number;
  hint?: string;
  valueClassName?: string;
}

export function EstimateCompactStat({ label, value, hint, valueClassName }: EstimateCompactStatProps) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', valueClassName ?? 'text-gray-900')}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </Card>
  );
}

interface EstimateBreakdownBarProps {
  label: string;
  count: number;
  totalLabel?: string;
  percent: number;
  color?: string;
}

export function EstimateBreakdownBar({
  label,
  count,
  totalLabel,
  percent,
  color = '#3b82f6',
}: EstimateBreakdownBarProps) {
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium capitalize text-gray-700">{label}</span>
        <span className="shrink-0 tabular-nums text-gray-600">
          {count}
          {totalLabel ? ` · ${totalLabel}` : ''}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
        />
      </div>
    </li>
  );
}

interface EstimateIconActionProps {
  title: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function EstimateIconAction({
  title,
  onClick,
  loading,
  disabled,
  children,
  className,
}: EstimateIconActionProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors',
        'hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : children}
    </button>
  );
}

export function EstimateBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

interface BudgetProgressProps {
  label: string;
  actual: number;
  budget: number;
  formatValue: (n: number) => string;
  overIsBad?: boolean;
}

export function BudgetProgressBar({
  label,
  actual,
  budget,
  formatValue,
  overIsBad = true,
}: BudgetProgressProps) {
  const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
  const over = budget > 0 && actual > budget;
  const barColor = over && overIsBad ? 'bg-red-500' : pct >= 85 && overIsBad ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={cn('tabular-nums', over && overIsBad ? 'font-semibold text-red-600' : 'text-gray-600')}>
          {formatValue(actual)}
          {budget > 0 && <span className="text-gray-400"> / {formatValue(budget)}</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
