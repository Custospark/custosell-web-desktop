import type { ReactNode } from 'react';
import { ArrowLeftRight, Compass, Home, LayoutList, ShoppingCart } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export type StorefrontStripTab = 'home' | 'discover' | 'browse' | 'cart' | 'orders';

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
  onOrders: () => void;
  cartCount?: number;
  ordersCount?: number;
  className?: string;
}

/**
 * Horizontal bottom nav — Marketplace-style lively strip with always-visible labels.
 */
export function StorefrontActionStrip({
  active,
  onHome,
  homeLabel = 'Home',
  homeTitle = 'Home',
  shopsLabel = 'Shops',
  shopsTitle = 'Browse businesses / shops',
  onDiscover,
  onBrowse,
  onCart,
  onOrders,
  cartCount = 0,
  ordersCount = 0,
  className,
}: StorefrontActionStripProps) {
  const shopsActive = active === 'browse';

  return (
    <div
      className={cn(
        'relative z-[10001] flex shrink-0 items-center justify-center gap-1.5 overflow-x-auto overscroll-x-contain border-t border-slate-200/80 bg-white/95 px-2 py-2 backdrop-blur-sm sm:gap-3 sm:px-3 sm:py-2.5',
        className,
      )}
      role="navigation"
      aria-label="Storefront navigation"
    >
      {onHome ? (
        <StripButton
          active={active === 'home'}
          onClick={onHome}
          title={homeTitle}
          tone="slate"
          icon={<Home className="h-4 w-4 text-slate-600" />}
          label={homeLabel}
        />
      ) : null}
      <StripButton
        active={active === 'discover'}
        onClick={onDiscover}
        title="Browse products across shops"
        tone="amber"
        icon={<Compass className="h-4 w-4 text-amber-700" />}
        label="Products"
      />
      <StripButton
        active={shopsActive}
        onClick={onBrowse}
        title={shopsTitle}
        tone="teal"
        icon={<ArrowLeftRight className="h-4 w-4 text-teal-600" />}
        label={shopsLabel}
      />
      <StripButton
        active={active === 'cart'}
        onClick={onCart}
        title={cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
        tone="emerald"
        icon={(
          <span className="relative inline-flex shrink-0">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </span>
        )}
        label="Cart"
      />
      <StripButton
        active={active === 'orders'}
        onClick={onOrders}
        title={ordersCount > 0 ? `My orders (${ordersCount})` : 'My orders'}
        tone="blue"
        icon={(
          <span className="relative inline-flex shrink-0">
            <LayoutList className="h-4 w-4 text-blue-600" />
            {ordersCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                {ordersCount > 99 ? '99+' : ordersCount}
              </span>
            ) : null}
          </span>
        )}
        label="Orders"
      />
    </div>
  );
}

type Tone = 'slate' | 'amber' | 'teal' | 'emerald' | 'blue';

function StripButton({
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
  const tones: Record<Tone, string> = {
    slate: active
      ? 'border-slate-500 bg-slate-100 text-slate-950 ring-2 ring-slate-300/60 shadow-md'
      : 'border-slate-300/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 text-slate-800 hover:border-slate-400 hover:shadow-md hover:shadow-slate-200/60',
    amber: active
      ? 'border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-300/60 shadow-md'
      : 'border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 text-amber-950 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md hover:shadow-amber-200/50',
    teal: active
      ? 'border-teal-500 bg-teal-100 text-teal-950 ring-2 ring-teal-300/60 shadow-md'
      : 'border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 text-teal-900 hover:border-teal-400 hover:from-teal-100 hover:to-cyan-100 hover:shadow-md hover:shadow-teal-200/50',
    emerald: active
      ? 'border-emerald-500 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-300/60 shadow-md'
      : 'border-emerald-300/90 bg-gradient-to-r from-emerald-50 via-white to-teal-50 text-emerald-900 hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md hover:shadow-emerald-200/50',
    blue: active
      ? 'border-blue-500 bg-blue-100 text-blue-950 ring-2 ring-blue-300/60 shadow-md'
      : 'border-blue-300/90 bg-gradient-to-r from-blue-50 via-white to-sky-50 text-blue-900 hover:border-blue-400 hover:from-blue-100 hover:to-sky-100 hover:shadow-md hover:shadow-blue-200/50',
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-2.5 py-2 text-xs font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm',
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        tones[tone],
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
