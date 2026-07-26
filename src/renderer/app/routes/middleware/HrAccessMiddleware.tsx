import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import {
  getPlanAccessibleModules,
  canAccessHrArea,
  getHrFallbackRoute,
  getHrModuleDefaultRoute,
} from '../../../shared/utils/moduleAccess';
import { useToast } from '../../../app/contexts/useToast';

export function HrAccessMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    const planModules = getPlanAccessibleModules(user);
    if (!planModules.includes('hr')) {
      showToast('warning', '"HR" is not included in your current plan.');
      navigate(getHrFallbackRoute(user), { replace: true, state: { from: location.pathname } });
      return;
    }
    if (!canAccessHrArea(user, location.pathname)) {
      showToast('warning', 'You do not have access to this area.');
      navigate(getHrFallbackRoute(user), { replace: true, state: { from: location.pathname } });
    }
  }, [user, location.pathname, navigate, showToast]);

  if (!user) return null;

  const planModules = getPlanAccessibleModules(user);
  if (!planModules.includes('hr')) return null;
  if (!canAccessHrArea(user, location.pathname)) return null;

  return <Outlet />;
}

export function HrIndexRedirect() {
  const user = useAppSelector((s) => s.auth.user);
  return <Navigate to={getHrModuleDefaultRoute(user)} replace />;
}
