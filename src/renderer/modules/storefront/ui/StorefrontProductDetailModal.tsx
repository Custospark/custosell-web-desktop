import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useToast } from '../../../app/contexts/useToast';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useRateStorefrontProduct } from '../api/storefrontQueries';
import type { StorefrontProduct } from '../api/storefrontTypes';
import { useDiscoverShell } from './discoverShellContext';
import { ProductStarRating } from './ProductStarRating';
import { productVisual } from './productVisual';
import { StockAvailabilityBadge } from './StockAvailabilityBadge';
import { isStorefrontProductOutOfStock } from './storefrontStock';
import { StorefrontProductPrice } from './StorefrontProductPrice';
import { WishlistHeartButton } from './WishlistHeartButton';

interface StorefrontProductDetailModalProps {
  product: StorefrontProduct;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (product: StorefrontProduct) => void;
  /** Parent can sync local detail state after a successful rate. */
  onRated?: (product: StorefrontProduct) => void;
  shopSlug?: string;
  currency?: string;
}

/** Product detail — image, description, stock, ratings; Add or open shop. */
export function StorefrontProductDetailModal({
  product,
  isOpen,
  onClose,
  onAdd,
  onRated,
  shopSlug,
  currency: currencyProp,
}: StorefrontProductDetailModalProps) {
  const currency = currencyProp || product.business?.currency || 'UGX';
  const slug = shopSlug || product.business?.slug;
  const visual = productVisual(product.name, product.type);
  const { Icon, wrap, icon } = visual;
  const outOfStock = isStorefrontProductOutOfStock(product);
  const token = useAppSelector((s) => s.auth.token);
  const { requestSignIn } = useDiscoverShell();
  const { showToast } = useToast();
  const rate = useRateStorefrontProduct();

  const pendingStars =
    rate.isPending && rate.variables?.productId === product.id
      ? rate.variables.rating
      : undefined;
  const displayMyRating = pendingStars ?? product.my_rating;

  const applyRating = (stars: number) => {
    if (!slug) {
      showToast('error', 'Open the shop to rate this product.');
      return;
    }
    const submit = () => {
      rate.mutate(
        { slug, productId: product.id, rating: stars },
        {
          onSuccess: (updated) => {
            onRated?.(updated);
          },
          onError: () => showToast('error', 'Could not save your rating. Try again.'),
        },
      );
    };
    if (!token) {
      requestSignIn({ intent: 'general', onSuccess: submit });
      return;
    }
    submit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.name} size="md">
      <div className="space-y-4 p-4">
        <div className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl ${wrap}`}>
          {product.image_path ? (
            <img
              src={avatarUrl(product.image_path) ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className={`h-14 w-14 ${icon}`} aria-hidden />
          )}
          <div className="absolute right-2 top-2">
            <WishlistHeartButton product={product} shopSlug={slug} size="md" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StorefrontProductPrice product={product} currency={currency} size="lg" />
          <StockAvailabilityBadge product={product} />
        </div>

        {product.category?.name ? (
          <p className="text-xs font-medium text-slate-500">{product.category.name}</p>
        ) : null}

        {product.description?.trim() ? (
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{product.description}</p>
        ) : (
          <p className="text-sm italic text-slate-400">No description yet.</p>
        )}

        <ProductStarRating
          avg={Number(product.rating_avg ?? 0)}
          count={Number(product.rating_count ?? 0)}
          myRating={displayMyRating}
          disabled={rate.isPending}
          onRate={applyRating}
        />

        {product.business?.name ? (
          <p className="text-sm text-slate-600">
            Sold by <span className="font-semibold text-slate-900">{product.business.name}</span>
            {product.business.city ? ` · ${product.business.city}` : ''}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {onAdd ? (
            <Button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                onAdd(product);
                onClose();
              }}
            >
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
          ) : slug ? (
            <Link
              to={ROUTES.SHOP(slug)}
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Explore Offers
            </Link>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
