import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { ROUTES } from '../constants/shared.paths';

/** Quick Notes is available on personal + business accounts; storefront buyers are redirected. */
export function QuickNotesMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  if (user.account_type === 'storefront_buyer') {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }
  return <Outlet />;
}
