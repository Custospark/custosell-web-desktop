import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import {
  canAccessHrArea,
  getHrFallbackRoute,
  getHrModuleDefaultRoute,
} from '../../../shared/utils/moduleAccess';

export function HrAccessMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) {
    return null;
  }

  if (canAccessHrArea(user, location.pathname)) {
    return <Outlet />;
  }

  return <Navigate to={getHrFallbackRoute(user)} replace state={{ from: location.pathname }} />;
}

export function HrIndexRedirect() {
  const user = useAppSelector((s) => s.auth.user);
  return <Navigate to={getHrModuleDefaultRoute(user)} replace />;
}
