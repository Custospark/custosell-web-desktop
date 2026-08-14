import { useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressStage, BoardProgressSummary, BoardTarget } from '../api/boardProgressTypes';
import type { PipelineBoard } from '../api/pipelineTypes';
import {
  METRIC_LABELS,
  PACE_STATUS_LABELS,
  PROGRESS_PERIOD_OPTIONS,
  progressBoardSubtitle,
  progressBoardTitle,
  resolveProgressContext,
  type ProgressPeriod,
} from '../api/pipelineProgressTerms';
import {
  useExportBoardProgress,
  useArchiveBoardTarget,
  useMyBoardProgressDisplay,
} from '../api/useBoardProgressQueries';
import BoardTargetFormModal from './BoardTargetFormModal';
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
import { Download, Plus, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { TargetCard, ProgressPanel } from './BoardProgressShared';
import BoardProgressChartsTables from './BoardProgressChartsTables';

interface BoardProgressViewProps {
  boardId: number;
  board?: Pick<PipelineBoard, 'project_id' | 'workspace' | 'members'> | null;
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
  const [targetModalOpen, setTargetModalOpen] = useState(false);
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

  const openTargetModal = () => {
    setEditingTarget(null);
    setTargetModalOpen(true);
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
                {displaySummary.period.start} - {displaySummary.period.end}
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {canAddTarget && (
                <Button
                  size="sm"
                  onClick={openTargetModal}
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
                <li key={alert.target_id} className="text-xs text-amber-800">{alert.title} - {PACE_STATUS_LABELS[alert.pace_status]} ({alert.progress_percent}%)</li>
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
                <span className="font-medium">{rec.stage_name}</span> - {rec.message}
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

      <BoardProgressChartsTables
        ctx={ctx}
        trendData={trendData}
        funnelData={funnelData}
        funnelMode={funnelMode}
        onFunnelModeChange={setFunnelMode}
        members={members}
        columnMetrics={columnMetrics}
      />

      <ProgressPanel
        title={progressTargetsSectionTitle(ctx)}
        subtitle={ctx.is_project_board
          ? 'KPIs, goals, objectives, and key results for this project board'
          : ctx.is_pipeline_board
            ? 'KPIs, goals, objectives, and key results for this pipeline board'
            : 'KPIs, goals, objectives, and key results for this board'}
        icon={Target}
        action={canAddTarget ? (
          <Button size="sm" onClick={openTargetModal} className="inline-flex items-center gap-2">
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
                onClick={openTargetModal}
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
                  setTargetModalOpen(true);
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

      <BoardTargetFormModal
        open={targetModalOpen}
        onClose={() => {
          setTargetModalOpen(false);
          setEditingTarget(null);
        }}
        boardId={boardId}
        projectId={board?.project_id ?? 0}
        board={board}
        context={ctx}
        period={period}
        members={members}
        stages={stages.length > 0 ? stages : displaySummary?.stages ?? []}
        target={editingTarget}
      />
    </div>
  );
}

