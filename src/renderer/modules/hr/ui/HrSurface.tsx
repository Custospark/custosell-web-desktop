import type { ReactNode } from 'react';
import { cn } from '../../../shared/utils/cn';
import { HR_SURFACE } from './hrSurfaceStyles';

interface HrPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function HrPageHeader({ title, description, actions, className }: HrPageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface HrEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function HrEmptyState({ icon, title, description, action, className }: HrEmptyStateProps) {
  return (
    <div
      className={cn(
        HR_SURFACE.panel,
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">{icon}</div> : null}
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

interface HrSectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function HrSectionCard({ title, description, actions, children, className }: HrSectionCardProps) {
  return (
    <section className={cn(HR_SURFACE.panel, 'p-4 sm:p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-gray-900">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
