import { type ReactNode } from 'react';

interface OverviewCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Consistent card shell for every Inventory Overview block. */
export function OverviewCard({ title, subtitle, action, children, className }: OverviewCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}