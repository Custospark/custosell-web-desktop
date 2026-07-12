import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { normalizeDiscoverPath } from './normalizeDiscoverPath';
import {
  StorefrontActionStrip,
  type StorefrontStripTab,
} from './StorefrontActionStrip';

interface ConnectedStorefrontStripProps {
  active?: StorefrontStripTab;
  cartCount?: number;
  ordersCount?: number;
  onOpenCart: () => void;
  onCloseCart?: () => void;
  onOrdersAuthRequired?: () => void;
  onGoShops?: () => void;
  onGoProducts?: () => void;
  className?: string;
}

/**
 * Bottom strip — label stays "Shops". On a shop page, Shops/Products leave the shop.
 */
export function ConnectedStorefrontStrip({
  active,
  cartCount = 0,
  ordersCount = 0,
  onOpenCart,
  onCloseCart,
  onOrdersAuthRequired,
  onGoShops,
  onGoProducts,
  className,
}: ConnectedStorefrontStripProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);

  const path = normalizeDiscoverPath(location.pathname);
  const focus = new URLSearchParams(location.search).get('focus');
  const onShopsList = path === ROUTES.DISCOVER && focus !== 'products';
  const onProductsList = path === ROUTES.DISCOVER && focus === 'products';

  const leaveCartThen = (fn: () => void) => {
    onCloseCart?.();
    fn();
  };

  return (
    <StorefrontActionStrip
      active={active}
      className={className}
      cartCount={cartCount}
      ordersCount={ordersCount}
      homeLabel="Home"
      homeTitle={token ? 'Open your dashboard' : 'Custosell marketing home'}
      shopsLabel="Shops"
      shopsTitle="Browse all shops"
      onHome={() => {
        leaveCartThen(() => {
          if (token) {
            navigate(getDefaultRoute(user));
            return;
          }
          navigate(ROUTES.HOME);
        });
      }}
      onDiscover={() => {
        leaveCartThen(() => {
          if (onProductsList) return;
          if (onGoProducts) {
            onGoProducts();
            return;
          }
          navigate({ pathname: ROUTES.DISCOVER, search: '?focus=products' });
        });
      }}
      onBrowse={() => {
        leaveCartThen(() => {
          if (onShopsList) return;
          if (onGoShops) {
            onGoShops();
            return;
          }
          navigate({ pathname: ROUTES.DISCOVER, search: '?focus=shops' });
        });
      }}
      onCart={onOpenCart}
      onOrders={() => {
        leaveCartThen(() => {
          if (token) {
            navigate(ROUTES.DISCOVER_MY_ORDERS);
            return;
          }
          if (onOrdersAuthRequired) {
            onOrdersAuthRequired();
            return;
          }
          navigate(ROUTES.LOGIN, { state: { from: ROUTES.DISCOVER_MY_ORDERS } });
        });
      }}
    />
  );
}
