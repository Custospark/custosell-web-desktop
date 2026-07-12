import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { cn } from '../../shared/utils/cn';
import {
  marketplaceGlassHeader,
  useMarketplaceHeroBackground,
} from '../inventory/ui/marketplace/marketplaceTheme';
import { prefetchStorefrontCatalogs } from './api/storefrontQueries';
import { useStorefrontCatalogWarmup } from './cart/useStorefrontCatalogWarmup';
import {
  StorefrontMultiCartProvider,
  useStorefrontMultiCart,
} from './cart/storefrontMultiCartContext';
import { ConnectedStorefrontStrip } from './ui/ConnectedStorefrontStrip';
import { StorefrontCartHub } from './ui/StorefrontCartHub';
import { StorefrontLoginDialog } from './ui/StorefrontLoginDialog';
import {
  DiscoverShellProvider,
  useDiscoverShell,
  type RequestSignInOptions,
} from './ui/discoverShellContext';
import type { StorefrontStripTab } from './ui/StorefrontActionStrip';
import { usePrefersCartSheet } from './ui/usePrefersCartSheet';

function activeTabFromPath(
  pathname: string,
  search: string,
  cartOpen: boolean,
): StorefrontStripTab {
  if (cartOpen) return 'cart';
  if (pathname.startsWith(ROUTES.DISCOVER_MY_ORDERS) || pathname.endsWith('/my-orders')) {
    return 'orders';
  }
  if (pathname.startsWith('/@')) return 'browse';
  const focus = new URLSearchParams(search).get('focus');
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
  const queryClient = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const { header, registerSignInOpener } = useDiscoverShell();
  const { lineCount, cartOpen, setCartOpen, openCart } = useStorefrontMultiCart();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<'orders' | 'general'>('general');
  const pendingLoginSuccess = useRef<(() => void) | null>(null);
  const prefersSheet = usePrefersCartSheet();
  const heroStyle = useMarketplaceHeroBackground();
  const cartDocked = cartOpen && !prefersSheet;

  useEffect(() => {
    void prefetchStorefrontCatalogs(queryClient);
  }, [queryClient]);

  useStorefrontCatalogWarmup();

  const openSignIn = (intent: 'orders' | 'general' = 'general', onSuccess?: () => void) => {
    pendingLoginSuccess.current = onSuccess ?? null;
    setLoginIntent(intent);
    setLoginOpen(true);
  };

  useEffect(() => {
    const opener = (opts?: RequestSignInOptions) => {
      openSignIn(opts?.intent ?? 'general', opts?.onSuccess);
    };
    registerSignInOpener(opener);
    return () => registerSignInOpener(null);
  }, [registerSignInOpener]);

  const active = activeTabFromPath(location.pathname, location.search, cartOpen);
  const fallback = defaultHeader(location.pathname, location.search);
  const title = header?.title ?? fallback.title;
  const subtitle = header?.subtitle ?? fallback.subtitle;

  const cartProps = {
    open: cartOpen,
    onClose: () => setCartOpen(false),
  } as const;

  return (
    <div
      className={cn(
        'flex h-dvh min-h-0 flex-1 overflow-hidden',
        'flex-col lg:flex-row',
        cartDocked ? 'gap-0 sm:gap-3 sm:p-3' : 'gap-0',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          'rounded-none border-0 shadow-none',
          cartDocked
            ? 'sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm'
            : 'm-0 sm:m-3 sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm',
        )}
        style={heroStyle}
      >
        <header className={marketplaceGlassHeader}>
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              to={`${ROUTES.DISCOVER}?focus=shops`}
              className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-teal-600/40"
              aria-label={`${PRODUCT_NAME} Discover`}
              onClick={() => setCartOpen(false)}
            >
              <LogoImage size="sm" />
              <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {PRODUCT_NAME}
              </span>
            </Link>
            <div className="min-w-0 border-l border-slate-300/70 pl-2.5 sm:pl-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">Discover</p>
              <p className="truncate text-base font-semibold text-slate-900">{title}</p>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {header?.actions}
            {token ? (
              <button
                type="button"
                onClick={() => navigate(getDefaultRoute(user))}
                className="rounded-xl border-2 border-slate-300/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openSignIn('general')}
                className="rounded-xl border-2 border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md hover:shadow-teal-200/50"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4">
          <Outlet />
        </main>

        <ConnectedStorefrontStrip
          active={active}
          cartCount={lineCount}
          onOpenCart={() => openCart()}
          onCloseCart={() => setCartOpen(false)}
          onOrdersAuthRequired={() => openSignIn('orders')}
        />
      </div>

      {cartDocked ? (
        <div className="hidden min-h-0 w-[min(100%,22rem)] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex xl:w-[26rem] 2xl:w-[28rem]">
          <StorefrontCartHub
            {...cartProps}
            variant="dock"
            className="rounded-xl border-0 shadow-none"
          />
        </div>
      ) : null}

      {prefersSheet ? <StorefrontCartHub {...cartProps} variant="sheet" /> : null}

      <StorefrontLoginDialog
        isOpen={loginOpen}
        title={loginIntent === 'orders' ? 'Sign in to see your orders' : 'Sign in to Discover'}
        subtitle={
          loginIntent === 'orders'
            ? 'Orders you placed across shops appear here.'
            : 'Use your email and password. Carts stay in this browser.'
        }
        onClose={() => {
          pendingLoginSuccess.current = null;
          setLoginOpen(false);
        }}
        onSuccess={() => {
          setLoginOpen(false);
          const pending = pendingLoginSuccess.current;
          pendingLoginSuccess.current = null;
          pending?.();
          if (loginIntent === 'orders') {
            navigate(ROUTES.DISCOVER_MY_ORDERS);
          }
        }}
      />
    </div>
  );
}

export default function DiscoverLayout() {
  return (
    <DiscoverShellProvider>
      <StorefrontMultiCartProvider>
        <DiscoverShellChrome />
      </StorefrontMultiCartProvider>
    </DiscoverShellProvider>
  );
}
