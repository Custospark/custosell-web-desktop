import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import BoardKanbanPage from '../../pipeline/pages/BoardKanbanPage';

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Link
        to={ROUTES.ESTIMATES.PROJECT_DETAIL(projectId)}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>
      <div className="min-h-0 flex-1">
        <BoardKanbanPage projectId={projectId} embeddedInEstimates />
      </div>
    </div>
  );
}
