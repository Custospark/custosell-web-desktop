import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import { cn } from '../../shared/utils/cn';
import { useFavorites } from './api/favoriteQueries';
import { ShopTile } from './ui/DiscoverShopsBrowse';
import { useDiscoverShell } from './ui/discoverShellContext';

export default function FavoritesPage() {
  const token = useAppSelector((s) => s.auth.token);
  const { setHeader, requestSignIn } = useDiscoverShell();
  const { data, isLoading, isError, refetch, isFetching } = useFavorites(Boolean(token));

  useEffect(() => {
    if (!token) {
      setHeader({
        title: 'Favorite Businesses',
        subtitle: 'Star shops you want to browse again',
      });
      return;
    }
    setHeader({
      title: 'Favorite Businesses',
      subtitle: data ? `${data.count} favorite${data.count === 1 ? '' : 's'}` : 'Shops you starred',
    });
    return () => setHeader(null);
  }, [token, data, setHeader]);

  if (!token) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-12 text-center')}>
        <Star className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Sign in to save shops</p>
        <p className="mt-1 text-xs text-slate-600">
          Create an account to save businesses you want to browse again.
        </p>
        <button
          type="button"
          onClick={() => requestSignIn({ intent: 'general' })}
          className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <CustosellLoader message="Loading favorites…" />;
  }

  if (isError && !data) {
    return (
      <div className={cn(marketplaceGlassPanel, 'mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-12 text-center')}>
        <Star className="h-10 w-10 text-red-500" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Could not load favorites</p>
        <p className="mt-1 text-xs text-slate-600">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
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
        <Star className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-900">No favorite shops yet</p>
        <p className="mt-1 text-xs text-slate-600">
          Browse businesses and tap the star to save them for later.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {items.map((f) => (
        f.business ? (
          <ShopTile key={f.id} shop={f.business} />
        ) : null
      ))}
    </div>
  );
}