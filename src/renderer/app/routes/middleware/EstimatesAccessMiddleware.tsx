import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import {
  getPlanAccessibleModules,
  canAccessEstimatesArea,
  getEstimatesFallbackRoute,
} from '../../../shared/utils/moduleAccess';
import { useToast } from '../../../app/contexts/useToast';

export function EstimatesAccessMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    const planModules = getPlanAccessibleModules(user);
    if (!planModules.includes('estimates')) {
      showToast('warning', '"Estimates" is not included in your current plan.');
      navigate(getEstimatesFallbackRoute(user), { replace: true, state: { from: location.pathname } });
      return;
    }
    if (!canAccessEstimatesArea(user, location.pathname, params)) {
      showToast('warning', 'You do not have access to this area.');
      navigate(getEstimatesFallbackRoute(user), { replace: true, state: { from: location.pathname } });
    }
  }, [user, location.pathname, params, navigate, showToast]);

  if (!user) return null;

  const planModules = getPlanAccessibleModules(user);
  if (!planModules.includes('estimates')) return null;
  if (!canAccessEstimatesArea(user, location.pathname, params)) return null;

  return <Outlet />;
}
