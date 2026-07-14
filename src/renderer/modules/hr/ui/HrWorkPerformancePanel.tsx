import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Link2Off,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import type {
  HrPerformanceGoalItem,
  HrPerformanceRosterRow,
  HrPerformanceSnapshot,
} from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import {
  useHrPerformanceEmployee,
  useHrPerformanceRoster,
  useSeedHrPerformanceReview,
  type HrPerformancePeriodFilters,
} from '../api/useHrQueries';
import { TALENT_SURFACE, talentPaceClass } from './talentSurface';

function roundGoalNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const nearest = Math.round(value * 1000) / 1000;
  if (Math.abs(nearest - Math.round(nearest)) < 0.0005) {
    return Math.round(nearest);
  }
  return nearest;
}

/** Period achievement as x/y — e.g. day target 2 → 1/2. */
function goalRatioLabel(actual: number, expected: number): string {
  return `${roundGoalNumber(actual)}/${roundGoalNumber(expected)}`;
}

function goalPeriodCaption(goal: HrPerformanceGoalItem): string {
  const period = goal.view_period_type;
  const label =
    period === 'day' ? 'Today'
      : period === 'week' ? 'This week'
        : period === 'month' ? 'This month'
          : period === 'quarter' ? 'This quarter'
            : period === 'year' ? 'This year'
              : period === 'custom' ? 'Custom range'
                : null;
  if (goal.period_start && goal.period_end) {
    const range = goal.period_start === goal.period_end
      ? goal.period_start
      : `${goal.period_start} – ${goal.period_end}`;
    return label ? `${label} · ${range}` : range;
  }
  return label ?? 'Selected period';
}

function PaceBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', talentPaceClass(status))}>
      {label}
    </span>
  );
}

interface HrWorkPerformancePanelProps {
  isFullHr: boolean;
  selectedEmployeeId?: number | null;
  onSelectEmployee?: (employeeId: number) => void;
  periodFilters?: HrPerformancePeriodFilters;
}

export function HrWorkPerformancePanel({
  isFullHr,
  selectedEmployeeId = null,
  onSelectEmployee,
  periodFilters,
}: HrWorkPerformancePanelProps) {
  const { data: roster = [], isLoading: loadingRoster, isError: rosterError, refetch: refetchRoster } = useHrPerformanceRoster(periodFilters);
  const activeId = selectedEmployeeId ?? roster[0]?.employee_id ?? null;
  const {
    data: snapshot,
    isLoading: loadingDetail,
    isError: detailError,
    refetch: refetchDetail,
  } = useHrPerformanceEmployee(activeId, periodFilters, !!activeId);
  const seedReview = useSeedHrPerformanceReview();

  if (loadingRoster) {
    return (
      <div className={cn(TALENT_SURFACE.panel, 'flex justify-center py-12')}>
        <CustosellLoader />
      </div>
    );
  }

  if (rosterError) {
    return (
      <div className={cn(TALENT_SURFACE.panel, 'border-red-200/80 bg-red-50/90')}>
        <p className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Could not load work performance</p>
        <p className={cn('mt-1 text-xs', TALENT_SURFACE.textMuted)}>Check your connection and try again.</p>
        <Button size="sm" variant="outline" className="mt-3 border-white/60 bg-white/80" onClick={() => void refetchRoster()}>
          Retry
        </Button>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className={TALENT_SURFACE.panel}>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-slate-600 shadow-sm">
            <Link2Off className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold', TALENT_SURFACE.textTitle)}>No linked staff yet</h3>
            <p className={cn('mt-1.5 max-w-md text-sm', TALENT_SURFACE.textMuted)}>
              {isFullHr
                ? 'Link an app login on People profiles so Pipeline assignees and Project task owners can be evaluated here.'
                : 'Ask HR to link your staff login to your employee profile to see your Pipeline/Projects performance.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={TALENT_SURFACE.intro}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>
                {isFullHr ? 'Team work performance' : 'My progress'}
              </h3>
              <p className={cn('mt-1 text-xs', TALENT_SURFACE.textMuted)}>
                {isFullHr
                  ? 'See whether people are meeting board goals from Pipeline cards/leads and Project tasks — same pulse as My progress on boards.'
                  : 'Your contribution toward Pipeline/Projects goals, cards, and tasks.'}
              </p>
            </div>
          </div>
          {isFullHr && activeId && snapshot?.link_status === 'linked' ? (
            <Button
              size="sm"
              variant="outline"
              loading={seedReview.isPending}
              onClick={() => seedReview.mutate({
                employeeId: activeId,
                period: periodFilters?.period,
                from: periodFilters?.from,
                to: periodFilters?.to,
              })}
              className="inline-flex items-center gap-1.5 border-white/60 bg-white/80 backdrop-blur-sm"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Seed review draft
            </Button>
          ) : null}
        </div>
      </div>

      {isFullHr ? (
        <div className={TALENT_SURFACE.panel}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Team roster</h4>
          </div>
          <div className="space-y-2">
            {roster.map((row) => (
              <RosterCard
                key={row.employee_id}
                row={row}
                active={row.employee_id === activeId}
                onSelect={() => onSelectEmployee?.(row.employee_id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeId ? (
        loadingDetail ? (
          <div className={cn(TALENT_SURFACE.panel, 'flex justify-center py-10')}>
            <CustosellLoader />
          </div>
        ) : detailError || !snapshot ? (
          <div className={cn(TALENT_SURFACE.panel, 'border-red-200/80 bg-red-50/90')}>
            <p className="text-sm font-medium text-red-800">Could not load this employee&apos;s snapshot</p>
            <Button size="sm" variant="outline" className="mt-3 border-white/60 bg-white/80" onClick={() => void refetchDetail()}>
              Retry
            </Button>
          </div>
        ) : (
          <PerformanceSnapshotDetail snapshot={snapshot} />
        )
      ) : null}
    </div>
  );
}

function RosterCard({
  row,
  active,
  onSelect,
}: {
  row: HrPerformanceRosterRow;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        TALENT_SURFACE.rowCard,
        'flex w-full items-start justify-between gap-3 text-left transition-all',
        active && 'ring-2 ring-violet-400/70 bg-violet-50/80',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
          {employeeDisplayName(row.employee)}
        </p>
        <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
          {row.employee.employee_number}
          {row.goals_total > 0
            ? ` · ${row.goals_on_track}/${row.goals_total} goals · ${row.goal_progress_avg}%`
            : ' · no member goals yet'}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span>{row.leads_open} open cards{row.leads_overdue > 0 ? ` · ${row.leads_overdue} overdue` : ''}</span>
          <span>{row.tasks_done} tasks done · {row.tasks_open} open</span>
        </div>
        {row.goals_total > 0 ? (
          <div className="mt-2 space-y-1">
            <div className={TALENT_SURFACE.barTrack}>
              <div className={TALENT_SURFACE.barFill} style={{ width: `${Math.min(100, row.goal_progress_avg)}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <PaceBadge status={row.verdict} label={row.verdict_label} />
    </button>
  );
}

function PerformanceSnapshotDetail({ snapshot }: { snapshot: HrPerformanceSnapshot }) {
  const paceAlerts = snapshot.goals.items.filter((g) => g.pace_status === 'at_risk' || g.pace_status === 'behind');

  return (
    <div className="space-y-5">
      {(snapshot.verdict === 'behind' || snapshot.verdict === 'at_risk' || paceAlerts.length > 0) && (
        <div className={TALENT_SURFACE.alert}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Pace alerts</p>
              <ul className="mt-2 space-y-1">
                {paceAlerts.length > 0 ? (
                  paceAlerts.map((goal) => (
                    <li key={goal.id} className="text-xs text-amber-800">
                      {goal.title} — {goal.pace_status.replace('_', ' ')} ·{' '}
                      {goalRatioLabel(goal.actual_value, goal.expected_value ?? goal.target_value)}{' '}
                      ({goal.progress_percent}%)
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-amber-800">
                    Follow up on overdue work and goals that are behind pace before the next review cycle.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={TALENT_SURFACE.metricCard}>
          <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Goal progress</p>
          <p className={cn('mt-1 text-2xl font-bold', TALENT_SURFACE.textTitle)}>
            {snapshot.goals.total > 0 ? `${snapshot.goals.average_progress_percent}%` : '—'}
          </p>
          <p className={cn('mt-1 text-[11px]', TALENT_SURFACE.textMuted)}>
            {snapshot.goals.total > 0
              ? `${snapshot.goals.on_track_count} on track · ${snapshot.goals.at_risk_count} at risk · ${snapshot.goals.behind_count} behind`
              : 'No member goals assigned'}
          </p>
        </div>
        <div className={TALENT_SURFACE.metricCard}>
          <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Cards won</p>
          <p className={cn('mt-1 text-2xl font-bold', TALENT_SURFACE.textTitle)}>{snapshot.leads.won}</p>
          <p className={cn('mt-1 text-[11px]', TALENT_SURFACE.textMuted)}>
            {snapshot.leads.open} open · win rate {snapshot.leads.win_rate}%
            {snapshot.leads.overdue > 0 ? ` · ${snapshot.leads.overdue} overdue` : ''}
          </p>
        </div>
        <div className={TALENT_SURFACE.metricCard}>
          <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Tasks done</p>
          <p className={cn('mt-1 text-2xl font-bold', TALENT_SURFACE.textTitle)}>{snapshot.project_tasks.done}</p>
          <p className={cn('mt-1 text-[11px]', TALENT_SURFACE.textMuted)}>
            {snapshot.project_tasks.open} open · {snapshot.project_tasks.completion_rate}% complete
            {snapshot.project_tasks.overdue > 0 ? ` · ${snapshot.project_tasks.overdue} overdue` : ''}
          </p>
        </div>
      </div>

      <div className={TALENT_SURFACE.panel}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-600" />
            <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>
              {employeeDisplayName(snapshot.employee)} — goals
            </h4>
          </div>
          <PaceBadge status={snapshot.verdict} label={snapshot.verdict_label} />
        </div>
        {snapshot.goals.items.length === 0 ? (
          <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>
            No member-scoped targets assigned for this person. Add goals on a board&apos;s Progress → My progress flow.
          </p>
        ) : (
          <div className="space-y-2">
            {snapshot.goals.items.map((goal) => {
              const expected = goal.expected_value ?? goal.target_value;
              const ratio = goalRatioLabel(goal.actual_value, expected);
              const showOverall = roundGoalNumber(goal.target_value) !== roundGoalNumber(expected);
              return (
              <div key={goal.id} className={TALENT_SURFACE.rowCard}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>{goal.title}</p>
                    <p className={cn('mt-1 text-lg font-bold tabular-nums', TALENT_SURFACE.textTitle)}>
                      {ratio}
                    </p>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                      {goal.board_name ?? 'Board'} · {goalPeriodCaption(goal)}
                      {goal.unit && goal.unit !== 'count' ? ` · ${goal.unit}` : ''}
                    </p>
                    {showOverall ? (
                      <p className={cn('mt-0.5 text-[10px]', TALENT_SURFACE.textMuted)}>
                        Overall goal: {roundGoalNumber(goal.target_value)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PaceBadge status={goal.pace_status} label={goal.pace_status.replace('_', ' ')} />
                    {goal.board_id ? (
                      <Link
                        to={
                          goal.workspace === 'estimates'
                            ? ROUTES.ESTIMATES.BOARD(goal.board_id)
                            : ROUTES.PIPELINE.BOARD(goal.board_id)
                        }
                        className="text-xs font-medium text-violet-700 hover:underline"
                      >
                        Board
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="tabular-nums">{ratio} of period goal</span>
                    <span className="font-semibold text-gray-800">{goal.progress_percent}%</span>
                  </div>
                  <div className={TALENT_SURFACE.barTrack}>
                    <div className={TALENT_SURFACE.barFill} style={{ width: `${Math.min(100, goal.progress_percent)}%` }} />
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {(snapshot.recent_leads.length > 0 || snapshot.recent_tasks.length > 0) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.recent_leads.length > 0 ? (
            <div className={TALENT_SURFACE.panel}>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Recent cards / leads</h4>
              </div>
              <div className="space-y-2">
                {snapshot.recent_leads.map((lead) => (
                  <div key={lead.id} className={TALENT_SURFACE.rowCard}>
                    <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>{lead.title}</p>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                      {lead.board_name ?? 'Board'} · {lead.status}
                      {lead.due_date ? ` · due ${formatShiftDate(lead.due_date)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {snapshot.recent_tasks.length > 0 ? (
            <div className={TALENT_SURFACE.panel}>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Recent project tasks</h4>
              </div>
              <div className="space-y-2">
                {snapshot.recent_tasks.map((task) => (
                  <div key={task.id} className={TALENT_SURFACE.rowCard}>
                    <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>{task.name}</p>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                      <Link to={ROUTES.ESTIMATES.PROJECT_DETAIL(task.project_id)} className="font-medium text-violet-700 hover:underline">
                        {task.project_name ?? `Project #${task.project_id}`}
                      </Link>
                      {' · '}{task.status.replace('_', ' ')}
                      {task.due_date ? ` · due ${formatShiftDate(task.due_date)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={cn('text-center text-[11px]', TALENT_SURFACE.textMuted)}>
        {snapshot.period
          ? `${snapshot.period.start} — ${snapshot.period.end}`
          : `Snapshot · ${formatShiftDate(snapshot.evaluated_at.slice(0, 10))}`}
      </p>
    </div>
  );
}

/** Compact card for employee detail / deep links. */
export function HrEmployeePerformanceCard({
  employeeId,
  isFullHr,
}: {
  employeeId: number;
  isFullHr: boolean;
}) {
  const periodFilters = { period: 'month' };
  const { data: snapshot, isLoading, isError, refetch } = useHrPerformanceEmployee(employeeId, periodFilters);
  const seedReview = useSeedHrPerformanceReview();

  if (isLoading) {
    return (
      <div className={cn(TALENT_SURFACE.panel, 'flex justify-center py-8')}>
        <CustosellLoader />
      </div>
    );
  }

  if (isError || !snapshot) {
    return (
      <div className={cn(TALENT_SURFACE.panel, 'border-red-200/80 bg-red-50/90 text-sm text-red-700')}>
        Could not load work performance.
        <Button size="sm" variant="outline" className="ml-3 border-white/60 bg-white/80" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isFullHr && snapshot.link_status === 'linked' ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            loading={seedReview.isPending}
            onClick={() => seedReview.mutate({ employeeId, period: 'month' })}
            className="border-white/60 bg-white/80 backdrop-blur-sm"
          >
            Seed review draft
          </Button>
        </div>
      ) : null}
      <PerformanceSnapshotDetail snapshot={snapshot} />
      <Link
        to={`${ROUTES.HR.TALENT}?employee_id=${employeeId}&tab=performance&period=month`}
        className="inline-flex text-sm font-medium text-violet-700 hover:underline"
      >
        Open in Talent →
      </Link>
    </div>
  );
}
