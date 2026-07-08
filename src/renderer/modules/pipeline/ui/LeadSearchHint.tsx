import { cn } from '../../../shared/utils/cn';

/** Board search token colors — matches card label, priority, and due-date semantics */
export const SEARCH_TOKEN_CLASS = {
  muted: 'text-gray-500',
  label: 'font-semibold text-violet-600',
  priority: 'font-semibold text-amber-600',
  overdue: 'font-semibold text-red-600',
  today: 'font-semibold text-blue-600',
  date: 'font-semibold text-indigo-600',
} as const;

interface LeadSearchHintProps {
  className?: string;
}

export default function LeadSearchHint({ className }: LeadSearchHintProps) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1 gap-y-0.5', className)}>
      <span className={SEARCH_TOKEN_CLASS.muted}>Try</span>
      <span className={SEARCH_TOKEN_CLASS.label}>@label</span>
      <span className={SEARCH_TOKEN_CLASS.muted}>,</span>
      <span className={SEARCH_TOKEN_CLASS.priority}>!priority</span>
      <span className={SEARCH_TOKEN_CLASS.muted}>, or</span>
      <span className={SEARCH_TOKEN_CLASS.overdue}>#overdue</span>
      <span className={SEARCH_TOKEN_CLASS.muted}>·</span>
      <span className={SEARCH_TOKEN_CLASS.today}>#today</span>
      <span className={SEARCH_TOKEN_CLASS.muted}>·</span>
      <span className={SEARCH_TOKEN_CLASS.date}>#2026-07-08</span>
    </span>
  );
}
