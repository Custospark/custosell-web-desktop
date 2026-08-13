import { memo } from 'react';
import { Store } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import type { StorefrontShop } from '../api/storefrontTypes';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';

interface DiscoverShopRowProps {
  shop: StorefrontShop;
  active?: boolean;
  onSelect?: (shop: StorefrontShop) => void;
}

/** Dense shop card — lively hover lift like Marketplace catalog cards. */
export const DiscoverShopRow = memo(function DiscoverShopRow({ shop, active = false, onSelect }: DiscoverShopRowProps) {
  const className = cn(
    marketplaceGlassPanel,
    'flex w-full items-center gap-2 px-2 py-2 text-left transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-900/10',
    'active:translate-y-0 active:scale-[0.99]',
    active
      ? 'border-indigo-500/80 bg-indigo-50/90 ring-1 ring-indigo-600/30'
      : 'hover:bg-white',
  );

  const body = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
        {shop.logo_path ? (
          <img src={avatarUrl(shop.logo_path) ?? undefined} alt="" className="h-full w-full object-cover" />
        ) : (
          <Store className="h-4 w-4 text-indigo-700" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-slate-900">{shop.name}</p>
        <p className="truncate text-[11px] text-slate-500">
          @{shop.slug}{shop.city ? ` · ${shop.city}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-indigo-800">Open →</span>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(shop)} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
});
