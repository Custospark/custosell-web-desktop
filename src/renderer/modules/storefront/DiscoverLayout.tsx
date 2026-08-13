import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import { useMarketplaceHeroBackground } from '../inventory/ui/marketplace/marketplaceTheme';
import { prefetchStorefrontCatalogs, useMyStorefrontOrdersList } from './api/storefrontQueries';
import { useWishlistCount } from './api/wishlistQueries';
import { useFavoritesCount } from './api/favoriteQueries';
import { useStorefrontCatalogWarmup } from './cart/useStorefrontCatalogWarmup';
import { useStorefrontMultiCart } from './cart/storefrontMultiCartContext';
import { useOrderStatusChime } from '../../app/sound/useOrderStatusChime';
import { ConnectedStorefrontStrip } from './ui/ConnectedStorefrontStrip';
import { StorefrontCartHub } from './ui/StorefrontCartHub';
import { StorefrontLoginDialog } from './ui/StorefrontLoginDialog';
import { DiscoverAccountMenu } from './ui/DiscoverAccountMenu';
import {
  DiscoverShellProvider,
  useDiscoverShell,
  type RequestSignInOptions,
} from './ui/discoverShellContext';
import type { StorefrontStripTab } from './ui/StorefrontActionStrip';
import { usePrefersCartSheet } from './ui/usePrefersCartSheet';
import { normalizeDiscoverPath } from './ui/normalizeDiscoverPath';

function activeTabFromPath(
  pathname: string,
  search: string,
  cartOpen: boolean,
): StorefrontStripTab | undefined {
  if (cartOpen) return 'cart';
  const path = normalizeDiscoverPath(pathname);
  if (path === ROUTES.DISCOVER_MY_ORDERS || path.endsWith('/my-orders')) {
    return 'orders';
  }
  if (path === ROUTES.DISCOVER_WISHLIST || path.endsWith('/wishlist')) {
    return 'wishlist';
  }
  if (path === ROUTES.DISCOVER_FAVORITES) {
    return 'favorites';
  }
  if (path.startsWith(`${ROUTES.DISCOVER}/shop/`)) return undefined;
  const focus = new URLSearchParams(search).get('focus');
  if (focus === 'products') return 'discover';
  return 'browse';
}

function defaultHeader(pathname: string, search: string): { title: string; subtitle: string } {
  const path = normalizeDiscoverPath(pathname);
  if (path === ROUTES.DISCOVER_MY_ORDERS || path.endsWith('/my-orders')) {
    return { title: 'My Orders', subtitle: 'Orders you placed — each business fulfills its own' };
  }
  if (path === ROUTES.DISCOVER_WISHLIST || path.endsWith('/wishlist')) {
    return { title: 'Wishlist', subtitle: 'Items you saved to buy later' };
  }
  if (path === ROUTES.DISCOVER_FAVORITES) {
    return { title: 'Favorite Businesses', subtitle: 'Shops you starred to browse again' };
  }
  if (path.startsWith(`${ROUTES.DISCOVER}/shop/`)) {
    return { title: 'Shop', subtitle: 'Order from this business only' };
  }
  const focus = new URLSearchParams(search).get('focus');
  if (focus === 'products') {
    return { title: 'Products & Services', subtitle: 'Browse listed products and services across all businesses' };
  }
  return { title: 'Businesses', subtitle: 'Browse businesses with a public storefront' };
}

function DiscoverShellChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const { header, registerSignInOpener } = useDiscoverShell();
  const { lineCount, cartOpen, setCartOpen, openCart } = useStorefrontMultiCart();
  const { data: wishlistCount = 0 } = useWishlistCount(Boolean(token));
  const { data: favoritesCount = 0 } = useFavoritesCount(Boolean(token));
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<'orders' | 'general'>('general');
  const pendingLoginSuccess = useRef<(() => void) | null>(null);
  const prefersSheet = usePrefersCartSheet();
  const heroStyle = useMarketplaceHeroBackground();
  const cartDocked = cartOpen && !prefersSheet;

  const path = normalizeDiscoverPath(location.pathname);
  // Poll the buyer's orders list here (shared query key with My Orders page) so
  // status changes alert + the open-orders badge stay live on every Discover tab.
  const { data: myOrders } = useMyStorefrontOrdersList(Boolean(token), { poll: true });
  const myOrdersList = myOrders?.orders ?? [];
  const ordersCount = myOrdersList.filter((o) => o.status === 'open').length;
  useOrderStatusChime(myOrdersList);

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

  const active = activeTabFromPath(path, location.search, cartOpen);
  const fallback = defaultHeader(path, location.search);
  const title = header?.title ?? fallback.title;
  const subtitle = header?.subtitle ?? fallback.subtitle;

  const cartProps = {
    open: cartOpen,
    onClose: () => setCartOpen(false),
  } as const;

  const goDiscover = (focus: 'shops' | 'products') => {
    setCartOpen(false);
    navigate({ pathname: ROUTES.DISCOVER, search: `?focus=${focus}` });
  };

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
        <header
          className={cn(
            // Mobile: inset card with small radius
            'relative z-40 mx-2 mt-2 flex shrink-0 flex-col gap-2 sm:rounded-lg border border-emerald-200/80 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm',
            // Large: original full-bleed glass header
            'sm:mx-0 sm:mt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-none sm:border-0 sm:border-b sm:border-emerald-200/80 sm:px-4 sm:py-3 sm:shadow-none',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              to={`${ROUTES.DISCOVER}?focus=shops`}
              className="flex shrink-0 items-center gap-1.5 sm:rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-600/40 sm:gap-2.5"
              aria-label={`${PRODUCT_NAME} Order Online`}
              onClick={() => setCartOpen(false)}
            >
              <LogoImage size="sm" />
              <span className="hidden text-base font-bold tracking-tight text-slate-900 min-[380px]:inline sm:inline sm:text-lg">
                {PRODUCT_NAME}
              </span>
            </Link>
            <div className="min-w-0 flex-1 border-l border-slate-300/70 pl-2 sm:pl-3">
              <p className="hidden text-[11px] font-semibold uppercase tracking-wide text-indigo-800 sm:block">
                Order Online
              </p>
              <p className="text-sm font-semibold leading-snug text-slate-900 sm:text-base">{title}</p>
              {subtitle ? (
                <p className="mt-0.5 hidden line-clamp-1 text-xs text-slate-600 sm:block">{subtitle}</p>
              ) : null}
            </div>
            {token && user ? (
              <DiscoverAccountMenu user={user} compact className="sm:hidden" />
            ) : (
              <button
                type="button"
                onClick={() => openSignIn('general')}
                className={cn(
                  'shrink-0 font-semibold text-indigo-900 shadow-sm transition sm:hidden',
                  'rounded-md border border-indigo-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-2 py-1.5 text-[11px]',
                )}
              >
                Account
              </button>
            )}
          </div>

          {header?.actions ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 sm:hidden">
              {header.actions}
            </div>
          ) : null}

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {header?.actions}
            {token && user ? (
              <DiscoverAccountMenu user={user} />
            ) : (
              <button
                type="button"
                onClick={() => openSignIn('general')}
                className="rounded-xl border-2 border-indigo-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-200/50"
              >
                Account
              </button>
            )}
          </div>
        </header>

        {/* Never key Outlet — remounting Outlet breaks child route rendering in RR7. */}
        <main
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4"
          data-scroll-container
        >
          <Outlet />
        </main>

        <ConnectedStorefrontStrip
          active={active}
          cartCount={lineCount}
          wishlistCount={wishlistCount}
          ordersCount={ordersCount}
          favoritesCount={favoritesCount}
          onOpenCart={() => openCart()}
          onCloseCart={() => setCartOpen(false)}
          onOrdersAuthRequired={() => openSignIn('orders')}
          onWishlistAuthRequired={() => openSignIn('general')}
          onFavoritesAuthRequired={() => openSignIn('general')}
          onGoShops={() => goDiscover('shops')}
          onGoProducts={() => goDiscover('products')}
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
        title={
          loginIntent === 'orders'
            ? 'Create an account to see your orders'
            : 'Create an account to continue'
        }
        subtitle={
          loginIntent === 'orders'
            ? 'Orders you place across businesses appear here. No business setup needed.'
            : 'Shop as a customer — no business setup. Carts stay in this browser.'
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
      <DiscoverShellChrome />
    </DiscoverShellProvider>
  );
}
