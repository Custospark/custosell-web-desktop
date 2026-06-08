import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from './constants/shared.paths';
import { useAppSelector } from '../store/hooks/useApp';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';

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
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}
