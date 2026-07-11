import { Package, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cn } from '../../../../shared/utils/cn';
import {
  effectiveSupplyPrice,
  type MarketplaceProduct,
} from '../../api/marketplace/marketplaceTypes';
import { marketplaceGlassPanel } from './marketplaceTheme';

/** Render in chunks so huge seller catalogs don't mount every card at once. */
const CATALOG_CHUNK = 48;

interface MarketplaceCatalogProps {
  products: MarketplaceProduct[];
  loading?: boolean;
  offline?: boolean;
  busy?: boolean;
  onAdd: (product: MarketplaceProduct) => void;
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  /** When cart is docked, tighten grid so cards stay readable. */
  compact?: boolean;
}

export function MarketplaceCatalog({
  products,
  loading = false,
  offline = false,
  busy = false,
  onAdd,
  productSearch,
  onProductSearchChange,
  compact = false,
}: MarketplaceCatalogProps) {
  const [visibleCount, setVisibleCount] = useState(CATALOG_CHUNK);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount],
  );
  const hasMore = products.length > visibleCount;

  if (loading) {
    return (
      <div className={cn(marketplaceGlassPanel, 'p-4')}>
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (products.length === 0 && !productSearch.trim()) {
    return (
      <div className={cn(marketplaceGlassPanel, 'flex flex-col items-center gap-2 px-6 py-16 text-center')}>
        <Package className="h-10 w-10 text-slate-400" />
        <p className="text-sm font-semibold text-slate-900">No listed products yet</p>
        <p className="max-w-sm text-xs text-slate-600">
          This supplier is open for supply but has not listed catalog items. Try another supplier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-3 px-3 py-2.5')}>
        <input
          type="search"
          value={productSearch}
          onChange={(e) => {
            onProductSearchChange(e.target.value);
            setVisibleCount(CATALOG_CHUNK);
          }}
          placeholder="Filter products in this catalog…"
          disabled={offline}
          className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0"
        />
        {products.length > 0 ? (
          <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
            {Math.min(visibleCount, products.length)} / {products.length}
          </span>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-6 py-10 text-center text-sm font-medium text-slate-700')}>
          No products match “{productSearch.trim()}”.
        </div>
      ) : (
        <>
          <ul
            className={cn(
              'grid grid-cols-1 gap-2',
              compact ? 'md:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3',
            )}
          >
            {visibleProducts.map((product) => {
              const price = effectiveSupplyPrice(product);
              const minQty = Math.max(1, product.supply_min_qty ?? 1);
              return (
                <li
                  key={product.id}
                  className={cn(
                    marketplaceGlassPanel,
                    'flex flex-col gap-3 p-3.5 transition-transform hover:-translate-y-0.5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-teal-900">
                      {formatCurrency(price)}
                      {product.unit ? <span className="font-medium text-slate-600"> / {product.unit}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {product.sku ? `SKU ${product.sku} · ` : ''}
                      Min order {minQty}
                      {product.stock_quantity != null ? ` · Stock ${product.stock_quantity}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={offline || busy}
                    onClick={() => onAdd(product)}
                    className="inline-flex w-fit shrink-0 items-center justify-center gap-1.5 self-start"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to cart
                  </Button>
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <div className="flex justify-center pb-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVisibleCount((n) => n + CATALOG_CHUNK)}
              >
                Show more products ({products.length - visibleCount} remaining)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
