import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Phone, Search, ShoppingBag, Mail, MapPin } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useToast } from '../../app/contexts/useToast';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import {
  useRateStorefrontShop,
  useStorefrontShop,
  useStorefrontShopProductsInfinite,
} from './api/storefrontQueries';
import type { StorefrontProduct, StorefrontShop } from './api/storefrontTypes';
import { useStorefrontCartActions } from './cart/storefrontMultiCartContext';
import { selectStorefrontBagBySlug } from './cart/storefrontCartSlice';
import { storefrontShareUrl, whatsappShareUrl } from './storefrontShare';
import { DiscoverProductCard } from './ui/DiscoverProductCard';
import { ProductStarRating } from './ui/ProductStarRating';
import { StorefrontProductDetailModal } from './ui/StorefrontProductDetailModal';
import { StorefrontQrCode } from './ui/StorefrontQrCode';
import { StorefrontSocialLinks } from './ui/StorefrontSocialLinks';
import { isStorefrontProductOutOfStock } from './ui/storefrontStock';
import { useRevealMore } from './ui/useRevealMore';
import { useDiscoverShell } from './ui/discoverShellContext';

function shopLocationLine(shop: StorefrontShop): string {
  return [shop.address, shop.city, shop.state, shop.country].filter(Boolean).join(', ');
}

/** Shop catalog — compact product grid; checkout in cart hub. Route: /discover/shop/:slug */
export default function ShopPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugParam?.trim().toLowerCase() || null;
  const { showToast } = useToast();
  const shell = useDiscoverShell();
  const { setHeader, requestSignIn } = shell;
  const token = useAppSelector((s) => s.auth.token);
  const { addProduct, openCart } = useStorefrontCartActions();
  const bag = useAppSelector(selectStorefrontBagBySlug(slug ?? ''));
  const shopQuery = useStorefrontShop(slug ?? '');
  const productsQuery = useStorefrontShopProductsInfinite(slug ?? '');
  const rateShop = useRateStorefrontShop();
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);

  const shop = shopQuery.data ?? productsQuery.data?.pages[0]?.shop;
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.products) ?? [],
    [productsQuery.data?.pages],
  );
  const currency = shop?.currency || 'UGX';
  const bagCount = bag?.items.length ?? 0;
  const locationLine = shop ? shopLocationLine(shop) : '';

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.category?.name ?? ''} ${p.type ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q]);

  const hasNextPage = productsQuery.hasNextPage ?? false;
  const { visible, sentinelRef, revealMore } = useRevealMore({
    chunk: 36,
    count: filtered.length,
    hasNextPage,
    resetKey: `${slug}|${q.trim().toLowerCase()}`,
    onLoadMore: () => {
      if (!productsQuery.isFetchingNextPage) void productsQuery.fetchNextPage();
    },
  });
  const shown = filtered.slice(0, visible);

  useEffect(() => {
    if (!shop) {
      setHeader({ title: 'Shop', subtitle: 'Loading…' });
      return () => {
        setHeader(null);
      };
    }
    const shareUrl = storefrontShareUrl(shop.slug);
    const loc = shopLocationLine(shop);
    setHeader({
      title: shop.name,
      subtitle: loc ? `@${shop.slug} · ${loc}` : `@${shop.slug}`,
      actions: (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {bagCount > 0 ? (
            <button
              type="button"
              className="rounded-md border border-emerald-300/90 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-900 sm:rounded-xl sm:border-2 sm:px-2.5 sm:text-xs"
              onClick={() => openCart(shop.slug)}
            >
              Cart ({bagCount})
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] font-semibold hover:bg-white sm:rounded-lg sm:text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              showToast('success', 'Shop link copied');
            }}
          >
            <span>Copy business Link</span>
          </button>
          <a
            href={whatsappShareUrl(`Order from ${shop.name}: ${shareUrl}`)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] font-semibold hover:bg-white sm:rounded-lg sm:text-xs"
          >
            WhatsApp
          </a>
          {shop.business_phone ? (
            <a
              href={`tel:${shop.business_phone}`}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] font-semibold text-blue-700 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-xs"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          ) : null}
        </div>
      ),
    });
    return () => {
      setHeader(null);
    };
  }, [shop, setHeader, showToast, bagCount, openCart]);

  const openDetail = useCallback((product: StorefrontProduct) => setDetail(product), []);
  const onAdd = useCallback((product: StorefrontProduct) => {
    if (!shop) return;
    if (isStorefrontProductOutOfStock(product)) {
      showToast('error', 'This item is out of stock');
      return;
    }
    addProduct(
      {
        name: shop.name,
        slug: shop.slug,
        currency: shop.currency,
        city: shop.city,
        logo_path: shop.logo_path,
      },
      product,
    );
  }, [shop, addProduct, showToast]);

  if (!slug) {
    return <Navigate to={`${ROUTES.DISCOVER}?focus=shops`} replace />;
  }

  const applyShopRating = (stars: number) => {
    if (!shop) return;
    const submit = () => {
      rateShop.mutate(
        { slug: shop.slug, rating: stars },
        {
          onError: () => showToast('error', 'Could not save shop rating. Try again.'),
        },
      );
    };
    if (!token) {
      requestSignIn({ intent: 'general', onSuccess: submit });
      return;
    }
    submit();
  };

  if (shopQuery.isLoading) {
    return <CustosellLoader message="Loading this shop — pulling the catalog so you can browse and add to cart." />;
  }

  // Enabled shop with zero listings is a valid shop — only fail when the shop API itself fails.
  if (shopQuery.isError || (shopQuery.isFetched && !shop)) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto max-w-md px-5 py-12 text-center', 'rounded-none sm:rounded-2xl')}>
        <h2 className="text-lg font-bold text-slate-900">Shop not found</h2>
        <p className="mt-2 text-sm text-slate-600">
          This shop may be closed, not published yet, or the username in the link is wrong.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          If you own this shop, open Settings → Sales channels, check your username, enable the public shop, and Save.
          An enabled shop with no products still opens — it shows an empty catalog, not this message.
        </p>
        <Link
          to={`${ROUTES.DISCOVER}?focus=shops`}
          className="mt-4 inline-flex text-sm font-semibold text-indigo-800 hover:underline"
        >
          Browse businesses
        </Link>
      </div>
    );
  }

  if (!shop) {
    return <CustosellLoader message="Loading this shop — pulling the catalog so you can browse and add to cart." />;
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className={cn(marketplaceGlassPanel, 'space-y-2.5 px-4 py-3.5', 'rounded-none sm:rounded-2xl')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            {shop.description ? (
              <p className="text-sm leading-relaxed text-slate-700">{shop.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
              {locationLine ? (
                <span className="inline-flex max-w-full items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-700" aria-hidden />
                  <span className="min-w-0">{locationLine}</span>
                </span>
              ) : null}
              {shop.business_phone ? (
                <a
                  href={`tel:${shop.business_phone}`}
                  className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {shop.business_phone}
                </a>
              ) : null}
              {shop.business_email ? (
                <a
                  href={`mailto:${shop.business_email}`}
                  className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {shop.business_email}
                </a>
              ) : null}
            </div>
            <ProductStarRating
              avg={Number(shop.rating_avg ?? 0)}
              count={Number(shop.rating_count ?? 0)}
              myRating={shop.my_rating}
              disabled={rateShop.isPending}
              onRate={applyShopRating}
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
            <StorefrontSocialLinks
              links={shop.social_links ?? []}
              className="min-w-0 justify-center sm:max-w-lg sm:flex-1 sm:justify-end"
            />
            <StorefrontQrCode
              slug={shop.slug}
              size={96}
              className="mx-auto shrink-0 sm:mx-0"
            />
          </div>
        </div>
      </div>

      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5', 'rounded-none sm:rounded-2xl')}>
        <Search className="h-4 w-4 shrink-0 text-indigo-700" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search this shop…"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        <span className="text-[11px] font-medium tabular-nums text-slate-500">
          {filtered.length} / {products.length}
        </span>
      </div>

      {productsQuery.isLoading ? (
        <CustosellLoader message="Loading products — fetching what this shop has listed." />
      ) : productsQuery.isError ? (
        <div className={cn(marketplaceGlassPanel, 'px-5 py-10 text-center text-sm text-slate-600', 'rounded-none sm:rounded-2xl')}>
          Could not load products for this shop. Try refreshing.
        </div>
      ) : products.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-4 py-8', 'rounded-none sm:rounded-2xl')}>
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No products listed yet"
            description="This public shop is open, but the owner has not listed any products for sale online yet."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-5 py-10 text-center text-sm text-slate-600', 'rounded-none sm:rounded-2xl')}>
          No products match “{q.trim()}”.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shown.map((p) => (
              <DiscoverProductCard
                key={p.id}
                product={p}
                currency={currency}
                shopSlug={shop.slug}
                onAdd={onAdd}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
          {filtered.length > visible || hasNextPage ? (
            <>
              <button
                type="button"
                className="mx-auto rounded-xl border-2 border-indigo-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                disabled={productsQuery.isFetchingNextPage && filtered.length <= visible}
                onClick={revealMore}
              >
                {productsQuery.isFetchingNextPage
                  ? 'Loading more…'
                  : filtered.length > visible
                    ? `Show more (${filtered.length - visible}${hasNextPage ? '+' : ''})`
                    : 'Load more products'}
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
          onAdd={onAdd}
          onRated={setDetail}
          shopSlug={shop.slug}
          currency={currency}
        />
      ) : null}
    </div>
  );
}
