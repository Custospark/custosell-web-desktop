import { Heart } from 'lucide-react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../../shared/utils/cn';
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from '../api/wishlistQueries';
import type { StorefrontProduct } from '../api/storefrontTypes';
import { useDiscoverShell } from './discoverShellContext';

interface WishlistHeartButtonProps {
  product: StorefrontProduct;
  shopSlug?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

export function WishlistHeartButton({ product, className, size = 'sm' }: WishlistHeartButtonProps) {
  const productId = product.id;
  const token = useAppSelector((s) => s.auth.token);
  const { requestSignIn } = useDiscoverShell();
  const { data: wishlistData } = useWishlist(Boolean(token));
  const add = useAddToWishlist();
  const remove = useRemoveFromWishlist();

  const wishlistItem = wishlistData?.items?.find((w) => w.product_id === productId);
  const isSaved = Boolean(wishlistItem);
  const busy = add.isPending || remove.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      requestSignIn({
        intent: 'general',
        onSuccess: () => {
          if (wishlistItem) {
            remove.mutate(wishlistItem.id);
          } else {
            add.mutate({ productId, product });
          }
        },
      });
      return;
    }

    if (wishlistItem) {
      remove.mutate(wishlistItem.id);
    } else {
      add.mutate({ productId, product });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={isSaved ? 'Remove from wishlist' : 'Save for later'}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save for later'}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition hover:scale-110 disabled:opacity-50',
        isSaved
          ? 'text-red-500 hover:text-red-600'
          : 'text-slate-400 hover:text-red-400',
        className,
      )}
    >
      <Heart
        className={cn(sizeMap[size], isSaved && 'fill-current')}
      />
    </button>
  );
}
