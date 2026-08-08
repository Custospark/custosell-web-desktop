import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { EvaluateStaffPerformanceLink } from '../../hr/ui/EvaluateStaffPerformanceLink';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { BudgetProgressBar } from './estimatesShared';
import ProjectMemberPicker from './ProjectMemberPicker';
import type { Project, ProjectMember } from '../api/projectTypes';
import {
  AlertTriangle, CheckSquare, Clock, UserRound, TrendingUp, Wallet,
  DollarSign, Info, FolderKanban, Target, BarChart3, Percent,
} from 'lucide-react';

const n = (v: unknown): number => Number(v) || 0;

interface MemberActions {
  pending: boolean;
  canManage: boolean;
  onAdd: (payload: { user_id: number; role: ProjectMember['role']; send_notification?: boolean }) => void;
  onRoleChange: (userId: number, role: ProjectMember['role']) => void;
  onRemove: (userId: number) => void;
}

export function ProjectAlerts({ canCosting, isOverBudget, isMarginNegative, actualCost, budgetCost, currency, marginActual, marginBudget }: {
  canCosting: boolean;
  isOverBudget: boolean;
  isMarginNegative: boolean;
  actualCost: number;
  budgetCost: number;
  currency: string;
  marginActual: number;
  marginBudget: number;
}) {
  return (
    <>
      {canCosting && isOverBudget && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">Cost over budget</p>
            <p className="mt-0.5 text-red-700">
              Actual costs ({formatCurrency(actualCost, currency)}) have exceeded the budget ({formatCurrency(budgetCost, currency)}).
              Review cost allocations and timesheets to identify overruns.
            </p>
          </div>
        </div>
      )}
      {canCosting && isMarginNegative && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3">
          <TrendingUp className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-sm text-rose-900">
            <p className="font-semibold">Negative margin</p>
            <p className="mt-0.5 text-rose-700">
              The project is running at {marginActual.toFixed(1)}% margin (budgeted: {marginBudget.toFixed(1)}%).
              Costs are exceeding revenue — review pricing and expenses.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', glow: 'bg-blue-500/10' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', glow: 'bg-green-500/10' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', glow: 'bg-amber-500/10' },
  purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', glow: 'bg-purple-500/10' },
  rose: { border: 'border-rose-500', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', glow: 'bg-rose-500/10' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', glow: 'bg-indigo-500/10' },
};

function MiniStat({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof cardStyles; sub?: string;
}) {
  const s = cardStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-white p-4 ${s.border}`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-xl ${s.glow}`} />
      <div className="relative flex items-start gap-3">
        <div className={`shrink-0 rounded-lg p-2 ${s.iconBg}`}>
          <Icon className={`h-4 w-4 ${s.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function ProjectStatsGrid({ canCosting, budgetRevenue, budgetCost, actualCost, actualRevenue, marginBudget, marginActual, isOverBudget, currency }: {
  canCosting: boolean;
  budgetRevenue: number;
  budgetCost: number;
  actualCost: number;
  actualRevenue: number;
  marginBudget: number;
  marginActual: number;
  isOverBudget: boolean;
  currency: string;
}) {
  if (!canCosting) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <MiniStat label="Budget revenue" value={formatCurrency(budgetRevenue, currency)} icon={Target} color="blue" />
      <MiniStat label="Budget cost" value={formatCurrency(budgetCost, currency)} icon={BarChart3} color="purple" />
      <MiniStat
        label="Actual cost"
        value={formatCurrency(actualCost, currency)}
        icon={DollarSign}
        color={isOverBudget ? 'rose' : 'amber'}
        sub={`vs ${formatCurrency(budgetCost, currency)} budget`}
      />
      <MiniStat
        label="Margin (budgeted)"
        value={`${marginBudget.toFixed(1)}%`}
        icon={Target}
        color={marginBudget >= 15 ? 'green' : 'amber'}
        sub={`Revenue ${formatCurrency(budgetRevenue, currency)} · Cost ${formatCurrency(budgetCost, currency)}`}
      />
      <MiniStat
        label="Margin (actual)"
        value={`${marginActual.toFixed(1)}%`}
        icon={Percent}
        color={marginActual >= 15 ? 'green' : 'rose'}
        sub={`Revenue ${formatCurrency(actualRevenue, currency)} · Cost ${formatCurrency(actualCost, currency)}`}
      />
    </div>
  );
}

export function ProjectBudgetCard({ canCosting, actualCost, budgetCost, actualRevenue, budgetRevenue, currency }: {
  canCosting: boolean;
  actualCost: number;
  budgetCost: number;
  actualRevenue: number;
  budgetRevenue: number;
  currency: string;
}) {
  if (!canCosting) return null;
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        Budget vs actual
      </h3>
      <div className="space-y-4">
        <BudgetProgressBar
          label="Cost spend"
          actual={actualCost}
          budget={budgetCost}
          formatValue={(v) => formatCurrency(v, currency)}
        />
        <BudgetProgressBar
          label="Revenue achieved"
          actual={actualRevenue}
          budget={budgetRevenue}
          formatValue={(v) => formatCurrency(v, currency)}
          overIsBad={false}
        />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Wallet className="h-3 w-3" />
        <span>
          Revenue from invoice payments: <strong className="text-gray-600">{formatCurrency(actualRevenue, currency)}</strong>
          {' '}received of <strong className="text-gray-600">{formatCurrency(budgetRevenue, currency)}</strong> budgeted
        </span>
      </div>
    </Card>
  );
}

export function ProjectOverviewTab({ project, canCosting, currency, members, profitability, memberActions }: {
  project: Project;
  canCosting: boolean;
  currency: string;
  members: ProjectMember[];
  profitability?: { revenue: number; total_cost: number; gross_profit: number } | null;
  memberActions: MemberActions;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {project.customer && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Info className="h-4 w-4 text-gray-400" />
            Customer
          </div>
          <p className="text-sm text-gray-700">{project.customer.name}</p>
        </Card>
      )}
      {project.manager && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Info className="h-4 w-4 text-gray-400" />
            Manager
          </div>
          <p className="text-sm text-gray-700">{project.manager.name}</p>
        </Card>
      )}
      {project.start_date && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Clock className="h-4 w-4 text-gray-400" />
            Timeline
          </div>
          <p className="text-sm text-gray-700">
            {formatShiftDate(project.start_date)}
            {project.due_date && <> — {formatShiftDate(project.due_date)}</>}
          </p>
        </Card>
      )}
      {canCosting && profitability && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Profitability
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue (invoices + timesheets)</span>
              <span className="font-medium">{formatCurrency(profitability.revenue, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total cost</span>
              <span className="font-medium">{formatCurrency(profitability.total_cost, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Gross profit</span>
              <span className={profitability.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {formatCurrency(profitability.gross_profit, currency)}
              </span>
            </div>
          </div>
        </Card>
      )}
      <Card className="p-4 lg:col-span-2">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <UserRound className="h-4 w-4 text-blue-600" />
          Project team
        </div>
        <ProjectMemberPicker
          members={members}
          lockedUserId={project.created_by}
          canManage={memberActions.canManage}
          loading={memberActions.pending}
          onAdd={memberActions.onAdd}
          onRoleChange={memberActions.onRoleChange}
          onRemove={memberActions.onRemove}
        />
      </Card>
    </div>
  );
}

export function ProjectTasksTab({ tasks, currency }: { tasks?: Project['tasks']; currency: string }) {
  const items = tasks ?? [];
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <CheckSquare className="h-4 w-4 text-blue-600" />
        Tasks
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckSquare className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No tasks yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Task</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Est. hours</th>
                <th className="pb-2 pr-4">Actual hours</th>
                <th className="pb-2 pr-4">Budget cost</th>
                <th className="pb-2 pr-4">Due</th>
                <th className="pb-2">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{task.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      task.status === 'done' ? 'bg-emerald-50 text-emerald-700' :
                      task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      task.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-700',
                    )}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-600">{task.estimated_hours}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-600">{task.actual_hours}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-600">{formatCurrency(n(task.budget_cost), currency)}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-500">
                    {task.due_date ? formatShiftDate(task.due_date) : '—'}
                  </td>
                  <td className="py-2.5 text-gray-600">
                    <div className="flex flex-col gap-1">
                      <span>{task.assignee?.name ?? '—'}</span>
                      {task.assigned_to ? (
                        <EvaluateStaffPerformanceLink userId={task.assigned_to} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ProjectTimesheetsTab({ entries, currency }: { entries?: Project['timesheet_entries']; currency: string }) {
  const items = entries ?? [];
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Clock className="h-4 w-4 text-blue-600" />
        Timesheets
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Clock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No time logged yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Staff</th>
                <th className="pb-2 pr-4">Hours</th>
                <th className="pb-2 pr-4">Rate</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2 pr-4">Billable</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{entry.user?.name ?? 'Staff'}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-700">{entry.hours}h</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-600">{formatCurrency(entry.hourly_rate, currency)}/h</td>
                  <td className="py-2.5 pr-4 tabular-nums font-medium text-gray-900">{formatCurrency(entry.total_cost, currency)}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', entry.is_billable ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                      {entry.is_billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-500">{formatShiftDate(entry.entry_date)}</td>
                  <td className="py-2.5 text-gray-500 max-w-[160px] truncate">{entry.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ProjectBoardTab({ board }: {
  board?: { id: number; code?: string; name: string; stages?: Array<{ leads?: unknown[] }> } | null;
}) {
  const navigate = useNavigate();
  return (
    <Card className="p-6">
      {!board ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="mt-3 text-sm text-gray-500">Loading project board...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 shadow-sm">
            <FolderKanban className="h-8 w-8 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{board.name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage tasks with a Kanban board — drag cards between stages,
            assign team members, track progress.
          </p>
          <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
            <span><strong className="text-gray-900">{(board.stages ?? []).length}</strong> stages</span>
            <span><strong className="text-gray-900">
              {(board.stages ?? []).reduce((sum: number, s) => sum + (s.leads ?? []).length, 0)}
            </strong> cards</span>
          </div>
          <Button
            size="lg"
            className="mt-6 inline-flex items-center gap-2"
            onClick={() => navigate(ROUTES.ESTIMATES.BOARD(board.code ?? board.id))}
          >
            Open board
          </Button>
        </div>
      )}
    </Card>
  );
}

