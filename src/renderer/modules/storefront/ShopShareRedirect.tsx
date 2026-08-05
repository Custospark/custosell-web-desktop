import { Navigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

/**
 * Public `/@slug` shop links → in-app `/discover/shop/:slug`.
 * Public `/@slug/p/<productSlug>` product links → `/discover/shop/:slug?product=…`
 * (ShopPage opens the product detail modal from `?product=`).
 * Keeps QR / WhatsApp / marketing URLs stable without a root catch-all page.
 */
export default function ShopShareRedirect() {
  const { shopHandle, productSlug } = useParams<{ shopHandle: string; productSlug?: string }>();
  if (!shopHandle?.startsWith('@')) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }
  const slug = shopHandle.slice(1).trim().toLowerCase();
  if (!slug) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }
  if (productSlug?.trim()) {
    const product = productSlug.trim().toLowerCase();
    return <Navigate to={ROUTES.SHOP_PRODUCT(slug, product)} replace />;
  }
  return <Navigate to={ROUTES.SHOP(slug)} replace />;
}
