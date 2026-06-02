import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/shared.paths';
import { useAppSelector } from '../../store/hooks/useApp';

export function AuthMiddlewareRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const hasToken = !!token || !!localStorage.getItem('token');

  if (!hasToken) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
