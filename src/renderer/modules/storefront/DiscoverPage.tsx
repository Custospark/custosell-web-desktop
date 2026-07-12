import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Compass, ExternalLink, Package, Search, Store } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { cn } from '../../shared/utils/cn';
import {
  marketplaceGlassHeader,
  marketplaceGlassPanel,
  useMarketplaceHeroBackground,
} from '../inventory/ui/marketplace/marketplaceTheme';
import { useStorefrontShopProducts, useStorefrontShops } from './api/storefrontQueries';
import type { StorefrontShop } from './api/storefrontTypes';
import { DiscoverProductRow } from './ui/DiscoverProductRow';
import { DiscoverShopRow } from './ui/DiscoverShopRow';

const SHOP_CHUNK = 40;
const PRODUCT_CHUNK = 48;

/**
 * Authenticated Discover — Marketplace workspace pattern with inline shop browse (no modal).
 * Dense rows so long catalogs stay scannable.
 */
export default function DiscoverPage() {
  const heroStyle = useMarketplaceHeroBackground();
  const [shopQuery, setShopQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selected, setSelected] = useState<StorefrontShop | null>(null);
  const [shopVisible, setShopVisible] = useState(SHOP_CHUNK);
  const [productVisible, setProductVisible] = useState(PRODUCT_CHUNK);
  const [shopsOpen, setShopsOpen] = useState(true);

  const search = shopQuery.trim();
  const shopsQuery = useStorefrontShops(search);
  const productsQuery = useStorefrontShopProducts(selected?.slug ?? '', '');

  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);
  const visibleShops = useMemo(() => shops.slice(0, shopVisible), [shops, shopVisible]);

  const products = useMemo(() => {
    const list = productsQuery.data?.products ?? [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q)
        || (p.description?.toLowerCase().includes(q) ?? false)
        || (p.category?.name?.toLowerCase().includes(q) ?? false),
    );
  }, [productsQuery.data?.products, productSearch]);

  const visibleProducts = useMemo(
    () => products.slice(0, productVisible),
    [products, productVisible],
  );

  function selectShop(shop: StorefrontShop) {
    setSelected(shop);
    setProductSearch('');
    setProductVisible(PRODUCT_CHUNK);
    setShopsOpen(false);
  }

  const currency = selected?.currency || 'UGX';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden sm:m-3 sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm" style={heroStyle}>
      <header className={marketplaceGlassHeader}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">Discover</p>
          {selected ? (
            <button
              type="button"
              onClick={() => setShopsOpen(true)}
              className="mt-0.5 flex max-w-full items-center gap-1.5 text-left"
            >
              <span className="truncate text-base font-semibold text-slate-900">{selected.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          ) : (
            <h1 className="mt-0.5 text-base font-semibold text-slate-900">Browse public shops</h1>
          )}
          {selected?.city ? (
            <p className="mt-0.5 truncate text-xs text-slate-600">{selected.city}</p>
          ) : null}
        </div>
        {selected ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShopsOpen(true)}>
              Switch shop
            </Button>
            <Link
              to={ROUTES.SHOP(selected.slug)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open shop
            </Link>
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2.5 sm:flex-row sm:p-4">
        {/* Inline shop browser (not a modal) */}
        <aside
          className={cn(
            'flex min-h-0 flex-col sm:w-72 sm:shrink-0 lg:w-80',
            !shopsOpen && selected ? 'hidden sm:flex' : 'flex',
            shopsOpen || !selected ? 'min-h-[40%] sm:min-h-0' : '',
          )}
        >
          <div className={cn(marketplaceGlassPanel, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
            <div className="shrink-0 border-b border-slate-200/80 px-3 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={shopQuery}
                  onChange={(e) => {
                    setShopQuery(e.target.value);
                    setShopVisible(SHOP_CHUNK);
                  }}
                  placeholder="Search shops…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
              <p className="mt-2 text-[11px] font-medium tabular-nums text-slate-500">
                {shopsQuery.isLoading ? 'Loading…' : `${shops.length} shop${shops.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
              {shopsQuery.isLoading ? (
                <LoadingSkeleton variant="minimal" message="Loading shops…" />
              ) : shops.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Store className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">No shops yet</p>
                  <p className="mt-1 text-xs text-slate-600">Enable a public shop in Settings → Business.</p>
                </div>
              ) : (
                <>
                  {visibleShops.map((shop) => (
                    <DiscoverShopRow
                      key={shop.slug}
                      shop={shop}
                      active={selected?.slug === shop.slug}
                      onSelect={selectShop}
                    />
                  ))}
                  {shops.length > shopVisible ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setShopVisible((n) => n + SHOP_CHUNK)}
                    >
                      Show more shops ({shops.length - shopVisible})
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Catalog */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!selected ? (
            <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-lg flex-col items-center px-5 py-12 text-center')}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/30">
                <Compass className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Start with a shop</h2>
              <p className="mt-2 text-sm text-slate-600">
                Pick a storefront from the list, then browse its listed products. Open the shop to place an order request.
              </p>
            </div>
          ) : productsQuery.isLoading ? (
            <div className={cn(marketplaceGlassPanel, 'p-4')}>
              <LoadingSkeleton variant="table" />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className={cn(marketplaceGlassPanel, 'flex shrink-0 items-center gap-3 px-3 py-2.5')}>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductVisible(PRODUCT_CHUNK);
                  }}
                  placeholder="Filter products in this shop…"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                />
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
                  {Math.min(productVisible, products.length)} / {products.length}
                </span>
              </div>
              {products.length === 0 ? (
                <div className={cn(marketplaceGlassPanel, 'flex flex-col items-center gap-2 px-6 py-14 text-center')}>
                  <Package className="h-9 w-9 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-900">No listed products</p>
                  <p className="max-w-sm text-xs text-slate-600">
                    This shop is open but has not listed catalog items for the storefront yet.
                  </p>
                  <Link
                    to={ROUTES.SHOP(selected.slug)}
                    className="mt-2 text-sm font-semibold text-teal-800 hover:underline"
                  >
                    Open shop page →
                  </Link>
                </div>
              ) : (
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                  {visibleProducts.map((p) => (
                    <DiscoverProductRow
                      key={p.id}
                      product={p}
                      currency={currency}
                      shopSlug={selected.slug}
                    />
                  ))}
                  {products.length > productVisible ? (
                    <li className="flex justify-center py-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setProductVisible((n) => n + PRODUCT_CHUNK)}
                      >
                        Show more ({products.length - productVisible} remaining)
                      </Button>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
