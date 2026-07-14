import { Navigate, Outlet } from 'react-router-dom';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { useAppSelector } from '../../store/hooks/useApp';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';

export function PlatformAdminRoute() {
  const user = useAppSelector((state) => state.auth.user);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  if (!isInitialized) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <CustosellLoader />
      </div>
    );
  }

  if (!user?.is_platform_admin) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return <Outlet />;
}
