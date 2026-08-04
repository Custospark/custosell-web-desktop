import { Star } from 'lucide-react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../../shared/utils/cn';
import { useAddToFavorites, useRemoveFromFavorites, useFavorites } from '../api/favoriteQueries';
import type { StorefrontShop } from '../api/storefrontTypes';
import { useDiscoverShell } from './discoverShellContext';

interface FavoriteHeartButtonProps {
  shop: StorefrontShop;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

export function FavoriteHeartButton({ shop, className, size = 'sm' }: FavoriteHeartButtonProps) {
  const businessId = shop.id;
  const token = useAppSelector((s) => s.auth.token);
  const { requestSignIn } = useDiscoverShell();
  const { data: favoritesData } = useFavorites(Boolean(token));
  const add = useAddToFavorites();
  const remove = useRemoveFromFavorites();

  const isSaved = Boolean(businessId && favoritesData?.items?.some((f) => f.business?.id === businessId));
  const addingThis = add.isPending && add.variables?.businessId === businessId;
  const removingThis = remove.isPending && remove.variables === businessId;
  const busy = addingThis || removingThis || !businessId;

  const toggle = () => {
    if (!businessId) return;
    if (isSaved) {
      remove.mutate(businessId);
    } else {
      add.mutate({ businessId, business: shop });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      requestSignIn({
        intent: 'general',
        onSuccess: toggle,
      });
      return;
    }

    toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={isSaved ? 'Remove from favorites' : 'Favorite this shop'}
      aria-label={isSaved ? 'Remove from favorites' : 'Favorite this shop'}
      aria-pressed={isSaved}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition hover:scale-110 disabled:opacity-50',
        isSaved
          ? 'text-violet-500 hover:text-violet-600'
          : 'text-slate-400 hover:text-violet-500',
        className,
      )}
    >
      <Star className={cn(sizeMap[size], isSaved && 'fill-current')} />
    </button>
  );
}
