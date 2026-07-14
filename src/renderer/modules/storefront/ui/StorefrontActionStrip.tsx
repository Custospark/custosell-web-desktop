import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeftRight, Compass, Heart, Home, LayoutList, ShoppingCart, Ellipsis, X } from 'lucide-react';
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

type Tone = 'slate' | 'amber' | 'indigo' | 'emerald' | 'rose' | 'blue';

const activeTone: Record<Tone, string> = {
  slate: 'border-slate-500 bg-slate-100 text-slate-950 ring-1 ring-slate-300/50',
  amber: 'border-amber-500 bg-amber-100 text-amber-950 ring-1 ring-amber-300/50',
  indigo: 'border-indigo-500 bg-indigo-100 text-indigo-950 ring-1 ring-indigo-300/50',
  emerald: 'border-emerald-500 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300/50',
  rose: 'border-rose-500 bg-rose-100 text-rose-950 ring-1 ring-rose-300/50',
  blue: 'border-blue-500 bg-blue-100 text-blue-950 ring-1 ring-blue-300/50',
};

const inactiveTone: Record<Tone, string> = {
  slate: 'border-slate-200 bg-gradient-to-b from-slate-50 to-white text-slate-800',
  amber: 'border-amber-200 bg-gradient-to-b from-amber-50 to-white text-amber-950',
  indigo: 'border-indigo-200 bg-gradient-to-b from-indigo-50 to-white text-indigo-900',
  emerald: 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-white text-emerald-900',
  rose: 'border-rose-200 bg-gradient-to-b from-rose-50 to-white text-rose-900',
  blue: 'border-blue-200 bg-gradient-to-b from-blue-50 to-white text-blue-900',
};

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
  const [moreOpen, setMoreOpen] = useState(false);
  const shopsActive = active === 'browse';

  const primaryTabs: Array<{ tab: StorefrontStripTab; icon: ReactNode; tone: Tone; onClick: () => void }> = [
    ...(onHome ? [{ tab: 'home' as const, icon: <Home className="h-4 w-4" aria-hidden />, tone: 'slate' as Tone, onClick: onHome }] : []),
    { tab: 'discover' as const, icon: <Compass className="h-4 w-4" aria-hidden />, tone: 'amber' as Tone, onClick: onDiscover },
    { tab: 'orders' as const, icon: <LayoutList className="h-4 w-4" aria-hidden />, tone: 'blue' as Tone, onClick: onOrders },
  ];

  const moreTabs: Array<{ tab: StorefrontStripTab; icon: ReactNode; label: string; tone: Tone; onClick: () => void }> = [
    { tab: 'browse' as const, icon: <ArrowLeftRight className="h-4 w-4" aria-hidden />, label: shopsLabel, tone: 'indigo' as Tone, onClick: onBrowse },
    {
      tab: 'cart' as const,
      icon: <ShoppingCart className="h-4 w-4" aria-hidden />,
      label: 'Cart',
      tone: 'emerald' as Tone,
      onClick: onCart,
    },
    {
      tab: 'wishlist' as const,
      icon: <Heart className={cn('h-4 w-4', wishlistCount > 0 && 'fill-rose-500')} aria-hidden />,
      label: 'Wishlist',
      tone: 'rose' as Tone,
      onClick: onWishlist,
    },
  ];

  const isActive = (tab: StorefrontStripTab) => {
    if (tab === 'browse') return shopsActive;
    return active === tab;
  };

  const tabBtn = (tab: StorefrontStripTab, icon: ReactNode, tone: Tone, label: string, onClick: () => void) => {
    const act = isActive(tab);
    return (
      <button
        key={tab}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoreOpen(false); onClick(); }}
        aria-current={act ? 'page' : undefined}
        className={cn(
          'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-bold leading-none transition active:scale-[0.98]',
          act ? activeTone[tone] : inactiveTone[tone],
        )}
      >
        <span className={cn('flex h-7 w-7 items-center justify-center', act ? 'rounded-md bg-white/60' : '')}>
          {icon}
        </span>
        <span className="w-full truncate inline-flex items-center justify-center gap-1">
          {label}
          {tab === 'orders' && ordersCount > 0 ? (
            <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[8px] font-bold leading-none text-white">
              {ordersCount > 99 ? '99+' : ordersCount}
            </span>
          ) : null}
          {tab === 'cart' && cartCount > 0 ? (
            <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[8px] font-bold leading-none text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
          {tab === 'wishlist' && wishlistCount > 0 ? (
            <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-bold leading-none text-white">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <nav
      className={cn(
        'relative z-[10001] flex shrink-0 flex-col border-t border-slate-200 bg-white',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
      aria-label="Storefront navigation"
    >
      <div className="grid grid-cols-4 items-stretch lg:hidden">
        {onHome ? tabBtn('home', <Home className="h-4 w-4" aria-hidden />, 'slate', homeLabel, onHome) : null}
        {tabBtn('discover', <Compass className="h-4 w-4" aria-hidden />, 'amber', 'Products', onDiscover)}
        {tabBtn('orders', <LayoutList className="h-4 w-4" aria-hidden />, 'blue', 'Orders', onOrders)}

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoreOpen((o) => !o); }}
          aria-label="More"
          aria-expanded={moreOpen}
          className={cn(
            'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-bold leading-none transition active:scale-[0.98]',
            moreOpen ? 'text-blue-600' : 'text-slate-600 active:text-slate-900',
          )}
        >
          <span className={cn('flex h-7 w-7 items-center justify-center', moreOpen ? 'rounded-md bg-blue-50' : '')}>
            {moreOpen ? <X className="h-5 w-5" aria-hidden /> : <Ellipsis className="h-5 w-5" aria-hidden />}
          </span>
          <span className="w-full truncate">{moreOpen ? 'Close' : 'More'}</span>
        </button>
      </div>

      {moreOpen ? (
        <div className="flex items-stretch gap-1 border-t border-slate-100 bg-slate-50/80 px-1.5 py-1.5 overflow-x-auto">
          {moreTabs.map((t) => {
            const act = isActive(t.tab);
            return (
              <button
                key={t.tab}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoreOpen(false); t.onClick(); }}
                aria-current={act ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] font-bold leading-none transition active:scale-[0.98]',
                  act ? activeTone[t.tone] : (inactiveTone[t.tone] + ' hover:bg-slate-100'),
                )}
              >
                {t.icon}
                <span className="w-full truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Desktop strip — hidden on mobile, original full-bleed */}
      <div className="hidden lg:flex lg:items-center lg:justify-center lg:gap-3 lg:overflow-x-auto lg:overscroll-x-contain lg:border-t lg:border-slate-200/80 lg:bg-white/95 lg:px-3 lg:py-2.5 lg:backdrop-blur-sm">
        {onHome ? (
          <DesktopTab
            active={active === 'home'}
            onClick={onHome}
            title={homeTitle}
            tone="slate"
            icon={<Home className="h-4 w-4 shrink-0" aria-hidden />}
            label={homeLabel}
          />
        ) : null}
        <DesktopTab
          active={active === 'discover'}
          onClick={onDiscover}
          title="Browse products and services across all businesses"
          tone="amber"
          icon={<Compass className="h-4 w-4 shrink-0" aria-hidden />}
          label="Products & Services"
        />
        <DesktopTab
          active={shopsActive}
          onClick={onBrowse}
          title={shopsTitle}
          tone="indigo"
          icon={<ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />}
          label={shopsLabel}
        />
        <DesktopTab
          active={active === 'cart'}
          onClick={onCart}
          title={cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
          tone="emerald"
          icon={(
            <span className="relative inline-flex shrink-0">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </span>
          )}
          label="Cart"
        />
        <DesktopTab
          active={active === 'wishlist'}
          onClick={onWishlist}
          title={wishlistCount > 0 ? `Wishlist (${wishlistCount})` : 'Wishlist'}
          tone="rose"
          icon={(
            <span className="relative inline-flex shrink-0">
              <Heart className={cn('h-4 w-4', wishlistCount > 0 && 'fill-rose-500')} aria-hidden />
              {wishlistCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              ) : null}
            </span>
          )}
          label="Wishlist"
        />
        <DesktopTab
          active={active === 'orders'}
          onClick={onOrders}
          title={ordersCount > 0 ? `My orders (${ordersCount})` : 'My orders'}
          tone="blue"
          icon={(
            <span className="relative inline-flex shrink-0">
              <LayoutList className="h-4 w-4" aria-hidden />
              {ordersCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {ordersCount > 99 ? '99+' : ordersCount}
                </span>
              ) : null}
            </span>
          )}
          label="Orders"
        />
      </div>
    </nav>
  );
}

function DesktopTab({
  active,
  onClick,
  title,
  tone,
  icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  tone: Tone;
  icon: ReactNode;
  label: string;
}) {
  const desktopTones: Record<Tone, string> = {
    slate: active
      ? 'ring-2 ring-slate-300/60 bg-slate-100 text-slate-950 shadow-md border-slate-500'
      : 'border-slate-300/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:border-slate-400 hover:shadow-md hover:shadow-slate-200/60 text-slate-800',
    amber: active
      ? 'ring-2 ring-amber-300/60 bg-amber-100 text-amber-950 shadow-md border-amber-500'
      : 'border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md hover:shadow-amber-200/50 text-amber-950',
    indigo: active
      ? 'ring-2 ring-indigo-300/60 bg-indigo-100 text-indigo-950 shadow-md border-indigo-500'
      : 'border-indigo-300/90 bg-gradient-to-r from-indigo-50 via-white to-blue-50 hover:border-indigo-400 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md hover:shadow-indigo-200/50 text-indigo-900',
    emerald: active
      ? 'ring-2 ring-emerald-300/60 bg-emerald-100 text-emerald-950 shadow-md border-emerald-500'
      : 'border-emerald-300/90 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 hover:border-emerald-400 hover:from-emerald-100 hover:to-emerald-100 hover:shadow-md hover:shadow-emerald-200/50 text-emerald-900',
    rose: active
      ? 'ring-2 ring-rose-300/60 bg-rose-100 text-rose-950 shadow-md border-rose-500'
      : 'border-rose-300/90 bg-gradient-to-r from-rose-50 via-white to-pink-50 hover:border-rose-400 hover:from-rose-100 hover:to-pink-100 hover:shadow-md hover:shadow-rose-200/50 text-rose-900',
    blue: active
      ? 'ring-2 ring-blue-300/60 bg-blue-100 text-blue-950 shadow-md border-blue-500'
      : 'border-blue-300/90 bg-gradient-to-r from-blue-50 via-white to-sky-50 hover:border-blue-400 hover:from-blue-100 hover:to-sky-100 hover:shadow-md hover:shadow-blue-200/50 text-blue-900',
  };

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      title={title}
      aria-label={title}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-0 w-auto flex-none flex-row items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold hover:-translate-y-0.5 active:translate-y-0 transition-all',
        desktopTones[tone],
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
