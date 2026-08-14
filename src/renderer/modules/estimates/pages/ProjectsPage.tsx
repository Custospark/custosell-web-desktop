import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import RowActionsMenu, { type RowActionItem } from '../../../shared/components/tables/RowActionsMenu';
import { TypeToConfirmModal } from '../../../shared/components/modals/TypeToConfirmModal';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useProjects, useDeleteProject } from '../api/useProjectQueries';
import type { Project } from '../api/projectTypes';
import { BudgetProgressBar } from '../ui/estimatesShared';
import ProjectFormModal from '../ui/ProjectFormModal';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { FolderKanban, Search, Target, TrendingUp, DollarSign, AlertTriangle, Eye, Pencil, Trash2 } from 'lucide-react';

const n = (v: unknown): number => Number(v) || 0;

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  rose: { border: 'border-rose-500', shadow: 'hover:shadow-rose-500/20', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', glow: 'bg-rose-500/10', hoverBg: 'group-hover:bg-rose-200' },
};

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-50 text-blue-700',
  on_hold: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.project_number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const paginated = usePagination(filtered, 15);

  const stats = useMemo(() => {
    const list = projects ?? [];
    const active = list.filter((p) => p.status === 'active').length;
    const totalBudget = list.reduce((sum, p) => sum + n(p.budget_cost), 0);
    const totalActual = list.reduce((sum, p) => sum + n(p.actual_cost), 0);
    const overBudget = list.filter((p) => n(p.actual_cost) > n(p.budget_cost) && n(p.budget_cost) > 0).length;
    return { total: list.length, active, totalBudget, totalActual, overBudget };
  }, [projects]);

  const columns = [
    {
      key: 'project_number',
      header: 'Project #',
      render: (item: Project) => (
        <Link to={ROUTES.ESTIMATES.PROJECT_DETAIL(item.id)} className="font-mono text-sm font-semibold text-blue-700 hover:underline">
          {item.project_number}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (item: Project) => <span className="text-sm font-medium text-gray-800">{item.name}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Project) => (
        <span className={cn('text-sm', item.customer?.name ? 'text-gray-600' : 'text-gray-400 italic')}>
          {item.customer?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Project) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap', STATUS_STYLES[item.status])}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'Budget vs actual',
      render: (item: Project) => (
        <div className="min-w-[180px]">
          <BudgetProgressBar
            label=""
            actual={n(item.actual_cost)}
            budget={n(item.budget_cost)}
            formatValue={(n) => formatCurrency(n, item.currency)}
          />
        </div>
      ),
    },
    {
      key: 'variance',
      header: 'Cost variance',
      render: (item: Project) => {
        const variance = n(item.budget_cost) - n(item.actual_cost);
        return (
          <span className={cn('text-sm tabular-nums font-medium', variance < 0 ? 'text-red-600' : 'text-emerald-700')}>
            {formatCurrency(variance, item.currency)}
          </span>
        );
      },
    },
    {
      key: 'due_date',
      header: 'Due',
      render: (item: Project) => (
        <span className="text-sm tabular-nums text-gray-600">
          {item.due_date ? formatShiftDate(item.due_date) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: Project) => {
        const actions: RowActionItem[] = [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4 text-gray-400" />,
            onClick: () => navigate(ROUTES.ESTIMATES.PROJECT_DETAIL(item.id)),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil className="h-4 w-4 text-gray-400" />,
            onClick: () => setEditingProject(item),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4 text-red-500" />,
            onClick: () => setDeleteTarget(item),
            dividerBefore: true,
            danger: true,
          },
        ];
        return (
          <div className="flex items-center justify-end">
            <RowActionsMenu items={actions} ariaLabel={`Project ${item.project_number} actions`} />
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  const statCards = [
    { label: 'Total projects', value: String(stats.total), icon: FolderKanban, color: 'blue' as const, badge: 'All' },
    { label: 'Active', value: String(stats.active), icon: TrendingUp, color: 'green' as const, badge: 'In progress' },
    { label: 'Budget cost', value: formatCurrency(stats.totalBudget), icon: Target, color: 'purple' as const, badge: 'Budgeted' },
    { label: 'Actual cost', value: formatCurrency(stats.totalActual), icon: DollarSign, color: 'amber' as const, badge: 'Spent' },
    { label: 'Over budget', value: String(stats.overBudget), icon: AlertTriangle, color: 'rose' as const, badge: 'At risk' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        <p className="mt-1 text-sm text-gray-500">Track delivery, budget vs actual, and job costing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          return (
            <div
              key={card.label}
              className={`group relative flex min-h-[120px] cursor-default flex-col justify-center rounded-xl border-2 bg-gradient-to-br from-white to-white p-5 transition-all duration-300 hover:-translate-y-0.5 ${s.border} ${s.shadow}`}
            >
              <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 overflow-hidden rounded-full blur-2xl ${s.glow}`} />
              <div className="relative mb-3 flex items-start justify-between gap-2">
                <div className={`shrink-0 rounded-xl p-3 transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{card.badge}</span>
              </div>
              <p className="relative mb-0.5 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">{card.value}</p>
              <p className="relative whitespace-normal break-words text-sm font-medium leading-snug text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FolderKanban className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No projects yet</p>
            <p className="mt-1 text-xs text-gray-500">Convert an approved estimate to get started with job costing.</p>
          </div>
        ) : (
          <>
            <Table columns={columns} data={paginated.data} rowKey={(item) => item.id} />
            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </>
        )}
      </Card>

      <ProjectFormModal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
      />

      <TypeToConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete project ${deleteTarget.project_number}` : 'Delete project'}
        subtitle={deleteTarget?.name}
        keyword={deleteTarget?.project_number ?? ''}
        keywordLabel="Project number"
        message="Deleting this project permanently removes it and its tasks, timesheets, and cost allocations. This cannot be undone."
        isDeleting={deleteProject.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProject.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}