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

type Tone = 'slate' | 'amber' | 'teal' | 'emerald' | 'rose' | 'blue';

const tabBtnBase =
  'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-bold leading-none transition active:scale-[0.98]';

const tones: Record<Tone, string> = {
  slate:
    'text-slate-600 active:text-slate-900',
  amber:
    'text-amber-700 active:text-amber-900',
  teal:
    'text-teal-600 active:text-teal-900',
  emerald:
    'text-emerald-600 active:text-emerald-900',
  rose:
    'text-rose-600 active:text-rose-900',
  blue:
    'text-blue-600 active:text-blue-900',
};

const activeTones: Record<Tone, string> = {
  slate: 'text-slate-950 bg-slate-100',
  amber: 'text-amber-950 bg-amber-100',
  teal: 'text-teal-950 bg-teal-100',
  emerald: 'text-emerald-950 bg-emerald-100',
  rose: 'text-rose-950 bg-rose-100',
  blue: 'text-blue-950 bg-blue-100',
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

  const primaryTabs: Array<{ tab: StorefrontStripTab; icon: ReactNode; label: string; tone: Tone; onClick: () => void }> = [
    ...(onHome ? [{ tab: 'home' as const, icon: <Home className="h-4 w-4" aria-hidden />, label: homeLabel, tone: 'slate' as Tone, onClick: onHome }] : []),
    { tab: 'discover' as const, icon: <Compass className="h-4 w-4" aria-hidden />, label: 'Products', tone: 'amber' as Tone, onClick: onDiscover },
    { tab: 'orders' as const, icon: <LayoutList className="h-4 w-4" aria-hidden />, label: 'Orders', tone: 'blue' as Tone, onClick: onOrders },
  ];

  const moreTabs: Array<{ tab: StorefrontStripTab; icon: ReactNode; label: string; tone: Tone; onClick: () => void }> = [
    { tab: 'browse' as const, icon: <ArrowLeftRight className="h-4 w-4" aria-hidden />, label: shopsLabel, tone: 'teal' as Tone, onClick: onBrowse },
    { tab: 'cart' as const, icon: (
      <span className="relative inline-flex shrink-0">
        <ShoppingCart className="h-4 w-4" aria-hidden />
        {cartCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        ) : null}
      </span>
    ), label: 'Cart', tone: 'emerald' as Tone, onClick: onCart },
    { tab: 'wishlist' as const, icon: (
      <span className="relative inline-flex shrink-0">
        <Heart className={cn('h-4 w-4', wishlistCount > 0 && 'fill-rose-500')} aria-hidden />
        {wishlistCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white">
            {wishlistCount > 99 ? '99+' : wishlistCount}
          </span>
        ) : null}
      </span>
    ), label: 'Wishlist', tone: 'rose' as Tone, onClick: onWishlist },
  ];

  const isActive = (tab: StorefrontStripTab) => {
    if (tab === 'browse') return shopsActive;
    return active === tab;
  };

  return (
    <nav
      className={cn(
        'lg:hidden relative z-[10001] flex shrink-0 flex-col border-t border-slate-200 bg-white',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
      aria-label="Storefront navigation"
    >
      <div className="grid grid-cols-4 items-stretch">
        {primaryTabs.map((t) => {
          const activeState = isActive(t.tab);
          return (
            <button
              key={t.tab}
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); t.onClick(); }}
              title={t.tab === 'home' ? homeTitle : undefined}
              aria-label={t.tab === 'home' ? homeTitle : undefined}
              aria-current={activeState ? 'page' : undefined}
              className={cn(tabBtnBase, activeState ? activeTones[t.tone] : tones[t.tone])}
            >
              <span className={cn('flex h-7 w-7 items-center justify-center', activeState ? 'bg-white/60 rounded-md' : '')}>
                {t.icon}
              </span>
              <span className="w-full truncate">{t.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoreOpen((o) => !o); }}
          aria-label="More"
          aria-expanded={moreOpen}
          className={cn(tabBtnBase, moreOpen ? 'text-blue-600' : 'text-slate-600 active:text-slate-900')}
        >
          <span className={cn('flex h-7 w-7 items-center justify-center', moreOpen ? 'bg-blue-50 rounded-md' : '')}>
            {moreOpen ? <X className="h-5 w-5" aria-hidden /> : <Ellipsis className="h-5 w-5" aria-hidden />}
          </span>
          <span className="w-full truncate">{moreOpen ? 'Close' : 'More'}</span>
        </button>
      </div>

      {moreOpen ? (
        <div className="flex items-stretch border-t border-slate-100 bg-slate-50/80 px-1 py-1.5 gap-1 overflow-x-auto">
          {moreTabs.map((t) => {
            const activeState = isActive(t.tab);
            return (
              <button
                key={t.tab}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoreOpen(false); t.onClick(); }}
                title={t.tab === 'browse' ? shopsTitle : undefined}
                aria-label={t.tab === 'browse' ? shopsTitle : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] font-bold leading-none transition active:scale-[0.98]',
                  activeState ? activeTones[t.tone] : (tones[t.tone] + ' hover:bg-slate-100'),
                )}
              >
                {t.icon}
                <span className="w-full truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Desktop — hidden on mobile, original full-bleed strip */}
      <div className="hidden sm:flex sm:items-center sm:justify-center sm:gap-3 sm:overflow-x-auto sm:overscroll-x-contain sm:border-t sm:border-slate-200/80 sm:bg-white/95 sm:px-3 sm:py-2.5 sm:backdrop-blur-sm">
        {onHome ? (
          <StripButtonDesktop
            active={active === 'home'}
            onClick={onHome}
            title={homeTitle}
            tone="slate"
            icon={<Home className="h-4 w-4 shrink-0" aria-hidden />}
            label={homeLabel}
          />
        ) : null}
        <StripButtonDesktop
          active={active === 'discover'}
          onClick={onDiscover}
          title="Browse products and services across all businesses"
          tone="amber"
          icon={<Compass className="h-4 w-4 shrink-0" aria-hidden />}
          label="Products & Services"
        />
        <StripButtonDesktop
          active={shopsActive}
          onClick={onBrowse}
          title={shopsTitle}
          tone="teal"
          icon={<ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />}
          label={shopsLabel}
        />
        <StripButtonDesktop
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
        <StripButtonDesktop
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
        <StripButtonDesktop
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

function StripButtonDesktop({
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
    teal: active
      ? 'ring-2 ring-teal-300/60 bg-teal-100 text-teal-950 shadow-md border-teal-500'
      : 'border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 hover:border-teal-400 hover:from-teal-100 hover:to-cyan-100 hover:shadow-md hover:shadow-teal-200/50 text-teal-900',
    emerald: active
      ? 'ring-2 ring-emerald-300/60 bg-emerald-100 text-emerald-950 shadow-md border-emerald-500'
      : 'border-emerald-300/90 bg-gradient-to-r from-emerald-50 via-white to-teal-50 hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md hover:shadow-emerald-200/50 text-emerald-900',
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
