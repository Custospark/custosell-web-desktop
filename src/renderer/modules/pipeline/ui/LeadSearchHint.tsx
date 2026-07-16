import { cn } from '../../../shared/utils/cn';

const TOKEN_CLASS = {
  muted: 'text-gray-500',
  label: 'font-semibold text-violet-600 hover:text-violet-800',
  priority: 'font-semibold text-amber-600 hover:text-amber-800',
  overdue: 'font-semibold text-red-600 hover:text-red-800',
  today: 'font-semibold text-blue-600 hover:text-blue-800',
  date: 'font-semibold text-indigo-600 hover:text-indigo-800',
  me: 'font-semibold text-emerald-600 hover:text-emerald-800',
} as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface LeadSearchHintProps {
  className?: string;
  onApplyToken?: (token: string) => void;
}

function HintToken({
  token,
  className,
  onApply,
  label,
}: {
  token: string;
  className: string;
  onApply?: (token: string) => void;
  label: string;
}) {
  if (!onApply) {
    return <span className={className}>{token}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onApply(token)}
      className={cn(
        className,
        'rounded px-0.5 transition-colors hover:bg-gray-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30',
      )}
      title={`Filter by ${label}`}
    >
      {token}
    </button>
  );
}

export default function LeadSearchHint({ className, onApplyToken }: LeadSearchHintProps) {
  const dateExample = todayIsoDate();

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1 gap-y-0.5', className)}>
      <span className={TOKEN_CLASS.muted}>Type to search, or click a filter:</span>
      <HintToken token="@label" className={TOKEN_CLASS.label} onApply={onApplyToken} label="label name" />
      <span className={TOKEN_CLASS.muted}>,</span>
      <HintToken token="!high" className={TOKEN_CLASS.priority} onApply={onApplyToken} label="priority" />
      <span className={TOKEN_CLASS.muted}>,</span>
      <HintToken token="#overdue" className={TOKEN_CLASS.overdue} onApply={onApplyToken} label="overdue" />
      <span className={TOKEN_CLASS.muted}>,</span>
      <HintToken token="@me" className={TOKEN_CLASS.me} onApply={onApplyToken} label="assigned to me" />
      <span className={TOKEN_CLASS.muted}>,</span>
      <HintToken token="@me #today" className={TOKEN_CLASS.me} onApply={onApplyToken} label="my tasks due today" />
      <span className={TOKEN_CLASS.muted}>·</span>
      <HintToken token="#today" className={TOKEN_CLASS.today} onApply={onApplyToken} label="due today" />
      <span className={TOKEN_CLASS.muted}>·</span>
      <HintToken token={`#${dateExample}`} className={TOKEN_CLASS.date} onApply={onApplyToken} label="due date" />
    </span>
  );
}
