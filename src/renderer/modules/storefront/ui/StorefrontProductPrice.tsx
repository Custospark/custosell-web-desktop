import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import { resolveProductPrice } from './productPrice';
import type { StorefrontProduct } from '../api/storefrontTypes';

interface StorefrontProductPriceProps {
  product: Pick<StorefrontProduct, 'unit_price' | 'sale_price' | 'discount_percent' | 'unit'>;
  currency: string;
  className?: string;
  /** Larger type for product detail. */
  size?: 'sm' | 'md' | 'lg';
  showUnit?: boolean;
}

/** Struck regular + bold sale + optional −N% chip. */
export function StorefrontProductPrice({
  product,
  currency,
  className,
  size = 'sm',
  showUnit = true,
}: StorefrontProductPriceProps) {
  const { regular, sale, percent, onSale } = resolveProductPrice(product);
  const saleClass =
    size === 'lg'
      ? 'text-lg font-bold'
      : size === 'md'
        ? 'text-base font-bold'
        : 'text-sm font-bold';
  const strikeClass = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5', className)}>
      {onSale ? (
        <>
          <span className={cn('tabular-nums text-teal-900', saleClass)}>
            {formatCurrency(sale, currency)}
          </span>
          <span className={cn('tabular-nums text-slate-400 line-through', strikeClass)}>
            {formatCurrency(regular, currency)}
          </span>
          {percent != null ? (
            <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-rose-700">
              −{Number.isInteger(percent) ? percent : percent.toFixed(1)}%
            </span>
          ) : null}
        </>
      ) : (
        <span className={cn('tabular-nums text-teal-900', saleClass)}>
          {formatCurrency(regular, currency)}
        </span>
      )}
      {showUnit && product.unit ? (
        <span className="text-xs font-medium text-slate-500"> / {product.unit}</span>
      ) : null}
    </span>
  );
}
