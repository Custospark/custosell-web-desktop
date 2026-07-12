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
  onOpenCart: () => void;
  onCloseCart?: () => void;
  onOrdersAuthRequired?: () => void;
  className?: string;
}

/**
 * Bottom strip for DiscoverLayout.
 * Closes cart when switching browse modes so the page change is obvious.
 */
export function ConnectedStorefrontStrip({
  active,
  cartCount = 0,
  onOpenCart,
  onCloseCart,
  onOrdersAuthRequired,
  className,
}: ConnectedStorefrontStripProps) {
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);

  const leaveCartThen = (fn: () => void) => {
    onCloseCart?.();
    fn();
  };

  return (
    <StorefrontActionStrip
      active={active}
      className={className}
      cartCount={cartCount}
      homeLabel={token ? 'App' : 'Home'}
      homeTitle={token ? 'Back to Custosell app' : 'Custosell marketing home'}
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
          navigate({ pathname: ROUTES.DISCOVER, search: '?focus=products' });
        });
      }}
      onBrowse={() => {
        leaveCartThen(() => {
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
