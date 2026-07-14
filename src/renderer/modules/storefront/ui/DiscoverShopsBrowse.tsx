import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Search, Store } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useToast } from '../../../app/contexts/useToast';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useRateStorefrontShop, useStorefrontShopsInfinite } from '../api/storefrontQueries';
import type { StorefrontShop } from '../api/storefrontTypes';
import { useDiscoverShell } from './discoverShellContext';
import { ProductStarRating } from './ProductStarRating';
import { CatalogLoadError } from './CatalogLoadError';
import { StorefrontQrCode } from './StorefrontQrCode';
import { shopVisual } from './productVisual';

const RENDER_CHUNK = 36;
const AUTO_PAGE_CAP = 3;
const SEARCH_DEBOUNCE_MS = 300;

/** Strip leading @ so "@cafe" matches slug "cafe". */
function normalizeShopSearch(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

function shopLocation(shop: StorefrontShop): string {
  return [shop.address, shop.city, shop.state, shop.country].filter(Boolean).join(', ');
}

/** Browse all public shops — server search (name / city / @slug) + progressive pages. */
export function DiscoverShopsBrowse() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [visible, setVisible] = useState(RENDER_CHUNK);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  const searchQ = normalizeShopSearch(debouncedQ);
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
  } = useStorefrontShopsInfinite(searchQ);

  const pageCount = data?.pages.length ?? 0;
  const autoCap = searchQ ? 8 : AUTO_PAGE_CAP;

  useEffect(() => {
    if (
      hasNextPage
      && !isFetchingNextPage
      && !isFetchNextPageError
      && pageCount > 0
      && pageCount < autoCap
    ) {
      void fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    pageCount,
    autoCap,
  ]);

  const shops = useMemo(
    () => data?.pages.flatMap((p) => p.shops) ?? [],
    [data?.pages],
  );

  // Server already filtered when searchQ is set; light client refine while debounce catches up.
  const filtered = useMemo(() => {
    const needle = normalizeShopSearch(q);
    if (!needle) return shops;
    if (needle === searchQ) return shops;
    return shops.filter((s) => {
      const hay = [
        s.name,
        s.slug,
        s.city,
        s.country,
        s.address,
        s.description,
        s.business_email,
        s.business_phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [shops, q, searchQ]);

  const listKey = `${searchQ}|${q.trim()}`;
  const [seen, setSeen] = useState(listKey);
  if (listKey !== seen) {
    setSeen(listKey);
    setVisible(RENDER_CHUNK);
  }

  const shown = filtered.slice(0, visible);
  const totalMeta = data?.pages[0]?.meta.total;
  const needsMoreLoaded = visible + RENDER_CHUNK > shops.length && Boolean(hasNextPage);

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
        message="Loading businesses…"
        detail="Finding businesses with a public storefront for you."
      />
    );
  }

  if (isError && !data) {
    return (
      <CatalogLoadError
        title="Could not load businesses"
        detail="The request failed. Check your connection, then retry."
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
          title="Couldn’t load more businesses"
          detail="Showing what we have so far. Retry to continue."
          onRetry={() => { void (isFetchNextPageError ? fetchNextPage() : refetch()); }}
          retrying={isFetchingNextPage || isFetching}
        />
      ) : null}

      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5')}>
        <Search className="h-4 w-4 shrink-0 text-teal-700" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search businesses by name, city, contact, or @username…"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
          {filtered.length}
          {totalMeta != null ? ` / ${totalMeta}` : ''}
          {isFetchingNextPage || (isFetching && Boolean(searchQ)) ? ' · loading…' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center')}>
          <Store className="h-10 w-10 text-teal-600" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {shops.length === 0 && !searchQ ? 'No businesses yet' : `No businesses match “${q.trim()}”`}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {shops.length === 0 && !searchQ
              ? 'Businesses appear when they enable a public storefront.'
              : 'Try the business name or @username (with or without @).'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((shop) => (
              <ShopTile key={shop.slug} shop={shop} />
            ))}
          </div>
          {filtered.length > visible || hasNextPage ? (
            <button
              type="button"
              className="mx-auto rounded-xl border-2 border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              disabled={isFetchingNextPage && filtered.length <= visible}
              onClick={onShowMore}
            >
              {isFetchingNextPage
                ? 'Loading more…'
                : filtered.length > visible
                  ? `Show more (${filtered.length - visible}${hasNextPage ? '+' : ''})`
                  : 'Load more businesses'}
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
  const location = shopLocation(shop);
  const token = useAppSelector((s) => s.auth.token);
  const { requestSignIn } = useDiscoverShell();
  const { showToast } = useToast();
  const rateShop = useRateStorefrontShop();

  const applyRating = (stars: number) => {
    const submit = () => {
      rateShop.mutate(
        { slug: shop.slug, rating: stars },
        { onError: () => showToast('error', 'Could not save shop rating. Try again.') },
      );
    };
    if (!token) {
      requestSignIn({ intent: 'general', onSuccess: submit });
      return;
    }
    submit();
  };

  return (
    <article
      className={cn(
        marketplaceGlassPanel,
        'flex gap-2.5 p-3 shadow-md transition-all duration-200',
        'hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-900/15',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Link to={ROUTES.SHOP(shop.slug)} className="flex gap-3 outline-none">
          <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden sm:rounded-xl', wrap)}>
            {shop.logo_path ? (
              <img src={avatarUrl(shop.logo_path) ?? undefined} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className={cn('h-7 w-7', icon)} aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{shop.name}</p>
            <p className="truncate text-[11px] text-teal-800">@{shop.slug}</p>
            {shop.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">{shop.description}</p>
            ) : null}
          </div>
        </Link>
        <ProductStarRating
          avg={Number(shop.rating_avg ?? 0)}
          count={Number(shop.rating_count ?? 0)}
          myRating={shop.my_rating}
          disabled={rateShop.isPending}
          onRate={applyRating}
        />
        <div className="space-y-1 border-t border-slate-200/70 pt-2 text-[11px] text-slate-600">
          {location ? (
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-teal-700" aria-hidden />
              <span className="line-clamp-2">{location}</span>
            </p>
          ) : null}
          {shop.business_phone ? (
            <p className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 shrink-0 text-teal-700" aria-hidden />
              <span>{shop.business_phone}</span>
            </p>
          ) : null}
          {shop.business_email ? (
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0 text-teal-700" aria-hidden />
              <span>{shop.business_email}</span>
            </p>
          ) : null}
          {!location && !shop.business_phone && !shop.business_email ? (
            <p className="text-slate-400">Open shop to browse the catalog</p>
          ) : null}
        </div>
        <Link to={ROUTES.SHOP(shop.slug)} className="text-xs font-semibold text-teal-800 hover:underline">
          Open shop →
        </Link>
      </div>
      <StorefrontQrCode
        slug={shop.slug}
        size={72}
        label=""
        className="w-[4.5rem] shrink-0 self-start"
      />
    </article>
  );
}
