import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { canAccessModule, getDefaultRoute } from '../../../shared/utils/moduleAccess';
import type { BusinessModuleSlug } from '../../../shared/utils/moduleAccess';

interface ModuleAccessMiddlewareProps {
  module: BusinessModuleSlug | 'account' | 'guide' | 'platform' | 'guide_settings';
}

export function ModuleAccessMiddleware({ module }: ModuleAccessMiddlewareProps) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) {
    return null;
  }

  if (canAccessModule(user, module)) {
    return <Outlet />;
  }

  return <Navigate to={getDefaultRoute(user)} replace state={{ from: location.pathname }} />;
}
