import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { getPlanAccessibleModules, getDefaultRoute } from '../../../shared/utils/moduleAccess';
import type { BusinessModuleSlug } from '../../../shared/utils/moduleAccess';
import { useToast } from '../../../app/contexts/useToast';

interface ModuleAccessMiddlewareProps {
  module: BusinessModuleSlug | 'account' | 'guide' | 'platform' | 'guide_settings';
}

export function ModuleAccessMiddleware({ module }: ModuleAccessMiddlewareProps) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Personal accounts manage access via personal subscriptions, not plan features
  if (user?.account_type === 'personal') {
    return <Outlet />;
  }

  useEffect(() => {
    if (!user) return;
    const planModules = getPlanAccessibleModules(user);
    if (!planModules.includes(module)) {
      showToast('warning', `"${module}" is not included in your current plan.`);
      navigate(getDefaultRoute(user), { replace: true, state: { from: location.pathname } });
    }
  }, [user, module, location.pathname, navigate, showToast]);

  if (!user) return null;

  const planModules = getPlanAccessibleModules(user);
  if (planModules.includes(module)) {
    return <Outlet />;
  }

  return null;
}
