import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { ForecastBvaStatus, ForecastCoverageStatus, ForecastZbbStatus } from '../api/forecastingTypes';
import { FORECAST_SURFACE } from './forecastingSurfaceStyles';

const coverageStyles: Record<ForecastCoverageStatus, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  tight: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  unknown: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const bvaStyles: Record<ForecastBvaStatus, string> = {
  over: 'bg-red-50 text-red-700 ring-red-600/20',
  under: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  on_track: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

const zbbStyles: Record<ForecastZbbStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  justified: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export function CoverageStatusBadge({ status }: { status: ForecastCoverageStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        coverageStyles[status],
      )}
    >
      {status}
    </span>
  );
}

export function BvaStatusBadge({ status }: { status: ForecastBvaStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        bvaStyles[status],
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function ZbbStatusBadge({ status }: { status: ForecastZbbStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        zbbStyles[status],
      )}
    >
      {status}
    </span>
  );
}

export function ForecastMetric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(FORECAST_SURFACE.metric, className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1 text-lg font-semibold tabular-nums text-gray-900">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export function AssumptionsWarningsPanel({
  assumptions,
  warnings,
}: {
  assumptions?: string[];
  warnings?: string[];
}) {
  const hasAssumptions = (assumptions?.length ?? 0) > 0;
  const hasWarnings = (warnings?.length ?? 0) > 0;
  if (!hasAssumptions && !hasWarnings) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {hasWarnings ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Warnings
          </div>
          <ul className="space-y-1.5 text-sm text-amber-900/90">
            {warnings!.map((w) => (
              <li key={w} className="leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hasAssumptions ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-900">
            <Info className="h-4 w-4" />
            Assumptions
          </div>
          <ul className="space-y-1.5 text-sm text-sky-900/90">
            {assumptions!.map((a) => (
              <li key={a} className="leading-relaxed">
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
