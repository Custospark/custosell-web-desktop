import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressSummary } from '../api/boardProgressTypes';
import {
  METRIC_LABELS,
  PACE_STATUS_LABELS,
  PLANNING_LEVEL_OPTIONS,
  targetDisplayStats,
  formatAchievementRatio,
  TARGET_TYPE_LABELS,
  resolveProgressContext,
} from '../api/pipelineProgressTerms';
import { PROGRESS_SURFACE } from './progressSurface';
import { paceBadgeClass, formatMetricValue } from './boardProgressUiHelpers';

export function TargetCard({
  target,
  ctx,
  canManage,
  onEdit,
  onArchive,
}: {
  target: BoardProgressSummary['targets'][number];
  ctx: ReturnType<typeof resolveProgressContext>;
  canManage?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
}) {
  const metricLabel = METRIC_LABELS[target.metric_key]?.(ctx) ?? target.metric_key;
  const stats = targetDisplayStats(target);

  return (
    <div className="rounded-xl border border-white/55 bg-white/85 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              {TARGET_TYPE_LABELS[target.type] ?? target.type}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', paceBadgeClass(stats.pace_status))}>
              {PACE_STATUS_LABELS[stats.pace_status] ?? stats.pace_status}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">{target.title}</h3>
          {target.description && <p className="mt-1 text-xs text-gray-600">{target.description}</p>}
          <p className="mt-2 text-xs text-gray-500">
            {metricLabel}
            {target.scope === 'member' && target.member ? ` · ${target.member.name}` : ' · Team'}
            {target.planning_level ? ` · ${PLANNING_LEVEL_OPTIONS.find((o) => o.value === target.planning_level)?.label ?? target.planning_level}` : ''}
            {stats.sliceLabel ? ` · ${stats.sliceLabel}` : ''}
            {!stats.sliceLabel && target.allocations && target.allocations.length > 0 ? ` · ${target.allocations.length} sub-periods` : ''}
          </p>
          {target.scope === 'member' && target.member ? (
            <div className="mt-1">
              <UserIdentityChip name={target.member.name} avatar={target.member.avatar} size="xs" />
            </div>
          ) : null}
        </div>
        <div className="text-right">
          {canManage && target.type !== 'key_result' && (
            <div className="mb-2 flex justify-end gap-1">
              <button
                type="button"
                onClick={onEdit}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600"
                title="Edit target"
                aria-label="Edit target"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onArchive}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                title="Archive target"
                aria-label="Archive target"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatAchievementRatio(stats.actual, stats.expected, (value) =>
              formatMetricValue(value, target.unit, ctx.currency),
            )}
          </p>
          <p className="text-xs text-gray-500">
            {stats.sliceLabel ? `${stats.sliceLabel} · ` : ''}
            {stats.progress_percent}% of period goal
          </p>
          {stats.overallGoal != null && stats.overallGoal !== stats.expected ? (
            <p className="mt-1 text-[10px] text-gray-400">
              Overall goal: {formatMetricValue(stats.overallGoal, target.unit, ctx.currency)}
            </p>
          ) : null}
          {stats.expectedToDate != null && stats.expectedToDate !== stats.expected ? (
            <p className="mt-0.5 text-[10px] text-gray-400">
              Expected by now: {formatMetricValue(stats.expectedToDate, target.unit, ctx.currency)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium tabular-nums text-gray-700">
            {formatAchievementRatio(stats.actual, stats.expected, (value) =>
              formatMetricValue(value, target.unit, ctx.currency),
            )}
          </span>
          <span className="font-semibold text-gray-900">{stats.progress_percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${Math.min(100, stats.progress_percent)}%` }}
          />
        </div>
      </div>
      {target.key_results.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
          {target.key_results.map((kr) => {
            const krStats = targetDisplayStats(kr);
            return (
              <div key={kr.id} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-700">{kr.title}</span>
                  <span className="tabular-nums text-gray-700">
                    {formatAchievementRatio(krStats.actual, krStats.expected, (value) =>
                      formatMetricValue(value, kr.unit, ctx.currency),
                    )}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-all"
                    style={{ width: `${Math.min(100, krStats.progress_percent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  {krStats.sliceLabel ? `${krStats.sliceLabel} · ` : ''}
                  {krStats.progress_percent}% of period goal
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className={cn(
      'flex h-72 items-center justify-center rounded-xl border border-dashed border-white/50 text-sm backdrop-blur-sm',
      PROGRESS_SURFACE.textMuted,
      'bg-white/65',
    )}
    >
      {message}
    </div>
  );
}

export function ProgressPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  glassy = false,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  glassy?: boolean;
}) {
  return (
    <section className={glassy ? PROGRESS_SURFACE.chartPanel : PROGRESS_SURFACE.panel}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {Icon && <Icon className="mt-0.5 h-4 w-4 text-violet-600" />}
          <div>
            <h3 className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>{title}</h3>
            {subtitle && <p className={cn('mt-0.5 text-xs', PROGRESS_SURFACE.textMuted)}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
