import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/shared.paths';
import { useAppSelector } from '../../store/hooks/useApp';
import { useProfile } from '../../../shared/api/account/AccountQueries';

export function AuthMiddlewareRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const hasToken = !!token || !!localStorage.getItem('token');

  useProfile();

  if (!hasToken) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
