import { useParams, Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useProject,
  useProjectBudgetSummary,
  useProjectProfitability,
} from '../api/useProjectQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { ArrowLeft, CheckSquare, Clock, DollarSign } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading } = useProject(projectId);
  const { data: budget } = useProjectBudgetSummary(projectId);
  const { data: profitability } = useProjectProfitability(projectId);

  if (isLoading || !project) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  const currency = project.currency;
  const tasks = project.tasks ?? [];
  const timesheets = project.timesheet_entries ?? [];
  const allocations = project.cost_allocations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={ROUTES.ESTIMATES.PROJECTS}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
        <p className="mt-1 font-mono text-sm text-gray-500">{project.project_number}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Budget revenue</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(budget?.budget_revenue ?? project.budget_revenue, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Budget cost</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(budget?.budget_cost ?? project.budget_cost, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Actual cost</p>
          <p className={cn('mt-1 text-xl font-bold', (budget?.actual_cost ?? project.actual_cost) > project.budget_cost ? 'text-red-600' : 'text-gray-900')}>
            {formatCurrency(budget?.actual_cost ?? project.actual_cost, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-gray-500">Margin (actual)</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {(budget?.margin_percent_actual ?? profitability?.margin_percent ?? 0).toFixed(1)}%
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{task.name}</span>
                  <span className="capitalize text-gray-500">{task.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
            <Clock className="h-4 w-4" />
            Timesheets
          </div>
          {timesheets.length === 0 ? (
            <p className="text-sm text-gray-500">No time logged.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {timesheets.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{entry.user?.name ?? 'Staff'} · {entry.hours}h</span>
                  <span className="text-gray-500">{formatShiftDate(entry.entry_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
            <DollarSign className="h-4 w-4" />
            Cost allocations
          </div>
          {allocations.length === 0 ? (
            <p className="text-sm text-gray-500">No allocations recorded.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allocations.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{a.description}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(a.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
