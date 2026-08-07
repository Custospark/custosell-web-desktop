import { Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { ROUTES } from '../constants/shared.paths';

/**
 * Personal-account-only gate for income & budget surfaces. Business accounts
 * don't track income (income belongs to personal/individual accounts), and
 * their budgets are handled under Forecasting — so these routes redirect to
 * the expenses overview.
 */
export function PersonalIncomeMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  if (user.account_type !== 'personal') {
    return <Navigate to={ROUTES.EXPENSES.OVERVIEW} replace />;
  }
  return <Outlet />;
}