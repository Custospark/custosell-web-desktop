import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import {
  StorefrontActionStrip,
  type StorefrontStripTab,
} from './StorefrontActionStrip';

interface ConnectedStorefrontStripProps {
  active: StorefrontStripTab;
  cartCount?: number;
  onCartScroll?: () => void;
  className?: string;
}

/**
 * Bottom strip for DiscoverLayout.
 * Logged-in users never navigate to `/` (PublicRoute would bounce them to dashboard).
 * Products / Shops stay in the Discover shell; App exits to the POS intentionally.
 */
export function ConnectedStorefrontStrip({
  active,
  cartCount = 0,
  onCartScroll,
  className,
}: ConnectedStorefrontStripProps) {
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);

  const goProducts = () => navigate({ pathname: ROUTES.DISCOVER, search: '?focus=products' });
  const goShops = () => navigate({ pathname: ROUTES.DISCOVER, search: '?focus=shops' });

  return (
    <StorefrontActionStrip
      active={active}
      className={className}
      cartCount={cartCount}
      homeLabel={token ? 'App' : 'Home'}
      homeTitle={token ? 'Back to Custosell app' : 'Custosell marketing home'}
      onHome={() => {
        if (token) {
          navigate(getDefaultRoute(user));
          return;
        }
        navigate(ROUTES.HOME);
      }}
      onDiscover={goProducts}
      onBrowse={goShops}
      onCart={() => {
        if (onCartScroll) {
          onCartScroll();
          return;
        }
        goProducts();
      }}
      onOrders={() => {
        if (token) {
          navigate(ROUTES.DISCOVER_MY_ORDERS);
          return;
        }
        navigate(ROUTES.LOGIN, { state: { from: ROUTES.DISCOVER_MY_ORDERS } });
      }}
    />
  );
}
