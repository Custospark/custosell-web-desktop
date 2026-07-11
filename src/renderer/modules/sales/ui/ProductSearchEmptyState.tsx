import { Package, RefreshCw, SlidersHorizontal, PackagePlus, CheckCircle2, CircleCheck } from 'lucide-react';
import type { Product } from '../../inventory/api/products/ProductTypes';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';

export type ReloadFeedback = 'idle' | 'updated' | 'upToDate';

export const RELOAD_SUCCESS_MS = 10_000;

export function inventorySnapshot(products: Product[] | undefined): string {
  if (!products?.length) return '';
  return [...products]
    .sort((a, b) => a.id - b.id)
    .map((p) => `${p.id}:${p.stock_quantity}:${p.is_active ? 1 : 0}:${p.type ?? 'product'}`)
    .join('|');
}

const PRODUCT_SEARCH_SUGGESTIONS = [
  {
    icon: SlidersHorizontal,
    title: 'Adjust your search',
    description: 'Try fewer characters or a different spelling',
  },
  {
    icon: PackagePlus,
    title: 'Consider adding the product to stock',
    description: 'Ask someone with inventory access if the item should be stocked',
  },
] as const;

export function ProductSearchEmptyState({
  searchQuery,
  onReload,
  isReloading,
  reloadFeedback,
}: {
  searchQuery: string;
  onReload: () => void;
  isReloading: boolean;
  reloadFeedback: ReloadFeedback;
}) {
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" aria-hidden />
        <p className="text-sm font-medium text-gray-700">No products found</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate px-2" title={searchQuery}>
          Nothing matched &ldquo;{searchQuery}&rdquo;
        </p>
      </div>

      {reloadFeedback === 'updated' ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2 bg-green-600 hover:bg-green-600 active:bg-green-600 focus:ring-green-500 cursor-default"
          disabled
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          Stock updated — search again
        </Button>
      ) : reloadFeedback === 'upToDate' ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2 bg-green-600 hover:bg-green-600 active:bg-green-600 focus:ring-green-500 cursor-default"
          disabled
        >
          <CircleCheck className="w-4 h-4 shrink-0" aria-hidden />
          Products up to date — adjust your search
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2"
          disabled={isReloading}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void onReload()}
        >
          <RefreshCw className={cn('w-4 h-4 shrink-0', isReloading && 'animate-spin')} aria-hidden />
          {isReloading ? 'Reloading…' : 'Reload products'}
        </Button>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-4 mb-2 px-0.5">Suggestions</p>
      <ul className="space-y-1">
        {PRODUCT_SEARCH_SUGGESTIONS.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-lg p-2.5 text-left bg-gray-50/80"
          >
            <span className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 shrink-0">
              <Icon className="w-4 h-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-gray-700">{title}</span>
              <span className="block text-xs text-gray-500">{description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
