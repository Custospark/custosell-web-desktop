import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/shared.paths';
import { useAppSelector } from '../../store/hooks/useApp';
import { useProfile } from '../../../shared/api/account/AccountQueries';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';

export function AuthMiddlewareRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  useProfile();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
