import { useEffect } from 'react';
import { useProducts } from '../../../modules/inventory/api/products/ProductQueries';
import { stockLedger } from '../offline/stockLedger';

export function useSeedStockLedger(): void {
  const { data: products } = useProducts();

  useEffect(() => {
    if (!products?.length) return;
    void stockLedger.seedFromProducts(
      products.map((p) => ({ id: p.id, quantity: p.stock_quantity })),
    );
  }, [products]);
}
