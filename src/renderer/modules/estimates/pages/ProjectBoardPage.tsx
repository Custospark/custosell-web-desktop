import { Navigate, useParams } from 'react-router-dom';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useProjectBoard } from '../api/useProjectQueries';

/** Legacy route — redirects to full-screen project board workspace. */
export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: board, isLoading } = useProjectBoard(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <CustosellLoader />
      </div>
    );
  }

  if (board?.id) {
    return <Navigate to={ROUTES.ESTIMATES.BOARD(board.code ?? board.id)} replace />;
  }

  return <Navigate to={ROUTES.ESTIMATES.PROJECT_DETAIL(projectId)} replace />;
}
