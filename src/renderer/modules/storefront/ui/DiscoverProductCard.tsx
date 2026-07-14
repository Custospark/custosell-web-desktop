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
  onOpenDetail?: () => void;
}

/** Compact proportional product tile with one-tap star ratings. */
export function DiscoverProductCard({
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
      className={cn('relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden sm:rounded-xl', wrap)}
      role={onOpenDetail ? 'button' : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={onOpenDetail ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenDetail();
      } : undefined}
      onKeyDown={onOpenDetail ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpenDetail();
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
        <Icon className={cn('h-9 w-9 sm:h-10 sm:w-10', icon)} aria-hidden />
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
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{product.name}</p>
        <p className="text-sm font-bold tabular-nums text-teal-900">
          <StorefrontProductPrice product={product} currency={currency} size="sm" />
        </p>
        {stars}
        {product.business?.name ? (
          <p className="truncate text-[11px] text-slate-500">
            {product.business.name}
            {product.business.city ? ` · ${product.business.city}` : ''}
          </p>
        ) : null}
      </div>
      {onAdd ? (
        <Button
          type="button"
          size="sm"
          className="mt-auto w-full gap-1"
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
          <Plus className="h-3.5 w-3.5" />
          {outOfStock ? 'Out of stock' : 'Add'}
        </Button>
      ) : (
        <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200/80">
          {onOpenDetail ? 'View details →' : 'View shop →'}
        </span>
      )}
    </>
  );

  const cardClass = cn(
    marketplaceGlassPanel,
    'flex h-full flex-col gap-2.5 p-2.5 shadow-md transition-all duration-200',
    'hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-900/15',
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
        onClick={onOpenDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail();
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
}
