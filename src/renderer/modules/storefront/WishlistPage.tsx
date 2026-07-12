import { useEffect, useState } from 'react';
import { Heart, Package } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useToast } from '../../app/contexts/useToast';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import { cn } from '../../shared/utils/cn';
import { useWishlist } from './api/wishlistQueries';
import type { StorefrontProduct } from './api/storefrontTypes';
import { useStorefrontMultiCart } from './cart/storefrontMultiCartContext';
import { DiscoverProductCard } from './ui/DiscoverProductCard';
import { useDiscoverShell } from './ui/discoverShellContext';
import { isStorefrontProductOutOfStock } from './ui/storefrontStock';
import { StorefrontProductDetailModal } from './ui/StorefrontProductDetailModal';

export default function WishlistPage() {
  const token = useAppSelector((s) => s.auth.token);
  const { setHeader, requestSignIn } = useDiscoverShell();
  const { showToast } = useToast();
  const { addProduct } = useStorefrontMultiCart();
  const { data, isLoading, isError, refetch, isFetching } = useWishlist(Boolean(token));
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);

  useEffect(() => {
    if (!token) {
      setHeader({
        title: 'Wishlist',
        subtitle: 'Save products you want to buy later',
      });
      return;
    }
    setHeader({
      title: 'Wishlist',
      subtitle: data ? `${data.count} saved item${data.count === 1 ? '' : 's'}` : 'Save products you want to buy later',
    });
    return () => setHeader(null);
  }, [token, data, setHeader]);

  /** Add to cart only — wishlist clears after a successful place-order on the server. */
  const addToCart = (product: StorefrontProduct) => {
    const biz = product.business;
    if (!biz?.slug) {
      showToast('error', 'Could not find this shop');
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
    showToast('success', `Added to ${biz.name} cart`);
  };

  if (!token) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-12 text-center')}>
        <Heart className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Sign in to save items</p>
        <p className="mt-1 text-xs text-slate-600">
          Create an account to save products you want to buy later.
        </p>
        <button
          type="button"
          onClick={() => requestSignIn({ intent: 'general' })}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="page" message="Loading wishlist…" />;
  }

  if (isError && !data) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-12 text-center')}>
        <Package className="h-10 w-10 text-red-500" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Could not load wishlist</p>
        <p className="mt-1 text-xs text-slate-600">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-12 text-center')}>
        <Heart className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">No saved items yet</p>
        <p className="mt-1 text-xs text-slate-600">
          Browse products and tap the heart to save them for later.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((w) => (
          w.product ? (
            <DiscoverProductCard
              key={w.id}
              product={w.product}
              shopSlug={w.product.business?.slug}
              currency={w.product.business?.currency}
              onOpenDetail={() => setDetail(w.product!)}
              onAdd={addToCart}
            />
          ) : null
        ))}
      </div>

      {detail ? (
        <StorefrontProductDetailModal
          product={detail}
          isOpen
          onClose={() => setDetail(null)}
          shopSlug={detail.business?.slug}
          currency={detail.business?.currency}
          onAdd={(product) => {
            addToCart(product);
            setDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}
