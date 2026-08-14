import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { getDefaultRoute, isStorefrontBuyer } from '../../../shared/utils/moduleAccess';
import { normalizeDiscoverPath } from './normalizeDiscoverPath';
import {
  StorefrontActionStrip,
  type StorefrontStripTab,
} from './StorefrontActionStrip';

interface ConnectedStorefrontStripProps {
  active?: StorefrontStripTab;
  cartCount?: number;
  wishlistCount?: number;
  ordersCount?: number;
  favoritesCount?: number;
  onOpenCart: () => void;
  onCloseCart?: () => void;
  onOrdersAuthRequired?: () => void;
  onWishlistAuthRequired?: () => void;
  onFavoritesAuthRequired?: () => void;
  onGoShops?: () => void;
  onGoProducts?: () => void;
  className?: string;
}

/**
 * Bottom strip - Wishlist sits left of Orders. On a shop page, Shops/Products leave the shop.
 */
export function ConnectedStorefrontStrip({
  active,
  cartCount = 0,
  wishlistCount = 0,
  ordersCount = 0,
  favoritesCount = 0,
  onOpenCart,
  onCloseCart,
  onOrdersAuthRequired,
  onWishlistAuthRequired,
  onFavoritesAuthRequired,
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
  // Shopping accounts have no dashboard - hide the home/Dashboard tab entirely.
  const shopping = isStorefrontBuyer(user);

  const leaveCartThen = (fn: () => void) => {
    onCloseCart?.();
    fn();
  };

  return (
    <StorefrontActionStrip
      active={active}
      className={className}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      ordersCount={ordersCount}
      favoritesCount={favoritesCount}
      cartPrimary={shopping}
      homeLabel={token ? 'Dashboard' : 'Home'}
      homeTitle={token ? 'Open your dashboard' : 'Custosell marketing home'}
      shopsLabel="Businesses"
      shopsTitle="Browse all businesses"
      onHome={shopping ? undefined : () => {
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
      onWishlist={() => {
        leaveCartThen(() => {
          if (token) {
            navigate(ROUTES.DISCOVER_WISHLIST);
            return;
          }
          if (onWishlistAuthRequired) {
            onWishlistAuthRequired();
            return;
          }
          navigate(ROUTES.LOGIN, { state: { from: ROUTES.DISCOVER_WISHLIST } });
        });
      }}
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
      onFavorites={() => {
        leaveCartThen(() => {
          if (token) {
            navigate(ROUTES.DISCOVER_FAVORITES);
            return;
          }
          if (onFavoritesAuthRequired) {
            onFavoritesAuthRequired();
            return;
          }
          navigate(ROUTES.LOGIN, { state: { from: ROUTES.DISCOVER_FAVORITES } });
        });
      }}
    />
  );
}
