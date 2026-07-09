import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressStage, BoardProgressSummary, BoardTarget } from '../api/boardProgressTypes';
import type { PipelineBoard } from '../api/pipelineTypes';
import {
  METRIC_LABELS,
  PACE_STATUS_LABELS,
  PROGRESS_PERIOD_OPTIONS,
  PLANNING_LEVEL_OPTIONS,
  progressBoardSubtitle,
  progressBoardTitle,
  resolveProgressContext,
  TARGET_TYPE_LABELS,
  type ProgressPeriod,
} from '../api/pipelineProgressTerms';
import {
  useExportBoardProgress,
  useArchiveBoardTarget,
  useMyBoardProgressDisplay,
} from '../api/useBoardProgressQueries';
import BoardTargetFormDrawer from './BoardTargetFormDrawer';
import ProgressColumnSelector from './ProgressColumnSelector';
import BoardMyProgressTab from './BoardMyProgressTab';
import ProgressChartBuilder from './ProgressChartBuilder';
import ProgressWalkthrough from './ProgressWalkthrough';
import {
  PROGRESS_SURFACE,
  progressAddTargetLabel,
  progressMyTabLabel,
  progressTargetsEmptyHint,
  progressTargetsSectionTitle,
  progressTeamTabLabel,
} from './progressSurface';
import { Download, Plus, Target, TrendingUp, Users, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface BoardProgressViewProps {
  boardId: number;
  board?: Pick<PipelineBoard, 'project_id' | 'workspace'> | null;
  canManageTargets?: boolean;
  summary?: BoardProgressSummary;
  period: ProgressPeriod;
  onPeriodChange: (period: ProgressPeriod) => void;
  customFrom?: string;
  customTo?: string;
  onCustomRangeChange?: (from: string, to: string) => void;
  stages?: BoardProgressStage[];
  selectedStageIds: number[];
  onSelectedStageIdsChange: (ids: number[]) => void;
}

type ProgressTab = 'team' | 'my';

function paceBadgeClass(status: string): string {
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

export default function BoardProgressView({
  boardId,
  board,
  canManageTargets = false,
  summary,
  period,
  onPeriodChange,
  customFrom = '',
  customTo = '',
  onCustomRangeChange,
  stages = [],
  selectedStageIds,
  onSelectedStageIdsChange,
}: BoardProgressViewProps) {
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<BoardTarget | null>(null);
  const [progressTab, setProgressTab] = useState<ProgressTab>('team');
  const [funnelMode, setFunnelMode] = useState<'count' | 'value'>('count');
  const exportProgress = useExportBoardProgress(boardId);
  const archiveTarget = useArchiveBoardTarget(boardId);
  const displaySummary = summary;

  const { displayData: myProgress } = useMyBoardProgressDisplay(boardId, period, {
    enabled: progressTab === 'my',
    poll: progressTab === 'my',
  });

  const ctx = useMemo(
    () => resolveProgressContext(board, displaySummary?.context),
    [board, displaySummary?.context],
  );

  const canAddTarget = canManageTargets || Boolean(displaySummary?.can_manage_targets);

  const openTargetDrawer = () => {
    setEditingTarget(null);
    setTargetDrawerOpen(true);
  };

  const trendData = useMemo(
    () => (displaySummary?.trends ?? []).map((point) => {
      const expected = displaySummary?.expected_trends?.find((e) => e.date === point.date)?.expected ?? 0;
      return {
        ...point,
        expected,
        label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    }),
    [displaySummary?.trends, displaySummary?.expected_trends],
  );

  const funnelData = useMemo(() => {
    const raw = displaySummary?.funnel ?? [];
    return raw
      .filter((s) => selectedStageIds.length === 0 || selectedStageIds.includes(s.stage_id))
      .map((s) => ({
        ...s,
        fill: s.color ?? '#8b5cf6',
        display: funnelMode === 'value' ? s.open_value : s.count,
      }));
  }, [displaySummary?.funnel, selectedStageIds, funnelMode]);

  const columnMetrics = useMemo(
    () => (displaySummary?.column_metrics ?? []).filter((r) => selectedStageIds.includes(r.stage_id)),
    [displaySummary?.column_metrics, selectedStageIds],
  );
  const members = displaySummary?.members ?? [];
  const targets = displaySummary?.targets ?? [];

  const headlineMetrics = useMemo(() => {
    const team = displaySummary?.team ?? {};
    const keys = ['cards_created', 'cards_won', 'cards_lost', 'cards_open', 'win_rate', 'pipeline_value_won'] as const;
    return keys.map((key) => ({
      key,
      label: METRIC_LABELS[key]?.(ctx) ?? key,
      value: team[key] ?? 0,
      isCurrency: key === 'pipeline_value_won',
      isPercent: key === 'win_rate',
    }));
  }, [ctx, displaySummary?.team]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-3 pb-8 sm:p-4">
      <div className={PROGRESS_SURFACE.hero}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 shrink-0 text-violet-600" />
              <h2 className={cn('text-xl font-bold', PROGRESS_SURFACE.textTitle)}>{progressBoardTitle(ctx)}</h2>
            </div>
            <p className={cn('mt-1 max-w-2xl text-sm', PROGRESS_SURFACE.textBody)}>{progressBoardSubtitle(ctx)}</p>
            {displaySummary?.period && (
              <p className={cn('mt-1 text-xs', PROGRESS_SURFACE.textMuted)}>
                {displaySummary.period.start} — {displaySummary.period.end}
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {canAddTarget && (
                <Button
                  size="sm"
                  onClick={openTargetDrawer}
                  className="inline-flex shrink-0 items-center gap-2 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  {progressAddTargetLabel(ctx)}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportProgress.mutate({
                  period,
                  from: period === 'custom' ? customFrom : undefined,
                  to: period === 'custom' ? customTo : undefined,
                  stageIds: selectedStageIds,
                })}
                loading={exportProgress.isPending}
                className="inline-flex items-center gap-2 border-white/60 bg-white/80 backdrop-blur-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            <div className={PROGRESS_SURFACE.chipGroup}>
              {PROGRESS_PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPeriodChange(option.value)}
                  className={cn(
                    PROGRESS_SURFACE.chip,
                    period === option.value && PROGRESS_SURFACE.chipActive,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t border-white/40 pt-4">
          <div className={PROGRESS_SURFACE.chipGroup}>
            <button
              type="button"
              onClick={() => setProgressTab('team')}
              className={cn(PROGRESS_SURFACE.chip, progressTab === 'team' && PROGRESS_SURFACE.chipActive)}
            >
              {progressTeamTabLabel(ctx)}
            </button>
            <button
              type="button"
              onClick={() => setProgressTab('my')}
              className={cn(PROGRESS_SURFACE.chip, progressTab === 'my' && PROGRESS_SURFACE.chipActive)}
            >
              {progressMyTabLabel(ctx)}
            </button>
          </div>

          {period === 'custom' && onCustomRangeChange && (
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomRangeChange(e.target.value, customTo)}
                className={PROGRESS_SURFACE.input}
                aria-label="From date"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomRangeChange(customFrom, e.target.value)}
                className={PROGRESS_SURFACE.input}
                aria-label="To date"
              />
            </div>
          )}

          <ProgressColumnSelector
            embedded
            stages={stages.length > 0 ? stages : displaySummary?.stages ?? []}
            selectedIds={selectedStageIds}
            onChange={onSelectedStageIdsChange}
            context={ctx}
          />
        </div>
      </div>

      {progressTab === 'my' ? (
        <BoardMyProgressTab data={myProgress} />
      ) : (
      <>
      <ProgressWalkthrough boardId={boardId} />

      {(displaySummary?.pace_alerts ?? []).length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/90 p-3 shadow-sm backdrop-blur-md">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Targets need attention</p>
            <ul className="mt-1 space-y-0.5">
              {displaySummary?.pace_alerts?.map((alert) => (
                <li key={alert.target_id} className="text-xs text-amber-800">{alert.title} — {PACE_STATUS_LABELS[alert.pace_status]} ({alert.progress_percent}%)</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ProgressChartBuilder
        boardId={boardId}
        context={ctx}
        stages={stages.length > 0 ? stages : displaySummary?.stages ?? []}
        selectedStageIds={selectedStageIds}
        canManage={canAddTarget}
      />

      {(displaySummary?.capacity_recommendations ?? []).length > 0 && (
        <div className={cn(PROGRESS_SURFACE.panel, 'border-blue-300/40 bg-blue-50/85')}>
          <p className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>Capacity recommendations</p>
          <ul className="mt-2 space-y-2">
            {displaySummary?.capacity_recommendations?.map((rec) => (
              <li key={rec.stage_id} className={cn('text-xs', PROGRESS_SURFACE.textBody)}>
                <span className="font-medium">{rec.stage_name}</span> — {rec.message}
                {rec.suggested_weekly_capacity > 0 && (
                  <span className="text-blue-700"> · ~{rec.suggested_weekly_capacity}/week sustainable</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {headlineMetrics.map((metric) => (
          <div key={metric.key} className={PROGRESS_SURFACE.metricCard}>
            <p className={cn('text-xs font-medium', PROGRESS_SURFACE.textMuted)}>{metric.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', PROGRESS_SURFACE.textTitle)}>
              {metric.isCurrency
                ? formatCurrency(metric.value, ctx.currency)
                : metric.isPercent
                  ? `${metric.value}%`
                  : metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProgressPanel
          title={`${capitalize(ctx.item_plural)} over time`}
          subtitle={`Created, ${ctx.won_label}, and ${ctx.lost_label} by day`}
        >
          {trendData.length === 0 ? (
            <EmptyChart message={`No ${ctx.item_plural} activity in this period yet.`} />
          ) : (
            <ChartContainer className="h-72">
              {({ width, height }) => (
                <LineChart width={width} height={height} data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cards_created" name="Created" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cards_won" name={capitalize(ctx.won_label)} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cards_lost" name={capitalize(ctx.lost_label)} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expected" name="Expected pace" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              )}
            </ChartContainer>
          )}
        </ProgressPanel>

        <ProgressPanel title="Stage funnel" subtitle={`Where ${ctx.item_plural} sit on selected columns`}>
          <div className="mb-3 inline-flex rounded-lg border border-gray-200 p-0.5">
            <button type="button" onClick={() => setFunnelMode('count')} className={cn('rounded-md px-2 py-1 text-xs', funnelMode === 'count' ? 'bg-violet-600 text-white' : 'text-gray-600')}>Count</button>
            <button type="button" onClick={() => setFunnelMode('value')} className={cn('rounded-md px-2 py-1 text-xs', funnelMode === 'value' ? 'bg-violet-600 text-white' : 'text-gray-600')}>Value</button>
          </div>
          {funnelData.length === 0 ? (
            <EmptyChart message="No stage data yet." />
          ) : (
            <ChartContainer className="h-72">
              {({ width, height }) => (
                <BarChart width={width} height={height} data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage_name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="display" name={funnelMode === 'value' ? 'Value' : 'Count'} radius={[6, 6, 0, 0]}>
                    {funnelData.map((entry) => (
                      <Cell key={entry.stage_id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          )}
        </ProgressPanel>
      </div>

      <ProgressPanel
        title="Team performance"
        subtitle={`Individual contribution on this ${ctx.is_project_board ? 'project board' : ctx.is_pipeline_board ? 'pipeline board' : 'board'}`}
        icon={Users}
      >
        {members.length === 0 ? (
          <EmptyChart message="No member activity in this period yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">{capitalize(ctx.won_label)}</th>
                  <th className="px-3 py-2">{capitalize(ctx.lost_label)}</th>
                  <th className="px-3 py-2">Open</th>
                  <th className="px-3 py-2">Value {ctx.won_label}</th>
                  <th className="px-3 py-2">Comments</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{member.name}</td>
                    <td className="px-3 py-2">{member.metrics.cards_created ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_won ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_lost ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_open ?? 0}</td>
                    <td className="px-3 py-2">{formatCurrency(member.metrics.pipeline_value_won ?? 0, ctx.currency)}</td>
                    <td className="px-3 py-2">{member.metrics.comments_posted ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProgressPanel>

      {columnMetrics.length > 0 && (
        <ProgressPanel title="Column metrics" subtitle="Throughput and dwell time for selected columns" icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Throughput</th>
                  <th className="px-3 py-2">Avg dwell</th>
                  <th className="px-3 py-2">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {columnMetrics.map((row) => (
                  <tr key={row.stage_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: row.color ?? '#8b5cf6' }} />
                      {row.stage_name}
                    </td>
                    <td className="px-3 py-2">{row.metrics.count ?? 0}</td>
                    <td className="px-3 py-2">{row.metrics.throughput ?? 0}</td>
                    <td className="px-3 py-2">{row.metrics.avg_dwell_days ?? 0}d</td>
                    <td className="px-3 py-2">{row.metrics.overdue ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProgressPanel>
      )}

      <ProgressPanel
        title={progressTargetsSectionTitle(ctx)}
        subtitle={ctx.is_project_board
          ? 'KPIs, goals, objectives, and key results for this project board'
          : ctx.is_pipeline_board
            ? 'KPIs, goals, objectives, and key results for this pipeline board'
            : 'KPIs, goals, objectives, and key results for this board'}
        icon={Target}
        action={canAddTarget ? (
          <Button size="sm" onClick={openTargetDrawer} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {progressAddTargetLabel(ctx)}
          </Button>
        ) : undefined}
      >
        {targets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-300/50 bg-white/70 p-8 text-center backdrop-blur-sm">
            <p className={cn('text-sm font-medium', PROGRESS_SURFACE.textTitle)}>No targets set for this period</p>
            <p className={cn('mt-1 text-xs', PROGRESS_SURFACE.textMuted)}>
              {progressTargetsEmptyHint(ctx, canAddTarget)}
            </p>
            {canAddTarget && (
              <Button
                size="sm"
                className="mt-4"
                onClick={openTargetDrawer}
              >
                <Plus className="mr-2 h-4 w-4" />
                {progressAddTargetLabel(ctx)}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                ctx={ctx}
                canManage={canAddTarget}
                onEdit={() => {
                  setEditingTarget(target);
                  setTargetDrawerOpen(true);
                }}
                onArchive={() => {
                  if (window.confirm(`Archive "${target.title}"?`)) {
                    archiveTarget.mutate(target.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </ProgressPanel>
      </>
      )}

      <BoardTargetFormDrawer
        open={targetDrawerOpen}
        onClose={() => {
          setTargetDrawerOpen(false);
          setEditingTarget(null);
        }}
        boardId={boardId}
        context={ctx}
        period={period}
        members={members}
        stages={stages.length > 0 ? stages : displaySummary?.stages ?? []}
        target={editingTarget}
      />
    </div>
  );
}

function TargetCard({
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

  return (
    <div className="rounded-xl border border-white/55 bg-white/85 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              {TARGET_TYPE_LABELS[target.type] ?? target.type}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', paceBadgeClass(target.pace_status))}>
              {PACE_STATUS_LABELS[target.pace_status] ?? target.pace_status}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">{target.title}</h3>
          {target.description && <p className="mt-1 text-xs text-gray-600">{target.description}</p>}
          <p className="mt-2 text-xs text-gray-500">
            {metricLabel}
            {target.scope === 'member' && target.member ? ` · ${target.member.name}` : ' · Team'}
            {target.planning_level ? ` · ${PLANNING_LEVEL_OPTIONS.find((o) => o.value === target.planning_level)?.label ?? target.planning_level}` : ''}
            {target.allocations && target.allocations.length > 0 ? ` · ${target.allocations.length} sub-periods` : ''}
          </p>
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
          <p className="text-2xl font-bold text-gray-900">{target.progress_percent}%</p>
          <p className="text-xs text-gray-500">
            {formatMetricValue(target.actual_value, target.unit, ctx.currency)} / {formatMetricValue(target.target_value, target.unit, ctx.currency)}
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${Math.min(100, target.progress_percent)}%` }}
        />
      </div>
      {target.key_results.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
          {target.key_results.map((kr) => (
            <div key={kr.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-gray-700">{kr.title}</span>
              <span className="text-gray-500">{kr.progress_percent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMetricValue(value: number, unit: string, currency: string): string {
  if (unit === 'currency') return formatCurrency(value, currency);
  if (unit === 'percent') return `${value}%`;
  if (unit === 'days') return `${value}d`;
  return String(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function EmptyChart({ message }: { message: string }) {
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

function ProgressPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={PROGRESS_SURFACE.panel}>
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
