import { useEffect } from 'react';
import { useProducts } from '../../../modules/inventory/api/products/ProductQueries';
import { resolveAuthBusinessId } from '../offline/catalogs/catalogSnapshotUtils';
import { loadProductCatalogBaseline } from '../offline/catalogs/catalogSnapshotRefresh';
import { stockLedger } from '../offline/inventory/stockLedger';

export function useSeedStockLedger(): void {
  const { data: products } = useProducts();

  useEffect(() => {
    void (async () => {
      const seedItems = products?.length
        ? products.map((p) => ({ id: p.id, quantity: p.stock_quantity }))
        : null;

      if (seedItems?.length) {
        await stockLedger.seedFromProducts(seedItems).catch((err) => {
          console.warn('[StockLedger] Seed from query failed:', err);
        });
        return;
      }

      const businessId = resolveAuthBusinessId();
      if (!businessId) return;

      try {
        const snapshot = await loadProductCatalogBaseline(businessId);
        if (!snapshot.length) return;
        await stockLedger.seedFromProducts(
          snapshot.map((p) => ({ id: p.id, quantity: p.stock_quantity })),
        );
      } catch (err) {
        console.warn('[StockLedger] Seed from catalog snapshot failed:', err);
      }
    })();
  }, [products]);
}
