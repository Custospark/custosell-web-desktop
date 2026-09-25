import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { getPlanAccessibleModules, getDefaultRoute } from '../../../shared/utils/moduleAccess';
import type { BusinessModuleSlug } from '../../../shared/utils/moduleAccess';
import { getHiddenStoreApps } from '../../../shared/components/layout/storeAppVisibility';
import { getNextVisibleAppRoute } from '../../../shared/components/layout/moduleLauncherCatalog';
import { useToast } from '../../../app/contexts/useToast';

interface ModuleAccessMiddlewareProps {
  module: BusinessModuleSlug | 'account' | 'guide' | 'discover' | 'platform' | 'guide_settings';
}

export function ModuleAccessMiddleware({ module }: ModuleAccessMiddlewareProps) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hidden = useMemo(() => getHiddenStoreApps(user), [user]);
  // Shoppers without a business always pass - hiding Online Shopping must
  // never lock them out of the shop itself.
  const visibilityApplies = Boolean(user?.business_id);

  useEffect(() => {
    if (!user) return;
    const planModules = getPlanAccessibleModules(user);
    if (!planModules.includes(module)) {
      showToast('warning', `"${module}" is not included in your current plan.`);
      navigate(getDefaultRoute(user), { replace: true, state: { from: location.pathname } });
      return;
    }
    if (visibilityApplies && hidden.has(module)) {
      const next = getNextVisibleAppRoute(user, hidden, module);
      if (next !== location.pathname) {
        showToast('info', 'That app is hidden - opened the next available one instead.');
        navigate(next, { replace: true });
      }
    }
  }, [user, module, hidden, visibilityApplies, location.pathname, navigate, showToast]);

  if (!user) return <Outlet />;
  const planModules = getPlanAccessibleModules(user);
  if (!planModules.includes(module)) {
    return null;
  }
  if (visibilityApplies && hidden.has(module)) {
    const next = getNextVisibleAppRoute(user, hidden, module);
    if (next !== location.pathname) {
      return null;
    }
  }

  return <Outlet />;
}
