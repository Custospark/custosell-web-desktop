import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type { BoardProgressSummary, BoardTarget } from '../api/boardProgressTypes';
import {
  METRIC_LABELS,
  PACE_STATUS_LABELS,
  PROGRESS_PERIOD_OPTIONS,
  progressBoardSubtitle,
  progressBoardTitle,
  resolveProgressContext,
  TARGET_TYPE_LABELS,
  type ProgressPeriod,
} from '../api/pipelineProgressTerms';
import {
  useExportBoardProgress,
  useArchiveBoardTarget,
} from '../api/useBoardProgressQueries';
import BoardTargetFormDrawer from './BoardTargetFormDrawer';
import { Download, Plus, Target, TrendingUp, Users, Pencil, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';

interface BoardProgressViewProps {
  boardId: number;
  summary?: BoardProgressSummary;
  isLoading?: boolean;
  isFetching?: boolean;
  period: ProgressPeriod;
  onPeriodChange: (period: ProgressPeriod) => void;
}

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
  summary,
  isLoading,
  isFetching,
  period,
  onPeriodChange,
}: BoardProgressViewProps) {
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<BoardTarget | null>(null);
  const exportProgress = useExportBoardProgress(boardId);
  const archiveTarget = useArchiveBoardTarget(boardId);

  const ctx = useMemo(
    () => resolveProgressContext(undefined, summary?.context),
    [summary?.context],
  );

  const trendData = useMemo(
    () => (summary?.trends ?? []).map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
    [summary?.trends],
  );

  const funnelData = summary?.funnel ?? [];
  const members = summary?.members ?? [];
  const targets = summary?.targets ?? [];
  const team = summary?.team ?? {};

  const headlineMetrics = useMemo(() => {
    const keys = ['cards_created', 'cards_won', 'cards_lost', 'cards_open', 'win_rate', 'pipeline_value_won'] as const;
    return keys.map((key) => ({
      key,
      label: METRIC_LABELS[key]?.(ctx) ?? key,
      value: team[key] ?? 0,
      isCurrency: key === 'pipeline_value_won',
      isPercent: key === 'win_rate',
    }));
  }, [ctx, team]);

  if (isLoading && !summary) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-bold text-gray-900">{progressBoardTitle(ctx)}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">{progressBoardSubtitle(ctx)}</p>
          {isFetching && <p className="mt-1 text-xs text-violet-600">Refreshing…</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {PROGRESS_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === option.value ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportProgress.mutate({ period })}
            loading={exportProgress.isPending}
            className="inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {summary?.can_manage_targets && (
            <Button
              size="sm"
              onClick={() => {
                setEditingTarget(null);
                setTargetDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add target
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {headlineMetrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
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
                </LineChart>
              )}
            </ChartContainer>
          )}
        </ProgressPanel>

        <ProgressPanel title="Stage funnel" subtitle={`Where ${ctx.item_plural} sit on this board`}>
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
                  <Bar dataKey="count" name="Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
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

      <ProgressPanel title="Targets" subtitle="KPIs, goals, objectives, and key results for this board" icon={Target}>
        {targets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-8 text-center">
            <p className="text-sm font-medium text-gray-800">No targets set for this period</p>
            <p className="mt-1 text-xs text-gray-600">
              {summary?.can_manage_targets
                ? 'Add KPIs, goals, or OKRs so the team knows what success looks like.'
                : 'Your board manager can define targets here.'}
            </p>
            {summary?.can_manage_targets && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => {
                  setEditingTarget(null);
                  setTargetDrawerOpen(true);
                }}
              >
                Add first target
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
                canManage={Boolean(summary?.can_manage_targets)}
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
    <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      {message}
    </div>
  );
}

function ProgressPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 text-violet-600" />}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
