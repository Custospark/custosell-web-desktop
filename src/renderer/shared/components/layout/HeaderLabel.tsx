import { cn } from '../../utils/cn';
import { useHeaderCompact } from './useHeaderCompact';

/** Header text label - visible at xl only, never in compact mode. */
export function HeaderLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (useHeaderCompact()) return null;
  return <span className={cn('hidden truncate xl:inline', className)}>{children}</span>;
}
