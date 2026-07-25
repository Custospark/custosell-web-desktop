import { useAppSelector } from '../../app/store/hooks/useApp';
import { getAccessibleModules } from './moduleAccess';
import { BUSINESS_MODULE_SLUGS } from './moduleAccess';

export function usePlanAccessibleModules(): string[] {
  const user = useAppSelector((s) => s.auth.user);
  const accessible = getAccessibleModules(user);
  const features = user?.business?.subscription?.plan_features;
  if (!features) return accessible;

  return accessible.filter((mod) => {
    if (!(BUSINESS_MODULE_SLUGS as readonly string[]).includes(mod)) return true;
    if (mod === 'settings') return true;
    return features[mod] === true;
  });
}
