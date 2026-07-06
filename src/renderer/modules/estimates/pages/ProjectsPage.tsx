import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useProjects } from '../api/useProjectQueries';
import type { Project } from '../api/projectTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { FolderKanban, Search } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-50 text-blue-700',
  on_hold: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: projects, isLoading } = useProjects();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.project_number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const paginated = usePagination(filtered, 15);

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
      render: (item: Project) => <span className="text-sm text-gray-800">{item.name}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Project) => (
        <span className="text-sm text-gray-600">{item.customer?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Project) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[item.status])}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'budget_revenue',
      header: 'Budget revenue',
      render: (item: Project) => (
        <span className="text-sm tabular-nums">{formatCurrency(item.budget_revenue, item.currency)}</span>
      ),
    },
    {
      key: 'budget_cost',
      header: 'Budget cost',
      render: (item: Project) => (
        <span className="text-sm tabular-nums">{formatCurrency(item.budget_cost, item.currency)}</span>
      ),
    },
    {
      key: 'actual_cost',
      header: 'Actual cost',
      render: (item: Project) => {
        const over = item.actual_cost > item.budget_cost && item.budget_cost > 0;
        return (
          <span className={cn('text-sm tabular-nums font-medium', over ? 'text-red-600' : 'text-gray-800')}>
            {formatCurrency(item.actual_cost, item.currency)}
          </span>
        );
      },
    },
    {
      key: 'variance',
      header: 'Cost variance',
      render: (item: Project) => {
        const variance = item.budget_cost - item.actual_cost;
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
          {item.due_date ? formatShiftDate(item.due_date) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        <p className="mt-1 text-sm text-gray-500">Track delivery, budget vs actual, and job costing.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
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

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FolderKanban className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-600">No projects yet. Convert an approved estimate to get started.</p>
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
    </div>
  );
}
