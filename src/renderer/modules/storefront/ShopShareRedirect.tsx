import { Navigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

/**
 * Public `/@slug` share links → in-app `/discover/shop/:slug`.
 * Keeps QR / WhatsApp / marketing URLs stable without a root catch-all shop page.
 */
export default function ShopShareRedirect() {
  const { shopHandle } = useParams<{ shopHandle: string }>();
  if (!shopHandle?.startsWith('@')) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }
  const slug = shopHandle.slice(1).trim().toLowerCase();
  if (!slug) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }
  return <Navigate to={ROUTES.SHOP(slug)} replace />;
}
