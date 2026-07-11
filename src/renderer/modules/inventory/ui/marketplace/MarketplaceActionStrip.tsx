import { ArrowLeftRight, Bookmark, LayoutList, RefreshCw, ShoppingCart } from 'lucide-react';
import { cn } from '../../../../shared/utils/cn';

interface MarketplaceActionStripProps {
  onMySuppliers: () => void;
  onBrowseSuppliers: () => void;
  onOpenCart: () => void;
  cartCount: number;
  onOpenOrders: () => void;
  openOrdersCount?: number;
  onRefresh: () => void;
  mySuppliersCount?: number;
  refreshing?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MarketplaceActionStrip({
  onMySuppliers,
  onBrowseSuppliers,
  onOpenCart,
  cartCount,
  onOpenOrders,
  openOrdersCount = 0,
  onRefresh,
  mySuppliersCount = 0,
  refreshing = false,
  disabled = false,
  className,
}: MarketplaceActionStripProps) {
  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-center gap-1.5 overflow-x-auto overscroll-x-contain border-t border-slate-200/80 bg-white/95 px-2 py-2 backdrop-blur-sm sm:gap-3 sm:px-3 sm:py-2.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={onMySuppliers}
        disabled={disabled}
        className={cn(
          'relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-amber-300/90 px-2.5 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
          'bg-gradient-to-r from-amber-50 via-white to-orange-50 text-amber-950',
          'hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md hover:shadow-amber-200/50',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        )}
        title="My suppliers"
        aria-label={mySuppliersCount > 0 ? `My suppliers (${mySuppliersCount})` : 'My suppliers'}
      >
        <span className="relative inline-flex shrink-0">
          <Bookmark className="h-4 w-4 text-amber-700" />
          {mySuppliersCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-700 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
              {mySuppliersCount > 99 ? '99+' : mySuppliersCount}
            </span>
          ) : null}
        </span>
        <span className="hidden md:inline">My suppliers</span>
      </button>

      <button
        type="button"
        onClick={onBrowseSuppliers}
        disabled={disabled}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-teal-300/90 px-2.5 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
          'bg-gradient-to-r from-teal-50 via-white to-cyan-50 text-teal-900',
          'hover:border-teal-400 hover:from-teal-100 hover:to-cyan-100 hover:shadow-md hover:shadow-teal-200/50',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        )}
        title="Browse suppliers"
        aria-label="Browse suppliers"
      >
        <ArrowLeftRight className="h-4 w-4 text-teal-600" />
        <span className="hidden md:inline">Browse</span>
      </button>

      <button
        type="button"
        onClick={onOpenCart}
        disabled={disabled}
        className={cn(
          'relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-emerald-300/90 px-2.5 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
          'bg-gradient-to-r from-emerald-50 via-white to-teal-50 text-emerald-900',
          'hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md hover:shadow-emerald-200/50',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        )}
        title="Purchase order cart"
        aria-label={cartCount > 0 ? `Cart (${cartCount} lines)` : 'Cart'}
      >
        <span className="relative inline-flex shrink-0">
          <ShoppingCart className="h-4 w-4 text-emerald-600" />
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </span>
        <span className="hidden md:inline">Cart</span>
      </button>

      <button
        type="button"
        onClick={onOpenOrders}
        disabled={disabled}
        className={cn(
          'relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-blue-300/90 px-2.5 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
          'bg-gradient-to-r from-blue-50 via-white to-sky-50 text-blue-900',
          'hover:border-blue-400 hover:from-blue-100 hover:to-sky-100 hover:shadow-md hover:shadow-blue-200/50',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        )}
        title={openOrdersCount > 0 ? `My purchase orders (${openOrdersCount} open)` : 'My purchase orders'}
        aria-label={openOrdersCount > 0 ? `My purchase orders (${openOrdersCount} open)` : 'My purchase orders'}
      >
        <span className="relative inline-flex shrink-0">
          <LayoutList className="h-4 w-4 text-blue-600" />
          {openOrdersCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
              {openOrdersCount > 99 ? '99+' : openOrdersCount}
            </span>
          ) : null}
        </span>
        <span className="hidden md:inline">Orders</span>
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled || refreshing}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300/90 px-2.5 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
          'bg-gradient-to-r from-slate-50 via-white to-slate-50 text-slate-700',
          'hover:border-slate-400 hover:from-slate-100 hover:to-slate-100 hover:shadow-md',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        )}
        title="Refresh catalogs"
        aria-label="Refresh catalogs"
      >
        <RefreshCw className={cn('h-4 w-4 text-slate-600', refreshing && 'animate-spin')} />
        <span className="hidden md:inline">Refresh</span>
      </button>
    </div>
  );
}
