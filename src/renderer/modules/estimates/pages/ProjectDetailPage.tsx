import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import {
  canManageProjectTeam,
  canViewProjectCosting,
  isLimitedEstimatesUser,
  canAccessModule,
} from '../../../shared/utils/moduleAccess';
import {
  useProject,
  useUpdateProject,
  useProjectBudgetSummary,
  useProjectProfitability,
  useProjectBoard,
  useProjectMembers,
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
} from '../api/useProjectQueries';
import type { ProjectStatus } from '../api/projectTypes';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import DocumentsPanel from '../../documents/ui/DocumentsPanel';
import {
  ProjectAlerts,
  ProjectStatsGrid,
  ProjectBudgetCard,
  ProjectOverviewTab,
  ProjectTasksTab,
  ProjectTimesheetsTab,
  ProjectBoardTab,
} from '../ui/ProjectDetailPanels';
import AllocationTab from '../ui/ProjectAllocationTab';
import { cn } from '../../../shared/utils/cn';
import {
  ArrowLeft, CheckSquare, Clock, DollarSign, FolderKanban, Files,
} from 'lucide-react';

type ProjectTab = 'overview' | 'tasks' | 'timesheets' | 'costs' | 'board' | 'documents';

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const n = (v: unknown): number => Number(v) || 0;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const canCosting = canViewProjectCosting(user);
  const canDocuments = canAccessModule(user, 'documents');
  const limitedUser = isLimitedEstimatesUser(user);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');

  const { data: project, isLoading } = useProject(projectId);
  const { data: redirectBoard, isSuccess: boardResolved } = useProjectBoard(limitedUser ? projectId : 0);
  const { data: budget } = useProjectBudgetSummary(projectId, canCosting);
  const { data: profitability } = useProjectProfitability(projectId, canCosting);
  const { data: members = [] } = useProjectMembers(projectId);
  const addMember = useAddProjectMember(projectId);
  const updateMember = useUpdateProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const updateProject = useUpdateProject();
  const { data: projectBoard } = useProjectBoard(activeTab === 'board' ? projectId : 0);

  useEffect(() => {
    if (limitedUser && boardResolved && redirectBoard?.id) {
      navigate(ROUTES.ESTIMATES.BOARD(redirectBoard.code ?? redirectBoard.id), { replace: true });
    }
  }, [limitedUser, boardResolved, redirectBoard?.id, redirectBoard?.code, navigate]);

  if (isLoading || !project) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const teamMembers = members.length ? members : (project.members ?? []);
  const canManageTeam = canManageProjectTeam(user, teamMembers, project.created_by);

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

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: FolderKanban },
    { key: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
    ...(canCosting ? [{ key: 'timesheets' as const, label: 'Timesheets', icon: Clock }] : []),
    { key: 'board' as const, label: 'Board', icon: FolderKanban },
    ...(canDocuments ? [{ key: 'documents' as const, label: 'Documents', icon: Files }] : []),
    ...(canCosting ? [{ key: 'costs' as const, label: 'Cost allocations', icon: DollarSign }] : []),
  ];

  const memberActions = {
    pending: addMember.isPending || updateMember.isPending || removeMember.isPending,
    canManage: canManageTeam,
    onAdd: (payload: { user_id: number; role: 'viewer' | 'contributor' | 'manager'; send_notification?: boolean }) => addMember.mutate(payload),
    onRoleChange: (userId: number, role: 'viewer' | 'contributor' | 'manager') => updateMember.mutate({ userId, role }),
    onRemove: (userId: number) => removeMember.mutate(userId),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={limitedUser ? ROUTES.ESTIMATES.BOARDS : ROUTES.ESTIMATES.PROJECTS}
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
        {canManageTeam && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
              <select
                value={project.status}
                onChange={(e) => {
                  void updateProject.mutateAsync({
                    id: projectId,
                    payload: { status: e.target.value as ProjectStatus },
                  });
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                disabled={updateProject.isPending}
              >
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-600">Due date</span>
              <input
                type="date"
                value={project.due_date?.slice(0, 10) ?? ''}
                onChange={(e) => {
                  void updateProject.mutateAsync({
                    id: projectId,
                    payload: { due_date: e.target.value || null },
                  });
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                disabled={updateProject.isPending}
              />
            </label>
          </div>
        )}
        {project.description && (
          <p className="mt-2 max-w-2xl text-sm text-gray-600">{project.description}</p>
        )}
      </div>

      <ProjectAlerts
        canCosting={canCosting}
        isOverBudget={isOverBudget}
        isMarginNegative={isMarginNegative}
        actualCost={actualCost}
        budgetCost={budgetCost}
        currency={currency}
        marginActual={marginActual}
        marginBudget={marginBudget}
      />

      <ProjectStatsGrid
        canCosting={canCosting}
        budgetRevenue={budgetRevenue}
        budgetCost={budgetCost}
        actualCost={actualCost}
        actualRevenue={actualRevenue}
        marginBudget={marginBudget}
        marginActual={marginActual}
        isOverBudget={isOverBudget}
        currency={currency}
      />

      <ProjectBudgetCard
        canCosting={canCosting}
        actualCost={actualCost}
        budgetCost={budgetCost}
        actualRevenue={actualRevenue}
        budgetRevenue={budgetRevenue}
        currency={currency}
      />

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
        <ProjectOverviewTab
          project={project}
          canCosting={canCosting}
          currency={currency}
          members={teamMembers}
          profitability={profitability}
          memberActions={memberActions}
        />
      )}

      {activeTab === 'tasks' && <ProjectTasksTab tasks={tasks} currency={currency} />}

      {activeTab === 'timesheets' && <ProjectTimesheetsTab entries={timesheets} currency={currency} />}

      {activeTab === 'board' && <ProjectBoardTab board={projectBoard} />}

      {activeTab === 'documents' && (
        <DocumentsPanel projectId={projectId} title="Project documents" compact />
      )}

      {activeTab === 'costs' && <AllocationTab projectId={projectId} allocations={allocations} currency={currency} />}
    </div>
  );
}