import type { MyProgressSummary } from '../api/boardProgressTypes';
import { METRIC_LABELS, resolveProgressContext, targetDisplayStats } from '../api/pipelineProgressTerms';
import { Target, TrendingUp, User } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { PROGRESS_SURFACE } from './progressSurface';

interface BoardMyProgressTabProps {
  data?: MyProgressSummary;
  boardId?: number;
}

function paceClass(status: string): string {
  switch (status) {
    case 'achieved':
      return 'bg-emerald-100 text-emerald-800';
    case 'on_track':
      return 'bg-blue-100 text-blue-800';
    case 'at_risk':
      return 'bg-amber-100 text-amber-800';
    case 'behind':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function BoardMyProgressTab({ data }: BoardMyProgressTabProps) {
  if (!data) {
    return (
      <div className={cn(PROGRESS_SURFACE.panel, 'text-sm', PROGRESS_SURFACE.textMuted)}>
        Your personal progress will appear here once data is available.
      </div>
    );
  }

  const ctx = resolveProgressContext(undefined, data.context);
  const metrics = data.metrics ?? {};
  const myWon = metrics.cards_won ?? 0;
  const teamAvg = data.team_average?.cards_won ?? 0;

  const intro = ctx.is_project_board
    ? 'Your task contribution toward project targets in the selected period.'
    : ctx.is_pipeline_board
      ? 'Your lead contribution toward pipeline targets in the selected period.'
      : 'Your contribution toward board targets in the selected period.';

  return (
    <div className="space-y-5">
      <div className={cn(PROGRESS_SURFACE.panel, 'border-blue-300/40 bg-blue-50/85')}>
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <h3 className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>My progress</h3>
            <p className={cn('mt-1 text-xs', PROGRESS_SURFACE.textMuted)}>{intro}</p>
          </div>
        </div>
      </div>

      {(data.pace_alerts ?? []).length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/90 p-3 shadow-sm backdrop-blur-md">
          <p className="text-xs font-semibold text-amber-900">Pace alerts</p>
          <ul className="mt-2 space-y-1">
            {data.pace_alerts.map((alert) => (
              <li key={alert.target_id} className="text-xs text-amber-800">
                {alert.title} — {alert.pace_status.replace('_', ' ')} ({alert.progress_percent}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={PROGRESS_SURFACE.metricCard}>
          <p className={cn('text-xs', PROGRESS_SURFACE.textMuted)}>{METRIC_LABELS.cards_won?.(ctx)}</p>
          <p className={cn('mt-1 text-2xl font-bold', PROGRESS_SURFACE.textTitle)}>{myWon}</p>
        </div>
        <div className={PROGRESS_SURFACE.metricCard}>
          <p className={cn('text-xs', PROGRESS_SURFACE.textMuted)}>Team average</p>
          <p className={cn('mt-1 text-2xl font-bold', PROGRESS_SURFACE.textTitle)}>{teamAvg}</p>
        </div>
        <div className={PROGRESS_SURFACE.metricCard}>
          <p className={cn('text-xs', PROGRESS_SURFACE.textMuted)}>Open {ctx.item_plural}</p>
          <p className={cn('mt-1 text-2xl font-bold', PROGRESS_SURFACE.textTitle)}>{metrics.cards_open ?? 0}</p>
        </div>
      </div>

      <div className={PROGRESS_SURFACE.panel}>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-600" />
          <h4 className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>My targets</h4>
        </div>
        {data.targets.length === 0 ? (
          <p className={cn('text-sm', PROGRESS_SURFACE.textMuted)}>
            No member-scoped targets assigned to you for this period.
          </p>
        ) : (
          <div className="space-y-2">
            {data.targets.map((target) => {
              const stats = targetDisplayStats(target);
              return (
              <div key={target.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 backdrop-blur-sm">
                <div>
                  <p className={cn('text-sm font-medium', PROGRESS_SURFACE.textTitle)}>{target.title}</p>
                  <p className={cn('text-xs', PROGRESS_SURFACE.textMuted)}>
                    {stats.actual} / {stats.expected}
                    {stats.sliceLabel ? ` · ${stats.sliceLabel}` : ''}
                  </p>
                  {stats.overallGoal != null && stats.overallGoal !== stats.expected ? (
                    <p className={cn('text-[10px]', PROGRESS_SURFACE.textMuted)}>
                      Overall goal: {stats.overallGoal}
                    </p>
                  ) : null}
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', paceClass(stats.pace_status))}>
                  {stats.pace_status.replace('_', ' ')}
                </span>
              </div>
            );})}
          </div>
        )}
      </div>

      {(data.column_metrics ?? []).length > 0 && (
        <div className={PROGRESS_SURFACE.panel}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <h4 className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>My column activity</h4>
          </div>
          <div className="space-y-2">
            {data.column_metrics.map((row) => (
              <div key={row.stage_id} className={cn('flex items-center justify-between text-sm', PROGRESS_SURFACE.textBody)}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: row.color ?? '#8b5cf6' }} />
                  {row.stage_name}
                </span>
                <span className={PROGRESS_SURFACE.textMuted}>Throughput: {row.metrics.throughput ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
