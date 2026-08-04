import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import {
  useStorefrontCategories,
  useStorefrontDiscoverInfinite,
} from '../api/storefrontQueries';
import { CatalogLoadError } from './CatalogLoadError';
import { DiscoverProductCard } from './DiscoverProductCard';
import { StorefrontProductDetailModal } from './StorefrontProductDetailModal';
import { isStorefrontProductOutOfStock } from './storefrontStock';
import { useRevealMore } from './useRevealMore';
import { useStorefrontCartActions } from '../cart/storefrontMultiCartContext';
import { useToast } from '../../../app/contexts/useToast';
import type { StorefrontProduct, StorefrontProductFilters } from '../api/storefrontTypes';
import { StorefrontFilterBar } from './StorefrontFilterBar';
import { hasActiveFilters } from './storefrontFilterUrl';

const RENDER_CHUNK = 36;
const AUTO_PAGE_CAP = 3;
const SEARCH_DEBOUNCE_MS = 300;

/** Products from all shops — category chips + progressive server search. */
export function DiscoverProductsBrowse() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('');
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);
  const [filters, setFilters] = useState<StorefrontProductFilters>({});
  const { data: categories = [] } = useStorefrontCategories();
  const { addProduct } = useStorefrontCartActions();
  const { showToast } = useToast();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  const searchQ = debouncedQ.trim();
  const {
    data,
    isLoading,
    isError,
    isFetchNextPageError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useStorefrontDiscoverInfinite(category, searchQ, filters);

  const pageCount = data?.pages.length ?? 0;

  useEffect(() => {
    if (
      hasNextPage
      && !isFetchingNextPage
      && !isFetchNextPageError
      && pageCount > 0
      && pageCount < (searchQ ? 8 : AUTO_PAGE_CAP)
    ) {
      void fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    pageCount,
    searchQ,
  ]);

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.products) ?? [],
    [data?.pages],
  );

  // Server already filtered when searchQ is set; light client refine while debounce catches up.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    if (needle === searchQ) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.business?.name ?? ''} ${p.business?.city ?? ''} ${p.category?.name ?? ''} ${p.type ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q, searchQ]);

  const listKey = `${category}|${q.trim()}|${JSON.stringify(filters)}`;
  const totalMeta = data?.pages[0]?.meta.total;
  const { visible, sentinelRef, revealMore } = useRevealMore({
    chunk: RENDER_CHUNK,
    count: filtered.length,
    hasNextPage: Boolean(hasNextPage),
    resetKey: listKey,
    onLoadMore: () => {
      if (!isFetchingNextPage) void fetchNextPage();
    },
  });
  const shown = filtered.slice(0, visible);

  const handleOpenDetail = useCallback((product: StorefrontProduct) => setDetail(product), []);

  const handleAdd = useCallback((product: StorefrontProduct) => {
    const biz = product.business;
    if (!biz) {
      showToast('error', 'This product is not linked to a shop yet.');
      return;
    }
    if (isStorefrontProductOutOfStock(product)) {
      showToast('error', 'This item is out of stock');
      return;
    }
    addProduct(
      {
        name: biz.name,
        slug: biz.slug,
        currency: biz.currency,
        city: biz.city,
        logo_path: biz.logo_path,
      },
      product,
    );
  }, [addProduct, showToast]);

  if (!data && isLoading) {
    return (
      <CustosellLoader message="Loading products — gathering listed products and services across businesses." />
    );
  }

  if (isError && !data) {
    return (
      <CatalogLoadError
        title="Could not load products"
        detail="The catalog request failed. Check your connection, then retry."
        onRetry={() => { void refetch(); }}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {(isFetchNextPageError || (isError && data)) ? (
        <CatalogLoadError
          compact
          title="Couldn’t load more products"
          detail="Showing what we have so far. Retry to continue."
          onRetry={() => { void (isFetchNextPageError ? fetchNextPage() : refetch()); }}
          retrying={isFetchingNextPage || isFetching}
        />
      ) : null}

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              !category
                ? 'border-amber-500 bg-amber-50 text-amber-950'
                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300',
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(String(c.id))}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                category === String(c.id)
                  ? 'border-amber-500 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300',
              )}
            >
              {c.name}
              {c.product_count != null ? (
                <span className="ml-1 tabular-nums text-[10px] opacity-70">{c.product_count}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5', 'rounded-none sm:rounded-2xl')}>
        <Search className="h-4 w-4 shrink-0 text-amber-700" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products and services across all businesses…"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
          {filtered.length}
          {totalMeta != null ? ` / ${totalMeta}` : ''}
          {isFetchingNextPage ? ' · loading…' : ''}
        </span>
      </div>

      <StorefrontFilterBar scope="products" filters={filters} onChange={(next) => setFilters(next as StorefrontProductFilters)} />

      {filtered.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center', 'rounded-none sm:rounded-2xl')}>
          <Package className="h-10 w-10 text-amber-700" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {products.length === 0
              ? 'No products or services listed'
              : hasActiveFilters(filters)
                ? 'No products match the current filters'
                : `No products or services match “${q.trim() || 'filter'}”`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {products.length === 0
              ? 'Products and services appear when businesses list items for their public storefront.'
              : hasActiveFilters(filters)
                ? 'Try adjusting or clearing the filters above.'
                : 'Try another category or search — filtering is instant on this device.'}
          </p>
          {hasActiveFilters(filters) ? (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shown.map((p) => (
              <DiscoverProductCard
                key={`${p.id}-${p.business?.slug ?? ''}`}
                product={p}
                onAdd={handleAdd}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
          {filtered.length > visible || hasNextPage ? (
            <>
              <button
                type="button"
                className="mx-auto rounded-xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                disabled={isFetchingNextPage && filtered.length <= visible}
                onClick={revealMore}
              >
                {isFetchingNextPage
                  ? 'Loading more…'
                  : filtered.length > visible
                    ? `Show more (${filtered.length - visible}${hasNextPage ? '+' : ''})`
                    : 'Show more…'}
              </button>
              <div ref={sentinelRef} className="h-px w-full" aria-hidden />
            </>
          ) : null}
        </>
      )}

      {detail ? (
        <StorefrontProductDetailModal
          product={detail}
          isOpen
          onClose={() => setDetail(null)}
          onRated={setDetail}
        />
      ) : null}
    </div>
  );
}
