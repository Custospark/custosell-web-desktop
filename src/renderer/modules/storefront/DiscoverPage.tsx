import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Search, Store } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { avatarUrl } from '../../shared/utils/avatarUrl';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import {
  useStorefrontDiscover,
  useStorefrontShops,
} from './api/storefrontQueries';
import type { StorefrontShop } from './api/storefrontTypes';
import { useDiscoverShell } from './ui/discoverShellContext';
import { DiscoverShopRow } from './ui/DiscoverShopRow';

const CHUNK = 40;

/**
 * Strip modes:
 * - Shops (Browse) → businesses
 * - Products (Discover) → cross-shop catalog; open that shop to order
 * Each shop checkout is separate — orders go to the business you ordered from.
 */
export default function DiscoverPage() {
  const shell = useDiscoverShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get('focus') === 'products' ? 'products' : 'shops';

  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(CHUNK);
  const search = q.trim();
  const listKey = `${focus}:${search}`;
  const [listKeySeen, setListKeySeen] = useState(listKey);
  if (listKey !== listKeySeen) {
    setListKeySeen(listKey);
    setVisible(CHUNK);
  }

  const shopsQuery = useStorefrontShops(search);
  const productsQuery = useStorefrontDiscover(search, '');

  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);
  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data?.products]);
  const visibleShops = useMemo(() => shops.slice(0, visible), [shops, visible]);
  const visibleProducts = useMemo(() => products.slice(0, visible), [products, visible]);

  useEffect(() => {
    shell.setHeader({
      title: focus === 'products' ? 'Products' : 'Shops',
      subtitle:
        focus === 'products'
          ? 'Open a product’s shop to place an order with that business'
          : 'Open a business to browse its catalog and order',
    });
    shell.setCartCount(0);
    return () => {
      shell.setHeader(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const isLoading = focus === 'shops' ? shopsQuery.isLoading : productsQuery.isLoading;
  const isError = focus === 'shops' ? shopsQuery.isError : productsQuery.isError;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className={cn(marketplaceGlassPanel, 'flex shrink-0 flex-col gap-2 px-3 py-2.5 shadow-md sm:flex-row sm:items-center')}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={focus === 'shops' ? 'Search businesses…' : 'Search products…'}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={focus === 'shops' ? 'primary' : 'secondary'}
            onClick={() => setSearchParams({ focus: 'shops' }, { replace: true })}
          >
            Shops
          </Button>
          <Button
            type="button"
            size="sm"
            variant={focus === 'products' ? 'primary' : 'secondary'}
            onClick={() => setSearchParams({ focus: 'products' }, { replace: true })}
          >
            Products
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="minimal" message={focus === 'shops' ? 'Loading shops…' : 'Loading products…'} />
      ) : isError ? (
        <p className="px-1 text-sm text-red-600">Could not load Discover. Check your connection and try again.</p>
      ) : focus === 'shops' ? (
        <ShopsList shops={visibleShops} total={shops.length} visible={visible} onMore={() => setVisible((n) => n + CHUNK)} />
      ) : (
        <ProductsList
          products={visibleProducts}
          total={productsQuery.data?.meta?.total ?? products.length}
          hasMore={products.length > visible}
          remaining={products.length - visible}
          onMore={() => setVisible((n) => n + CHUNK)}
        />
      )}
    </div>
  );
}

function ShopsList({
  shops,
  total,
  visible,
  onMore,
}: {
  shops: StorefrontShop[];
  total: number;
  visible: number;
  onMore: () => void;
}) {
  if (total === 0) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center shadow-md')}>
        <Store className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">No shops yet</p>
        <p className="mt-1 text-xs text-slate-600">Businesses appear when they enable a public storefront.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
      <p className="px-0.5 text-[11px] font-medium tabular-nums text-slate-500">
        {total} business{total === 1 ? '' : 'es'}
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => (
          <Link key={shop.slug} to={ROUTES.SHOP(shop.slug)} className="block min-w-0">
            <DiscoverShopRow shop={shop} />
          </Link>
        ))}
      </div>
      {total > visible ? (
        <div className="flex justify-center py-2">
          <Button type="button" variant="secondary" onClick={onMore}>
            Show more ({total - visible})
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ProductsList({
  products,
  total,
  hasMore,
  remaining,
  onMore,
}: {
  products: {
    id: number;
    name: string;
    unit_price: string | number;
    image_path: string | null;
    business?: { name: string; slug: string; city: string | null; currency: string } | null;
  }[];
  total: number;
  hasMore: boolean;
  remaining: number;
  onMore: () => void;
}) {
  if (products.length === 0) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center shadow-md')}>
        <Package className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">No products listed</p>
        <p className="mt-1 text-xs text-slate-600">Products appear when shops list items for their public storefront.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
      <p className="px-0.5 text-[11px] font-medium tabular-nums text-slate-500">
        {total} product{total === 1 ? '' : 's'}
      </p>
      <ul className="space-y-1.5">
        {products.map((p) => {
          const currency = p.business?.currency || 'UGX';
          const slug = p.business?.slug;
          if (!slug) return null;
          return (
            <li key={`${p.id}-${slug}`}>
              <Link
                to={ROUTES.SHOP(slug)}
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
                  <p className="truncate text-[11px] text-slate-500">
                    {p.business?.name}{p.business?.city ? ` · ${p.business.city}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-teal-800">Order →</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <div className="flex justify-center py-2">
          <Button type="button" variant="secondary" onClick={onMore}>
            Show more ({remaining})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
