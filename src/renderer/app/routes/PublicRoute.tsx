import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from './constants/shared.paths';
import { useAppSelector } from '../store/hooks/useApp';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';

export function PublicRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (token) {
    const user = useAppSelector((state) => state.auth.user);
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return <Outlet />;
}
