import { type ReactNode } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export function ProfileSectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof User;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('rounded-xl border-2 border-gray-200 bg-white shadow-sm', className)}>
      <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </article>
  );
}
