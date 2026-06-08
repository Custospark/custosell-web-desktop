import { Navigate, Outlet } from 'react-router-dom';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { useAppSelector } from '../../store/hooks/useApp';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';

export function PlatformAdminRoute() {
  const user = useAppSelector((state) => state.auth.user);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user?.is_platform_admin) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return <Outlet />;
}
