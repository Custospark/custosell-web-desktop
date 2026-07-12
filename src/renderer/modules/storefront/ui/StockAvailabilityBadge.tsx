import { cn } from '../../../shared/utils/cn';
import type { StorefrontProduct } from '../api/storefrontTypes';
import { isStorefrontProductOutOfStock } from './storefrontStock';

export { isStorefrontProductOutOfStock } from './storefrontStock';

/** Compact stock chip for Discover / shop tiles. Services show nothing (always available). */
export function StockAvailabilityBadge({
  product,
  className,
}: {
  product: StorefrontProduct;
  className?: string;
}) {
  const availability = product.availability
    ?? (product.type === 'service' ? 'always' : product.in_stock === false ? 'out' : 'in_stock');

  if (availability === 'always') return null;

  if (availability === 'out' || isStorefrontProductOutOfStock(product)) {
    return (
      <span
        className={cn(
          'inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 ring-1 ring-red-200',
          className,
        )}
      >
        Out of stock
      </span>
    );
  }

  const qty = product.stock_quantity;
  if (typeof qty === 'number' && qty > 0 && qty <= 5) {
    return (
      <span
        className={cn(
          'inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200',
          className,
        )}
      >
        Low stock
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200',
        className,
      )}
    >
      In stock
    </span>
  );
}
