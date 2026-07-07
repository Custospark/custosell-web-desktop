import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useMyProjects } from '../api/useProjectQueries';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { FolderKanban } from 'lucide-react';

export default function MyProjectsPage() {
  const { data: projects, isLoading } = useMyProjects();

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const list = projects ?? [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-12 w-12" />}
        title="No assigned projects"
        description="When you are invited to a project board, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">My projects</h2>
        <p className="mt-1 text-sm text-gray-500">Projects you have been invited to collaborate on.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((project) => (
          <Link key={project.id} to={ROUTES.ESTIMATES.PROJECT_DETAIL(project.id)} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              <p className="mt-1 text-sm text-gray-500 capitalize">{project.status.replace('_', ' ')}</p>
              {project.due_date && (
                <p className="mt-2 text-xs text-gray-400">Due {formatShiftDate(project.due_date)}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
