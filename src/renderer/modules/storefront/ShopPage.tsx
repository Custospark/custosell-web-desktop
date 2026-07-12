import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ShoppingBag, Phone, Package } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useToast } from '../../app/contexts/useToast';
import { avatarUrl } from '../../shared/utils/avatarUrl';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import {
  useStorefrontShop,
  useStorefrontShopProducts,
} from './api/storefrontQueries';
import type { StorefrontProduct } from './api/storefrontTypes';
import { useStorefrontMultiCart } from './cart/storefrontMultiCartContext';
import { storefrontShareUrl, whatsappShareUrl } from './storefrontShare';
import { useDiscoverShell } from './ui/discoverShellContext';

function slugFromShopHandle(shopHandle: string | undefined): string | null {
  if (!shopHandle || !shopHandle.startsWith('@')) return null;
  const slug = shopHandle.slice(1).trim().toLowerCase();
  return slug.length > 0 ? slug : null;
}

/** Shop catalog inside DiscoverLayout — checkout lives in the cart hub. */
export default function ShopPage() {
  const { shopHandle } = useParams<{ shopHandle: string }>();
  const slug = slugFromShopHandle(shopHandle);
  const { showToast } = useToast();
  const shell = useDiscoverShell();
  const { addProduct, openCart, getBag } = useStorefrontMultiCart();
  const shopQuery = useStorefrontShop(slug ?? '');
  const productsQuery = useStorefrontShopProducts(slug ?? '');

  const shop = shopQuery.data ?? productsQuery.data?.shop;
  const products = productsQuery.data?.products ?? [];
  const currency = shop?.currency || 'UGX';
  const bag = slug ? getBag(slug) : null;
  const bagCount = bag?.items.length ?? 0;

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
    return <LoadingSkeleton variant="minimal" message="Loading shop…" />;
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
      <div className={cn(marketplaceGlassPanel, 'px-3 py-2.5')}>
        <p className="text-xs text-slate-600">
          Add items to this shop’s bag. Cart keeps separate bags when you shop multiple businesses.
        </p>
      </div>
      {products.length === 0 ? (
        <div className={cn(marketplaceGlassPanel, 'px-4 py-8')}>
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No products listed"
            description="This shop has not listed products yet."
          />
        </div>
      ) : (
        <ul className="space-y-1.5">
          {products.map((p) => (
            <li
              key={p.id}
              className={cn(
                marketplaceGlassPanel,
                'flex items-center gap-3 px-3 py-2.5 shadow-md transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-900/10',
                'active:translate-y-0 active:scale-[0.99]',
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {p.image_path ? (
                  <img src={avatarUrl(p.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm font-semibold tabular-nums text-teal-900">
                  {formatCurrency(Number(p.unit_price), currency)}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onAdd(p)}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
