import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { useToast } from '../../../app/contexts/useToast';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewProjectCosting, isProjectCollaboratorOnly } from '../../../shared/utils/moduleAccess';
import {
  useProject,
  useProjectBudgetSummary,
  useProjectProfitability,
  useCreateCostAllocation,
  useDeleteCostAllocation,
  useProjectBoard,
  useProjectMembers,
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
} from '../api/useProjectQueries';
import type { CreateCostAllocationPayload, AllocationType } from '../api/projectTypes';
import { BudgetProgressBar, PipelineModalHero, PipelineFormSection } from '../ui/estimatesShared';
import ProjectMemberPicker from '../ui/ProjectMemberPicker';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
const n = (v: unknown): number => Number(v) || 0;

import {
  ArrowLeft, CheckSquare, Clock, DollarSign, Target, TrendingUp, Percent,
  FolderKanban, BarChart3, Info, Plus, Trash2, AlertTriangle, Wallet,
  Users,
} from 'lucide-react';

type ProjectTab = 'overview' | 'tasks' | 'timesheets' | 'costs' | 'board';

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', glow: 'bg-blue-500/10' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', glow: 'bg-green-500/10' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', glow: 'bg-amber-500/10' },
  purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', glow: 'bg-purple-500/10' },
  rose: { border: 'border-rose-500', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', glow: 'bg-rose-500/10' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', glow: 'bg-indigo-500/10' },
};

const ALLOCATION_TYPES: { value: AllocationType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'expense', label: 'Expense' },
  { value: 'other', label: 'Other' },
];

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const canCosting = canViewProjectCosting(user);
  const collaboratorOnly = isProjectCollaboratorOnly(user);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');

  const { data: project, isLoading } = useProject(projectId);
  const { data: budget } = useProjectBudgetSummary(projectId, canCosting);
  const { data: profitability } = useProjectProfitability(projectId, canCosting);
  const { data: members = [] } = useProjectMembers(canCosting ? projectId : 0);
  const addMember = useAddProjectMember(projectId);
  const updateMember = useUpdateProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const [showAllocation, setShowAllocation] = useState(false);
  const [allocType, setAllocType] = useState<AllocationType>('overhead');
  const [allocDesc, setAllocDesc] = useState('');
  const [allocAmount, setAllocAmount] = useState(0);
  const [allocDate, setAllocDate] = useState(new Date().toISOString().slice(0, 10));

  const createAllocation = useCreateCostAllocation(projectId);
  const deleteAllocation = useDeleteCostAllocation(projectId);
  const { data: projectBoard } = useProjectBoard(activeTab === 'board' ? projectId : 0);

  if (isLoading || !project) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const currency = project.currency;
  const tasks = project.tasks ?? [];
  const timesheets = project.timesheet_entries ?? [];
  const allocations = project.cost_allocations ?? [];

  const actualCost = n(budget?.actual_cost ?? project.actual_cost);
  const budgetCost = n(budget?.budget_cost ?? project.budget_cost);
  const actualRevenue = n(budget?.actual_revenue ?? project.actual_revenue);
  const budgetRevenue = n(budget?.budget_revenue ?? project.budget_revenue);
  const marginActual = n(budget?.margin_percent_actual ?? profitability?.margin_percent ?? 0);
  const marginBudget = n(budget?.margin_percent_budget ?? 0);

  const isOverBudget = actualCost > budgetCost && budgetCost > 0;
  const isMarginNegative = marginActual < 0;

  const handleRecordAllocation = async () => {
    if (!allocDesc.trim() || allocAmount <= 0) return;
    const payload: CreateCostAllocationPayload = {
      allocation_type: allocType,
      description: allocDesc.trim(),
      amount: allocAmount,
      allocation_date: allocDate || new Date().toISOString().slice(0, 10),
    };
    try {
      await createAllocation.mutateAsync(payload);
      setShowAllocation(false);
      setAllocDesc('');
      setAllocAmount(0);
      setAllocType('overhead');
      showToast('success', 'Cost allocation recorded');
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleDeleteAllocation = async (allocationId: number) => {
    try {
      await deleteAllocation.mutateAsync(allocationId);
      showToast('success', 'Allocation removed');
    } catch {
      /* toast handled in mutation */
    }
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: FolderKanban },
    { key: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
    ...(canCosting ? [{ key: 'timesheets' as const, label: 'Timesheets', icon: Clock }] : []),
    { key: 'board' as const, label: 'Board', icon: FolderKanban },
    ...(canCosting ? [{ key: 'costs' as const, label: 'Cost allocations', icon: DollarSign }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={collaboratorOnly ? ROUTES.ESTIMATES.MY_PROJECTS : ROUTES.ESTIMATES.PROJECTS}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
            <p className="mt-0.5 font-mono text-sm text-gray-500">{project.project_number}</p>
          </div>
          <span className={cn(
            'mt-1 rounded-full px-3 py-0.5 text-xs font-medium capitalize',
            project.status === 'active' ? 'bg-blue-50 text-blue-700' :
            project.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
            project.status === 'on_hold' ? 'bg-amber-50 text-amber-800' :
            project.status === 'cancelled' ? 'bg-red-50 text-red-700' :
            'bg-gray-100 text-gray-700',
          )}>
            {project.status.replace('_', ' ')}
          </span>
        </div>
        {project.description && (
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{project.description}</p>
        )}
      </div>

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

      {canCosting && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MiniStat
          label="Budget revenue"
          value={formatCurrency(budgetRevenue, currency)}
          icon={Target}
          color="blue"
        />
        <MiniStat
          label="Budget cost"
          value={formatCurrency(budgetCost, currency)}
          icon={BarChart3}
          color="purple"
        />
        <MiniStat
          label="Actual cost"
          value={formatCurrency(actualCost, currency)}
          icon={DollarSign}
          color={isOverBudget ? 'rose' : 'amber'}
          sub={budget ? `vs ${formatCurrency(budgetCost, currency)} budget` : undefined}
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
      )}

      {canCosting && (
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
            formatValue={(n) => formatCurrency(n, currency)}
          />
          <BudgetProgressBar
            label="Revenue achieved"
            actual={actualRevenue}
            budget={budgetRevenue}
            formatValue={(n) => formatCurrency(n, currency)}
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
      )}

      <nav className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {project.customer && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Info className="h-4 w-4 text-gray-400" />
                Customer
              </div>
              <p className="text-sm text-gray-700">{project.customer.name}</p>
            </Card>
          )}
          {project.manager && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Info className="h-4 w-4 text-gray-400" />
                Manager
              </div>
              <p className="text-sm text-gray-700">{project.manager.name}</p>
            </Card>
          )}
          {project.start_date && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
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
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
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
          {canCosting && (
            <Card className="p-4 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Users className="h-4 w-4 text-blue-600" />
                Project team
              </div>
              <ProjectMemberPicker
                members={members.length ? members : (project.members ?? [])}
                loading={addMember.isPending || updateMember.isPending || removeMember.isPending}
                onAdd={(userId, role) => addMember.mutate({ user_id: userId, role })}
                onRoleChange={(userId, role) => updateMember.mutate({ userId, role })}
                onRemove={(userId) => removeMember.mutate(userId)}
              />
            </Card>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            Tasks
          </div>
          {tasks.length === 0 ? (
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
                  {tasks.map((task) => (
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
                      <td className="py-2.5 text-gray-600">{task.assignee?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'timesheets' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Clock className="h-4 w-4 text-blue-600" />
            Timesheets
          </div>
          {timesheets.length === 0 ? (
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
                  {timesheets.map((entry) => (
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
      )}

      {activeTab === 'board' && (
        <Card className="p-6">
          {!projectBoard ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <p className="mt-3 text-sm text-gray-500">Loading project board...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 shadow-sm">
                <FolderKanban className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{projectBoard.name}</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage tasks with a Kanban board — drag cards between stages,
                assign team members, track progress.
              </p>
              <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                <span><strong className="text-gray-900">{(projectBoard.stages ?? []).length}</strong> stages</span>
                <span><strong className="text-gray-900">
                  {(projectBoard.stages ?? []).reduce((sum: number, s: { leads?: unknown[] }) => sum + (s.leads ?? []).length, 0)}
                </strong> cards</span>
              </div>
              <Button
                size="lg"
                className="mt-6 inline-flex items-center gap-2"
                onClick={() => navigate(ROUTES.ESTIMATES.PROJECT_BOARD(projectId))}
              >
                Open board
              </Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'costs' && (
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Cost allocations
            </div>
            <Button size="sm" onClick={() => setShowAllocation(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Record allocation
            </Button>
          </div>

          {allocations.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <DollarSign className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">No allocations recorded</p>
              <p className="mt-1 text-xs text-gray-500">Record overhead, material, and other costs against the project budget.</p>
              <Button size="sm" className="mt-4" onClick={() => setShowAllocation(true)}>
                <Plus className="h-4 w-4" />
                Record allocation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {a.allocation_type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-800">{a.description}</td>
                      <td className="py-2.5 pr-4 font-medium tabular-nums text-gray-900">{formatCurrency(a.amount, currency)}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-gray-500">{formatShiftDate(a.allocation_date)}</td>
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteAllocation(a.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label="Remove allocation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {allocations.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
              <span className="text-gray-500">Total allocated</span>
              <span className="font-bold tabular-nums text-gray-900">
                {formatCurrency(allocations.reduce((sum, a) => sum + n(a.amount), 0), currency)}
              </span>
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={showAllocation}
        onClose={() => setShowAllocation(false)}
        title="Record cost allocation"
        size="md"
      >
        <div className="space-y-5">
          <PipelineModalHero
            icon={Wallet}
            title="Add cost to project"
            description="Record indirect costs like overhead, materials, or expenses against the project budget."
            tone="indigo"
          />

          <PipelineFormSection title="Allocation details" icon={DollarSign}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={allocType}
                onChange={(e) => setAllocType(e.target.value as AllocationType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ALLOCATION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Description"
              value={allocDesc}
              onChange={(e) => setAllocDesc(e.target.value)}
              placeholder="e.g. Transport, permits, office supplies"
            />
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={allocAmount}
              onChange={(e) => setAllocAmount(Number(e.target.value) || 0)}
            />
            <Input
              label="Date"
              type="date"
              value={allocDate}
              onChange={(e) => setAllocDate(e.target.value)}
            />
          </PipelineFormSection>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAllocation(false)}>Cancel</Button>
            <Button
              onClick={handleRecordAllocation}
              loading={createAllocation.isPending}
              disabled={!allocDesc.trim() || allocAmount <= 0}
            >
              <Plus className="h-4 w-4" />
              Record allocation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}