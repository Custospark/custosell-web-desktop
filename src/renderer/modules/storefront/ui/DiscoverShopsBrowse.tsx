import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useStorefrontShopsInfinite } from '../api/storefrontQueries';
import type { StorefrontShop } from '../api/storefrontTypes';
import { shopVisual } from './productVisual';

const RENDER_CHUNK = 36;

/** Browse all public shops — progressive fetch + client-side search. */
export function DiscoverShopsBrowse() {
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(RENDER_CHUNK);
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useStorefrontShopsInfinite();

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages.length]);

  const shops = useMemo(
    () => data?.pages.flatMap((p) => p.shops) ?? [],
    [data?.pages],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return shops;
    return shops.filter((s) => {
      const hay = `${s.name} ${s.slug} ${s.city ?? ''} ${s.description ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [shops, q]);

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
        message="Loading shops…"
        detail="Finding businesses with a public storefront for you."
      />
    );
  }

  if (isError) {
    return <p className="text-sm text-red-600">Could not load shops. Check your connection.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5')}>
        <Search className="h-4 w-4 shrink-0 text-teal-700" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shops by name, city, or @username…"
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
          <Store className="h-10 w-10 text-teal-600" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {shops.length === 0 ? 'No shops yet' : `No shops match “${q.trim()}”`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {shops.length === 0
              ? 'Businesses appear when they enable a public storefront.'
              : 'Try another search — filtering is instant on this device.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((shop) => (
              <ShopTile key={shop.slug} shop={shop} />
            ))}
          </div>
          {filtered.length > visible ? (
            <button
              type="button"
              className="mx-auto rounded-xl border-2 border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

function ShopTile({ shop }: { shop: StorefrontShop }) {
  const visual = shopVisual(shop.name);
  const { Icon, wrap, icon } = visual;

  return (
    <Link
      to={ROUTES.SHOP(shop.slug)}
      className={cn(
        marketplaceGlassPanel,
        'flex gap-3 p-3 shadow-md transition-all duration-200',
        'hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-900/15',
        'active:scale-[0.99]',
      )}
    >
      <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl', wrap)}>
        {shop.logo_path ? (
          <img src={avatarUrl(shop.logo_path) ?? undefined} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className={cn('h-7 w-7', icon)} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{shop.name}</p>
        <p className="truncate text-[11px] text-teal-800">@{shop.slug}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {[shop.city, shop.country].filter(Boolean).join(' · ') || 'Browse catalog'}
        </p>
      </div>
      <span className="self-center text-xs font-semibold text-teal-800">Open →</span>
    </Link>
  );
}
