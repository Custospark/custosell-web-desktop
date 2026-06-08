import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';

/** Sends authenticated users to their highest-priority allowed module landing route. */
export function ModuleLandingRedirect() {
  const user = useAppSelector((s) => s.auth.user);
  return <Navigate to={getDefaultRoute(user)} replace />;
}
