import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Phone, Search, ShoppingBag } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useToast } from '../../app/contexts/useToast';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import {
  useStorefrontShop,
  useStorefrontShopProducts,
} from './api/storefrontQueries';
import type { StorefrontProduct } from './api/storefrontTypes';
import { useStorefrontMultiCart } from './cart/storefrontMultiCartContext';
import { storefrontShareUrl, whatsappShareUrl } from './storefrontShare';
import { DiscoverProductCard } from './ui/DiscoverProductCard';
import { useDiscoverShell } from './ui/discoverShellContext';

function slugFromShopHandle(shopHandle: string | undefined): string | null {
  if (!shopHandle || !shopHandle.startsWith('@')) return null;
  const slug = shopHandle.slice(1).trim().toLowerCase();
  return slug.length > 0 ? slug : null;
}

/** Shop catalog — compact product grid; checkout in cart hub. */
export default function ShopPage() {
  const { shopHandle } = useParams<{ shopHandle: string }>();
  const slug = slugFromShopHandle(shopHandle);
  const { showToast } = useToast();
  const shell = useDiscoverShell();
  const { addProduct, openCart, getBag } = useStorefrontMultiCart();
  const shopQuery = useStorefrontShop(slug ?? '');
  const productsQuery = useStorefrontShopProducts(slug ?? '');
  const [q, setQ] = useState('');

  const shop = shopQuery.data ?? productsQuery.data?.shop;
  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products],
  );
  const currency = shop?.currency || 'UGX';
  const bag = slug ? getBag(slug) : null;
  const bagCount = bag?.items.length ?? 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.category?.name ?? ''} ${p.type ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q]);

  useEffect(() => {
    if (!shop) {
      shell.setHeader({ title: 'Shop', subtitle: 'Loading…' });
      return;
    }
    const shareUrl = storefrontShareUrl(shop.slug);
    shell.setHeader({
      title: shop.name,
      subtitle: `@${shop.slug}${shop.city ? ` · ${shop.city}` : ''}`,
      actions: (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {bagCount > 0 ? (
            <button
              type="button"
              className="rounded-xl border-2 border-emerald-300/90 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 sm:text-xs"
              onClick={() => openCart(shop.slug)}
            >
              Cart ({bagCount})
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] font-semibold hover:bg-white sm:text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              showToast('success', 'Shop link copied');
            }}
          >
            Copy link
          </button>
          <a
            href={whatsappShareUrl(`Order from ${shop.name}: ${shareUrl}`)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-[11px] font-semibold hover:bg-white sm:text-xs"
          >
            WhatsApp
          </a>
          {shop.business_phone ? (
            <a href={`tel:${shop.business_phone}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          ) : null}
        </div>
      ),
    });
  }, [shop, shell, showToast, bagCount, openCart]);

  useEffect(() => () => {
    shell.setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!slug) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }

  const onAdd = (product: StorefrontProduct) => {
    if (!shop) return;
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
  };

  if (shopQuery.isLoading || productsQuery.isLoading) {
    return (
      <LoadingSkeleton
        variant="page"
        message="Loading this shop…"
        detail="Pulling the catalog so you can browse and add to cart."
      />
    );
  }

  if (shopQuery.isError || !shop) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto max-w-md px-5 py-12 text-center')}>
        <h2 className="text-lg font-bold text-slate-900">Shop not found</h2>
        <p className="mt-2 text-sm text-slate-600">This shop may be closed or the link is incorrect.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className={cn(marketplaceGlassPanel, 'flex items-center gap-2 px-3 py-2.5')}>
        <Search className="h-4 w-4 shrink-0 text-teal-700" />
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

      {products.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-4 py-8')}>
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No products listed"
            description="This shop has not listed products yet."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-5 py-10 text-center text-sm text-slate-600')}>
          No products match “{q.trim()}”.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <DiscoverProductCard
              key={p.id}
              product={p}
              currency={currency}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
