import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useToast } from '../../../app/contexts/useToast';
import { Button } from '../../../shared/components/buttons/Button';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useRateStorefrontProduct } from '../api/storefrontQueries';
import type { StorefrontProduct } from '../api/storefrontTypes';
import { useDiscoverShell } from './discoverShellContext';
import { ProductStarRating } from './ProductStarRating';
import { productVisual } from './productVisual';
import { isStorefrontProductOutOfStock } from './storefrontStock';
import { StockAvailabilityBadge } from './StockAvailabilityBadge';
import { StorefrontProductPrice } from './StorefrontProductPrice';
import { WishlistHeartButton } from './WishlistHeartButton';

interface DiscoverProductCardProps {
  product: StorefrontProduct;
  onAdd?: (product: StorefrontProduct) => void;
  shopSlug?: string;
  currency?: string;
  className?: string;
  /** Open product detail modal (Discover browse). */
  onOpenDetail?: (product: StorefrontProduct) => void;
}

/** Compact proportional product tile with one-tap star ratings. */
export const DiscoverProductCard = memo(function DiscoverProductCard({
  product,
  onAdd,
  shopSlug,
  currency: currencyProp,
  className,
  onOpenDetail,
}: DiscoverProductCardProps) {
  const currency = currencyProp || product.business?.currency || 'UGX';
  const slug = shopSlug || product.business?.slug;
  const visual = productVisual(product.name, product.type);
  const { Icon, wrap, icon } = visual;
  const token = useAppSelector((s) => s.auth.token);
  const { requestSignIn } = useDiscoverShell();
  const { showToast } = useToast();
  const rate = useRateStorefrontProduct();
  const outOfStock = isStorefrontProductOutOfStock(product);

  const applyRating = (stars: number) => {
    if (!slug) {
      showToast('error', 'Open the shop to rate this product.');
      return;
    }
    const submit = () => {
      rate.mutate(
        { slug, productId: product.id, rating: stars },
        {
          onError: () => showToast('error', 'Could not save your rating. Try again.'),
        },
      );
    };
    if (!token) {
      requestSignIn({
        intent: 'general',
        onSuccess: submit,
      });
      return;
    }
    submit();
  };

  const stars = (
    <ProductStarRating
      avg={Number(product.rating_avg ?? 0)}
      count={Number(product.rating_count ?? 0)}
      myRating={product.my_rating}
      disabled={rate.isPending}
      onRate={applyRating}
    />
  );

  const media = (
    <div
      className={cn('relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg', wrap)}
      role={onOpenDetail ? 'button' : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={onOpenDetail ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenDetail(product);
      } : undefined}
      onKeyDown={onOpenDetail ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpenDetail(product);
        }
      } : undefined}
    >
      {product.image_path ? (
        <img
          src={avatarUrl(product.image_path) ?? undefined}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon className={cn('h-8 w-8 sm:h-9 sm:w-9', icon)} aria-hidden />
      )}
      <div className="absolute left-1.5 top-1.5">
        <StockAvailabilityBadge product={product} />
      </div>
      <div className="absolute right-1.5 top-1.5 z-[1]">
        <WishlistHeartButton product={product} shopSlug={slug} />
      </div>
    </div>
  );

  const body = (
    <>
      {media}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{product.name}</p>
        <p className="text-[13px] font-bold tabular-nums text-indigo-900">
          <StorefrontProductPrice product={product} currency={currency} size="sm" />
        </p>
        {stars}
        {product.business?.name ? (
          <p className="text-[11px] leading-snug text-slate-500">
            {product.business.name}
            {product.business.city ? ` · ${product.business.city}` : ''}
          </p>
        ) : null}
      </div>
      {onAdd ? (
        <div className="mt-auto flex flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            className="w-full gap-1"
            disabled={outOfStock}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (outOfStock) {
                showToast('error', 'This item is out of stock');
                return;
              }
              onAdd(product);
            }}
          >
            <Plus className="h-3 w-3" />
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
          {onOpenDetail ? (
            <button
              type="button"
              title="View details"
              aria-label="View details"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenDetail(product);
              }}
              className="w-full shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-200/80 transition-colors hover:bg-indigo-100"
            >
              View details
            </button>
          ) : null}
        </div>
      ) : (
        <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-indigo-50 px-2 py-1.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200/80">
          {onOpenDetail ? 'View details →' : 'View shop →'}
        </span>
      )}
    </>
  );

  const cardClass = cn(
    marketplaceGlassPanel,
    'flex h-full flex-col gap-1.5 p-2 shadow-md transition-all duration-200',
    'hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-900/15',
    'active:translate-y-0 active:scale-[0.99]',
    outOfStock && 'opacity-90',
    className,
  );

  if (onOpenDetail) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(cardClass, 'w-full cursor-pointer text-left')}
        onClick={() => onOpenDetail(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail(product);
          }
        }}
      >
        {body}
      </div>
    );
  }

  if (onAdd || !slug) {
    return <article className={cardClass}>{body}</article>;
  }

  return (
    <Link to={ROUTES.SHOP(slug)} className={cardClass}>
      {body}
    </Link>
  );
});
