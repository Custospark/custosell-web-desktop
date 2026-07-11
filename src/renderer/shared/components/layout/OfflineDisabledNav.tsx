import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface OfflineDisabledNavProps {
  title: string;
  className?: string;
  children: ReactNode;
}

/** Non-navigating control: not-allowed cursor + native hover title. */
export function OfflineDisabledNav({ title, className, children }: OfflineDisabledNavProps) {
  return (
    <span
      role="link"
      aria-disabled="true"
      title={title}
      className={cn(
        'flex cursor-not-allowed items-center opacity-50',
        className,
      )}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </span>
  );
}
