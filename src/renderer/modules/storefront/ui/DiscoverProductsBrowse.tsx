import { useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useStorefrontDiscoverInfinite } from '../api/storefrontQueries';
import { CatalogLoadError } from './CatalogLoadError';
import { DiscoverProductCard } from './DiscoverProductCard';

const RENDER_CHUNK = 36;
/** Warm a few pages in the background; more load when the user asks for “Show more”. */
const AUTO_PAGE_CAP = 3;

/** Products from all shops — progressive fetch + client-side search. */
export function DiscoverProductsBrowse() {
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(RENDER_CHUNK);
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
  } = useStorefrontDiscoverInfinite();

  const pageCount = data?.pages.length ?? 0;

  useEffect(() => {
    if (
      hasNextPage
      && !isFetchingNextPage
      && !isFetchNextPageError
      && pageCount > 0
      && pageCount < AUTO_PAGE_CAP
    ) {
      void fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    pageCount,
  ]);

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.products) ?? [],
    [data?.pages],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.business?.name ?? ''} ${p.business?.city ?? ''} ${p.category?.name ?? ''} ${p.type ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q]);

  const listKey = q.trim();
  const [seen, setSeen] = useState(listKey);
  if (listKey !== seen) {
    setSeen(listKey);
    setVisible(RENDER_CHUNK);
  }

  const shown = filtered.slice(0, visible);
  const totalMeta = data?.pages[0]?.meta.total;
  const needsMoreLoaded = visible + RENDER_CHUNK > products.length && Boolean(hasNextPage);

  const onShowMore = () => {
    setVisible((n) => n + RENDER_CHUNK);
    if (needsMoreLoaded && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  if (!data && isLoading) {
    return (
      <LoadingSkeleton
        variant="page"
        message="Loading products…"
        detail="Gathering listed products across shops — almost ready."
      />
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

      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5')}>
        <Search className="h-4 w-4 shrink-0 text-amber-700" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products across all shops…"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
          {filtered.length}
          {totalMeta != null ? ` / ${totalMeta}` : ''}
          {isFetchingNextPage ? ' · loading…' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center')}>
          <Package className="h-10 w-10 text-amber-700" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {products.length === 0 ? 'No products listed' : `No products match “${q.trim()}”`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {products.length === 0
              ? 'Products appear when shops list items for their public storefront.'
              : 'Try another search — filtering is instant on this device.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((p) => (
              <DiscoverProductCard key={`${p.id}-${p.business?.slug ?? ''}`} product={p} />
            ))}
          </div>
          {filtered.length > visible || hasNextPage ? (
            <button
              type="button"
              className="mx-auto rounded-xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              disabled={isFetchingNextPage && filtered.length <= visible}
              onClick={onShowMore}
            >
              {isFetchingNextPage
                ? 'Loading more…'
                : filtered.length > visible
                  ? `Show more (${filtered.length - visible}${hasNextPage ? '+' : ''})`
                  : 'Load more products'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
