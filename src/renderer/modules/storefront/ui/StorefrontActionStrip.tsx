import type { ReactNode } from 'react';
import { ArrowLeftRight, Compass, Heart, Home, LayoutList, ShoppingCart } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export type StorefrontStripTab = 'home' | 'discover' | 'browse' | 'cart' | 'wishlist' | 'orders';

interface StorefrontActionStripProps {
  active?: StorefrontStripTab;
  onHome?: () => void;
  homeLabel?: string;
  homeTitle?: string;
  shopsLabel?: string;
  shopsTitle?: string;
  onDiscover: () => void;
  onBrowse: () => void;
  onCart: () => void;
  onWishlist: () => void;
  onOrders: () => void;
  cartCount?: number;
  wishlistCount?: number;
  ordersCount?: number;
  className?: string;
}

/**
 * Bottom nav — mobile: equal-width chips in a bordered card; sm+: original full-bleed strip.
 * Wishlist sits immediately left of Orders.
 */
export function StorefrontActionStrip({
  active,
  onHome,
  homeLabel = 'Home',
  homeTitle = 'Home',
  shopsLabel = 'Businesses',
  shopsTitle = 'Browse all businesses',
  onDiscover,
  onBrowse,
  onCart,
  onWishlist,
  onOrders,
  cartCount = 0,
  wishlistCount = 0,
  ordersCount = 0,
  className,
}: StorefrontActionStripProps) {
  const shopsActive = active === 'browse';

  return (
    <nav
      className={cn(
        'relative z-[10001] mx-2 mb-2 flex shrink-0 items-stretch gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md',
        'sm:mx-0 sm:mb-0 sm:items-center sm:justify-center sm:gap-3 sm:overflow-x-auto sm:overscroll-x-contain sm:rounded-none sm:border-0 sm:border-t sm:border-slate-200/80 sm:bg-white/95 sm:p-0 sm:px-3 sm:py-2.5 sm:shadow-none sm:backdrop-blur-sm',
        className,
      )}
      aria-label="Storefront navigation"
    >
      {onHome ? (
        <StripButton
          active={active === 'home'}
          onClick={onHome}
          title={homeTitle}
          tone="slate"
          icon={<Home className="h-4 w-4 shrink-0 text-slate-600 sm:h-4 sm:w-4" />}
          label={homeLabel}
          shortLabel="Home"
        />
      ) : null}
      <StripButton
        active={active === 'discover'}
        onClick={onDiscover}
        title="Browse products and services across all businesses"
        tone="amber"
        icon={<Compass className="h-4 w-4 shrink-0 text-amber-700 sm:h-4 sm:w-4" />}
        label="Products & Services"
        shortLabel="Products"
      />
      <StripButton
        active={shopsActive}
        onClick={onBrowse}
        title={shopsTitle}
        tone="teal"
        icon={<ArrowLeftRight className="h-4 w-4 shrink-0 text-teal-600 sm:h-4 sm:w-4" />}
        label={shopsLabel}
        shortLabel="Businesses"
      />
      <StripButton
        active={active === 'cart'}
        onClick={onCart}
        title={cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
        tone="emerald"
        icon={(
          <span className="relative inline-flex shrink-0">
            <ShoppingCart className="h-4 w-4 text-emerald-600 sm:h-4 sm:w-4" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white sm:h-4 sm:min-w-4 sm:text-[9px] sm:ring-2">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </span>
        )}
        label="Cart"
        shortLabel="Cart"
      />
      <StripButton
        active={active === 'wishlist'}
        onClick={onWishlist}
        title={wishlistCount > 0 ? `Wishlist (${wishlistCount})` : 'Wishlist'}
        tone="rose"
        icon={(
          <span className="relative inline-flex shrink-0">
            <Heart
              className={cn(
                'h-4 w-4 text-rose-600 sm:h-4 sm:w-4',
                wishlistCount > 0 && 'fill-rose-500',
              )}
            />
            {wishlistCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white sm:h-4 sm:min-w-4 sm:text-[9px] sm:ring-2">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            ) : null}
          </span>
        )}
        label="Wishlist"
        shortLabel="Wishlist"
      />
      <StripButton
        active={active === 'orders'}
        onClick={onOrders}
        title={ordersCount > 0 ? `My orders (${ordersCount})` : 'My orders'}
        tone="blue"
        icon={(
          <span className="relative inline-flex shrink-0">
            <LayoutList className="h-4 w-4 text-blue-600 sm:h-4 sm:w-4" />
            {ordersCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white sm:h-4 sm:min-w-4 sm:text-[9px] sm:ring-2">
                {ordersCount > 99 ? '99+' : ordersCount}
              </span>
            ) : null}
          </span>
        )}
        label="Orders"
        shortLabel="Orders"
      />
    </nav>
  );
}

type Tone = 'slate' | 'amber' | 'teal' | 'emerald' | 'rose' | 'blue';

function StripButton({
  active,
  onClick,
  title,
  tone,
  icon,
  label,
  shortLabel,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  tone: Tone;
  icon: ReactNode;
  label: string;
  shortLabel: string;
}) {
  const tones: Record<Tone, string> = {
    slate: active
      ? 'border-slate-500 bg-slate-100 text-slate-950 max-sm:ring-1 max-sm:ring-slate-300/50 sm:ring-2 sm:ring-slate-300/60 sm:shadow-md'
      : 'border-slate-200 bg-gradient-to-b from-slate-50 to-white text-slate-800 sm:border-slate-300/90 sm:bg-gradient-to-r sm:from-slate-50 sm:via-white sm:to-slate-50 sm:hover:border-slate-400 sm:hover:shadow-md sm:hover:shadow-slate-200/60',
    amber: active
      ? 'border-amber-500 bg-amber-100 text-amber-950 max-sm:ring-1 max-sm:ring-amber-300/50 sm:ring-2 sm:ring-amber-300/60 sm:shadow-md'
      : 'border-amber-200 bg-gradient-to-b from-amber-50 to-white text-amber-950 sm:border-amber-300/90 sm:bg-gradient-to-r sm:from-amber-50 sm:via-white sm:to-orange-50 sm:hover:border-amber-400 sm:hover:from-amber-100 sm:hover:to-orange-100 sm:hover:shadow-md sm:hover:shadow-amber-200/50',
    teal: active
      ? 'border-teal-500 bg-teal-100 text-teal-950 max-sm:ring-1 max-sm:ring-teal-300/50 sm:ring-2 sm:ring-teal-300/60 sm:shadow-md'
      : 'border-teal-200 bg-gradient-to-b from-teal-50 to-white text-teal-900 sm:border-teal-300/90 sm:bg-gradient-to-r sm:from-teal-50 sm:via-white sm:to-cyan-50 sm:hover:border-teal-400 sm:hover:from-teal-100 sm:hover:to-cyan-100 sm:hover:shadow-md sm:hover:shadow-teal-200/50',
    emerald: active
      ? 'border-emerald-500 bg-emerald-100 text-emerald-950 max-sm:ring-1 max-sm:ring-emerald-300/50 sm:ring-2 sm:ring-emerald-300/60 sm:shadow-md'
      : 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-white text-emerald-900 sm:border-emerald-300/90 sm:bg-gradient-to-r sm:from-emerald-50 sm:via-white sm:to-teal-50 sm:hover:border-emerald-400 sm:hover:from-emerald-100 sm:hover:to-teal-100 sm:hover:shadow-md sm:hover:shadow-emerald-200/50',
    rose: active
      ? 'border-rose-500 bg-rose-100 text-rose-950 max-sm:ring-1 max-sm:ring-rose-300/50 sm:ring-2 sm:ring-rose-300/60 sm:shadow-md'
      : 'border-rose-200 bg-gradient-to-b from-rose-50 to-white text-rose-900 sm:border-rose-300/90 sm:bg-gradient-to-r sm:from-rose-50 sm:via-white sm:to-pink-50 sm:hover:border-rose-400 sm:hover:from-rose-100 sm:hover:to-pink-100 sm:hover:shadow-md sm:hover:shadow-rose-200/50',
    blue: active
      ? 'border-blue-500 bg-blue-100 text-blue-950 max-sm:ring-1 max-sm:ring-blue-300/50 sm:ring-2 sm:ring-blue-300/60 sm:shadow-md'
      : 'border-blue-200 bg-gradient-to-b from-blue-50 to-white text-blue-900 sm:border-blue-300/90 sm:bg-gradient-to-r sm:from-blue-50 sm:via-white sm:to-sky-50 sm:hover:border-blue-400 sm:hover:from-blue-100 sm:hover:to-sky-100 sm:hover:shadow-md sm:hover:shadow-blue-200/50',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md border px-0.5 py-1.5 text-[10px] font-bold leading-none shadow-sm transition active:scale-[0.98]',
        'sm:inline-flex sm:min-h-0 sm:w-auto sm:flex-none sm:flex-row sm:items-center sm:gap-2 sm:rounded-xl sm:border-2 sm:px-4 sm:py-2.5 sm:text-sm sm:font-semibold sm:hover:-translate-y-0.5 sm:active:translate-y-0',
        tones[tone],
      )}
    >
      {icon}
      <span className="max-w-full text-center sm:hidden">{shortLabel}</span>
      <span className="hidden max-w-full sm:inline">{label}</span>
    </button>
  );
}
