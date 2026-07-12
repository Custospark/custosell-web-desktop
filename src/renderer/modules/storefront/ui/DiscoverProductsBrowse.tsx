import { useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useStorefrontDiscoverInfinite } from '../api/storefrontQueries';
import { DiscoverProductCard } from './DiscoverProductCard';

const RENDER_CHUNK = 36;

/** Products from all shops — progressive fetch + client-side search. */
export function DiscoverProductsBrowse() {
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(RENDER_CHUNK);
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useStorefrontDiscoverInfinite();

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages.length]);

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

  if (!data && isLoading) {
    return (
      <LoadingSkeleton
        variant="page"
        message="Loading products…"
        detail="Gathering listed products across shops — almost ready."
      />
    );
  }

  if (isError) {
    return <p className="text-sm text-red-600">Could not load products. Check your connection.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-3">
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
          {filtered.length > visible ? (
            <button
              type="button"
              className="mx-auto rounded-xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => setVisible((n) => n + RENDER_CHUNK)}
            >
              Show more ({filtered.length - visible})
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
