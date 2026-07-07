import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks/useApp';
import {
  canAccessEstimatesArea,
  getEstimatesFallbackRoute,
} from '../../../shared/utils/moduleAccess';

export function EstimatesAccessMiddleware() {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const params = useParams();

  if (!user) {
    return null;
  }

  if (canAccessEstimatesArea(user, location.pathname, params)) {
    return <Outlet />;
  }

  return <Navigate to={getEstimatesFallbackRoute(user)} replace state={{ from: location.pathname }} />;
}
