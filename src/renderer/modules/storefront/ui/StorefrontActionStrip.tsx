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
  /** Shopping accounts have no Home/Dashboard — Cart becomes a primary tab instead. */
  cartPrimary?: boolean;
  className?: string;
}

type Tone = 'slate' | 'amber' | 'teal' | 'emerald' | 'rose' | 'blue';

const activeTone: Record<Tone, string> = {
  slate: 'border-slate-500 bg-slate-100 text-slate-950 ring-1 ring-slate-300/50',
  amber: 'border-amber-500 bg-amber-100 text-amber-950 ring-1 ring-amber-300/50',
  teal: 'border-indigo-500 bg-indigo-100 text-indigo-950 ring-1 ring-indigo-300/50',
  emerald: 'border-emerald-500 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300/50',
  rose: 'border-rose-500 bg-rose-100 text-rose-950 ring-1 ring-rose-300/50',
  blue: 'border-blue-500 bg-blue-100 text-blue-950 ring-1 ring-blue-300/50',
};

const inactiveTone: Record<Tone, string> = {
  slate: 'border-slate-200 bg-gradient-to-b from-slate-50 to-white text-slate-800',
  amber: 'border-amber-200 bg-gradient-to-b from-amber-50 to-white text-amber-950',
  teal: 'border-indigo-200 bg-gradient-to-b from-teal-50 to-white text-indigo-900',
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
  cartPrimary = false,
  className,
}: StorefrontActionStripProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const shopsActive = active === 'browse';

  // Tabs already pinned in the main mobile row must not repeat in the More overflow.
  const primaryTabs = new Set<StorefrontStripTab>(['discover', 'orders']);
  if (cartPrimary) primaryTabs.add('cart');
  else if (onHome) primaryTabs.add('home');

  const moreTabs: Array<{ tab: StorefrontStripTab; icon: ReactNode; label: string; tone: Tone; count: number; countTone?: Tone; onClick: () => void }> = [
    { tab: 'browse' as const, icon: <ArrowLeftRight className="h-4 w-4" aria-hidden />, label: shopsLabel, tone: 'teal' as Tone, count: 0, onClick: onBrowse },
    ...(cartPrimary
      ? []
      : [{
          tab: 'cart' as const,
          icon: <ShoppingCart className="h-4 w-4" aria-hidden />,
          label: 'Cart',
          tone: 'emerald' as Tone,
          count: cartCount,
          countTone: 'emerald' as Tone,
          onClick: onCart,
        }]),
    {
      tab: 'orders' as const,
      icon: <LayoutList className="h-4 w-4" aria-hidden />,
      label: 'Orders',
      tone: 'blue' as Tone,
      count: ordersCount,
      countTone: 'blue' as Tone,
      onClick: onOrders,
    },
    {
      tab: 'wishlist' as const,
      icon: <Heart className={cn('h-4 w-4', wishlistCount > 0 && 'fill-rose-500')} aria-hidden />,
      label: 'Wishlist',
      tone: 'rose' as Tone,
      count: wishlistCount,
      countTone: 'rose' as Tone,
      onClick: onWishlist,
    },
  ].filter((t) => !primaryTabs.has(t.tab));

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
        <span className={cn('relative flex h-7 w-7 items-center justify-center', act ? 'rounded-md bg-white/60' : '')}>
          {icon}
          {tab === 'orders' && ordersCount > 0 ? (
            <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {ordersCount > 99 ? '99+' : ordersCount}
            </span>
          ) : null}
          {tab === 'cart' && cartCount > 0 ? (
            <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
          {tab === 'wishlist' && wishlistCount > 0 ? (
            <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          ) : null}
        </span>
        <span className="w-full truncate inline-flex items-center justify-center">
          {label}
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
        {!cartPrimary && onHome ? tabBtn('home', <Home className="h-4 w-4" aria-hidden />, 'slate', homeLabel, onHome) : null}
        {cartPrimary ? tabBtn('cart', <ShoppingCart className="h-4 w-4" aria-hidden />, 'emerald', 'Cart', onCart) : null}
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
                <span className="relative flex h-6 w-6 items-center justify-center">
                    {t.icon}
                    {t.count > 0 ? (
                      <span
                        className={cn(
                          'absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white',
                          t.countTone === 'emerald' ? 'bg-emerald-600' : t.countTone === 'rose' ? 'bg-rose-600' : 'bg-blue-600',
                        )}
                      >
                        {t.count > 99 ? '99+' : t.count}
                      </span>
                    ) : null}
                  </span>
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
          tone="teal"
          icon={<ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />}
          label={shopsLabel}
        />
        <DesktopTab
          active={active === 'cart'}
          onClick={onCart}
          title={cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
          tone="emerald"
          icon={<ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />}
          label="Cart"
          count={cartCount}
          countTone="emerald"
        />
        <DesktopTab
          active={active === 'orders'}
          onClick={onOrders}
          title={ordersCount > 0 ? `My orders (${ordersCount})` : 'My orders'}
          tone="blue"
          icon={<LayoutList className="h-4 w-4 shrink-0" aria-hidden />}
          label="Orders"
          count={ordersCount}
          countTone="blue"
        />
        <DesktopTab
          active={active === 'wishlist'}
          onClick={onWishlist}
          title={wishlistCount > 0 ? `Wishlist (${wishlistCount})` : 'Wishlist'}
          tone="rose"
          icon={<Heart className={cn('h-4 w-4 shrink-0', wishlistCount > 0 && 'fill-rose-500')} aria-hidden />}
          label="Wishlist"
          count={wishlistCount}
          countTone="rose"
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
  count = 0,
  countTone,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  tone: Tone;
  icon: ReactNode;
  label: string;
  count?: number;
  countTone?: Tone;
}) {
  const desktopTones: Record<Tone, string> = {
    slate: active
      ? 'ring-2 ring-slate-300/60 bg-slate-100 text-slate-950 shadow-md border-slate-500'
      : 'border-slate-300/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:border-slate-400 hover:shadow-md hover:shadow-slate-200/60 text-slate-800',
    amber: active
      ? 'ring-2 ring-amber-300/60 bg-amber-100 text-amber-950 shadow-md border-amber-500'
      : 'border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md hover:shadow-amber-200/50 text-amber-950',
    teal: active
      ? 'ring-2 ring-indigo-300/60 bg-indigo-100 text-indigo-950 shadow-md border-indigo-500'
      : 'border-indigo-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 hover:border-indigo-400 hover:from-teal-100 hover:to-cyan-100 hover:shadow-md hover:shadow-indigo-200/50 text-indigo-900',
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
        'relative inline-flex min-h-0 w-auto flex-none flex-row items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold hover:-translate-y-0.5 active:translate-y-0 transition-all',
        desktopTones[tone],
      )}
    >
      {icon}
      <span className="relative">
        {label}
        {count > 0 ? (
          <span
            className={cn(
              'absolute -top-2.5 left-full ml-1 flex min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[8px] font-bold leading-[1.15rem] text-white ring-2 ring-white',
              countTone === 'emerald' ? 'bg-emerald-600' : countTone === 'rose' ? 'bg-rose-600' : 'bg-blue-600',
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </span>
    </button>
  );
}
