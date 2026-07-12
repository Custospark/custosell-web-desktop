import { useEffect } from 'react';
import {
  useStorefrontDiscoverInfinite,
  useStorefrontShopsInfinite,
} from '../api/storefrontQueries';

/**
 * Keep both Discover catalogs subscribed and filling pages in the background
 * so Shops ↔ Products tab switches read from cache instantly.
 */
export function useStorefrontCatalogWarmup(): void {
  const {
    data: shopsData,
    hasNextPage: shopsHasNext,
    isFetchingNextPage: shopsFetchingNext,
    fetchNextPage: fetchNextShops,
  } = useStorefrontShopsInfinite();

  const {
    data: productsData,
    hasNextPage: productsHasNext,
    isFetchingNextPage: productsFetchingNext,
    fetchNextPage: fetchNextProducts,
  } = useStorefrontDiscoverInfinite();

  useEffect(() => {
    if (shopsHasNext && !shopsFetchingNext) {
      void fetchNextShops();
    }
  }, [shopsHasNext, shopsFetchingNext, fetchNextShops, shopsData?.pages.length]);

  useEffect(() => {
    if (productsHasNext && !productsFetchingNext) {
      void fetchNextProducts();
    }
  }, [productsHasNext, productsFetchingNext, fetchNextProducts, productsData?.pages.length]);
}
