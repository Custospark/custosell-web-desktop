import { useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ConnectedStorefrontStrip } from './ui/ConnectedStorefrontStrip';
import {
  DiscoverShellProvider,
  useDiscoverShell,
} from './ui/discoverShellContext';
import type { StorefrontStripTab } from './ui/StorefrontActionStrip';

function activeTabFromPath(pathname: string, search: string): StorefrontStripTab {
  if (pathname.startsWith(ROUTES.DISCOVER_MY_ORDERS) || pathname.endsWith('/my-orders')) {
    return 'orders';
  }
  if (pathname.startsWith('/@')) return 'cart';
  const focus = new URLSearchParams(search).get('focus');
  if (focus === 'shops') return 'browse';
  if (focus === 'products') return 'discover';
  return 'browse';
}

function defaultHeader(pathname: string, search: string): { title: string; subtitle: string } {
  if (pathname.startsWith(ROUTES.DISCOVER_MY_ORDERS) || pathname.endsWith('/my-orders')) {
    return { title: 'My Orders', subtitle: 'Orders you placed — each shop fulfills its own' };
  }
  if (pathname.startsWith('/@')) {
    return { title: 'Shop', subtitle: 'Order from this business only' };
  }
  const focus = new URLSearchParams(search).get('focus');
  if (focus === 'products') {
    return { title: 'Products', subtitle: 'Browse listed products across shops' };
  }
  return { title: 'Shops', subtitle: 'Browse businesses with a public storefront' };
}

function DiscoverShellChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const { header, cartCount } = useDiscoverShell();

  const active = activeTabFromPath(location.pathname, location.search);
  const fallback = defaultHeader(location.pathname, location.search);
  const title = header?.title ?? fallback.title;
  const subtitle = header?.subtitle ?? fallback.subtitle;

  const onCartScroll = useMemo(() => {
    if (!location.pathname.startsWith('/@')) return undefined;
    return () => {
      document.getElementById('storefront-cart')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }, [location.pathname]);

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              to={`${ROUTES.DISCOVER}?focus=shops`}
              className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
              aria-label={`${PRODUCT_NAME} Discover`}
            >
              <LogoImage size="sm" />
              <span className="hidden text-sm font-bold text-teal-800 sm:inline">{PRODUCT_NAME}</span>
            </Link>
            <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{title}</p>
              {subtitle ? (
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {header?.actions}
            {token ? (
              <button
                type="button"
                onClick={() => navigate(getDefaultRoute(user))}
                className="hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
              >
                Open app
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
          <Outlet />
        </div>
      </main>

      <div className="sticky bottom-0 z-40 shrink-0 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <ConnectedStorefrontStrip
          active={active}
          cartCount={cartCount}
          onCartScroll={onCartScroll}
        />
      </div>
    </div>
  );
}

/**
 * Single consistent storefront chrome: sticky header + sticky strip.
 * Discover, My Orders, and /@shop all render inside this shell.
 */
export default function DiscoverLayout() {
  return (
    <DiscoverShellProvider>
      <DiscoverShellChrome />
    </DiscoverShellProvider>
  );
}
