import { cn } from '../../utils/cn';

interface EmailSentCountBadgeProps {
  count: number;
  className?: string;
}

/** Badge showing how many times a document was emailed (mirrors payment count styling). */
export function EmailSentCountBadge({ count, className }: EmailSentCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'absolute -top-2 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full',
        'bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center',
        className,
      )}
    >
      {count}
    </span>
  );
}

export function emailSentLabel(count: number): string {
  if (count <= 0) return 'Email to customer';
  return count === 1 ? 'Emailed once — send again' : `Emailed ${count} times — send again`;
}
