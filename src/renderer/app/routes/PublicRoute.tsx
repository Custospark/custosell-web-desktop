import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks/useApp';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';

/**
 * Guest marketing + auth pages only.
 * Discover / @shops live outside this gate so logged-in sidebar links are never bounced to dashboard.
 */
export function PublicRoute() {
  const location = useLocation();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (token) {
    return <Navigate to={getDefaultRoute(user)} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
