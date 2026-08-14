import { memo } from 'react';
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import type { StorefrontProduct } from '../api/storefrontTypes';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { StorefrontProductPrice } from './StorefrontProductPrice';

interface DiscoverProductRowProps {
  product: StorefrontProduct;
  currency: string;
  shopSlug: string;
}

/** Compact product row - small thumb, no hero image waste. */
export const DiscoverProductRow = memo(function DiscoverProductRow({ product, currency, shopSlug }: DiscoverProductRowProps) {
  return (
    <li className={cn(marketplaceGlassPanel, 'flex items-center gap-3 px-3 py-2.5')}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden sm:rounded-lg bg-slate-100">
        {product.image_path ? (
          <img src={avatarUrl(product.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-slate-400" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-indigo-900">
          <StorefrontProductPrice product={product} currency={currency} size="sm" />
        </p>
        {product.category?.name ? (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{product.category.name}</p>
        ) : null}
      </div>
      <Link
        to={ROUTES.SHOP(shopSlug)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
          'border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50',
        )}
      >
        Order
      </Link>
    </li>
  );
});
