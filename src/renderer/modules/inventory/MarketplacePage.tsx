import { useMemo, useState } from 'react';
import {
  LayoutList,
  Minus,
  Plus,
  RefreshCw,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import {
  useMarketplaceBusinesses,
  useMarketplaceProducts,
} from './api/marketplace/useMarketplaceQueries';
import {
  effectiveSupplyPrice,
  type MarketplaceBusiness,
  type MarketplaceCartLine,
  type MarketplaceProduct,
} from './api/marketplace/marketplaceTypes';
import {
  useCreatePurchaseOrder,
  useSubmitPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';

export default function MarketplacePage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MarketplaceBusiness | null>(null);
  const [cart, setCart] = useState<MarketplaceCartLine[]>([]);
  const [notes, setNotes] = useState('');

  const businessesQuery = useMarketplaceBusinesses(search, !isOffline);
  const productsQuery = useMarketplaceProducts(selected?.id ?? null, !isOffline && !!selected);
  const createPo = useCreatePurchaseOrder();
  const submitPo = useSubmitPurchaseOrder();

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + effectiveSupplyPrice(line.product) * line.quantity, 0),
    [cart],
  );

  const cartSellerId = cart[0]?.product.business_id ?? selected?.id ?? null;

  function addToCart(product: MarketplaceProduct) {
    if (isOffline) return;
    if (cartSellerId != null && cartSellerId !== product.business_id) {
      setCart([{ product, quantity: Math.max(1, product.supply_min_qty ?? 1) }]);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: Math.max(1, product.supply_min_qty ?? 1) }];
    });
  }

  function updateQty(productId: number, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  async function placeOrder(submitAfterCreate: boolean) {
    if (!cartSellerId || cart.length === 0 || isOffline) return;
    const po = await createPo.mutateAsync({
      seller_business_id: cartSellerId,
      notes: notes.trim() || null,
      items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
    });
    if (submitAfterCreate) {
      await submitPo.mutateAsync(po.id);
    }
    setCart([]);
    setNotes('');
  }

  const busy = createPo.isPending || submitPo.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-600">Browse catalogs other businesses have listed for supply.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="inline-flex items-center gap-2"
          onClick={() => {
            void businessesQuery.refetch();
            if (selected) void productsQuery.refetch();
          }}
          disabled={isOffline || businessesQuery.isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', businessesQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isOffline ? <SupplyOfflineBanner /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4 space-y-3 p-4">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search suppliers…"
            disabled={isOffline}
          />
          {isOffline ? (
            <EmptyState title="Offline" description="Connect to browse suppliers." icon={<Store className="h-10 w-10" />} />
          ) : businessesQuery.isLoading ? (
            <LoadingSkeleton variant="list" />
          ) : (businessesQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No suppliers open"
              description="No businesses are currently open for supply."
              icon={<Store className="h-10 w-10" />}
            />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {(businessesQuery.data ?? []).map((biz) => (
                <li key={biz.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(biz)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      selected?.id === biz.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <p className="font-medium text-gray-900">{biz.name}</p>
                    {biz.supply_headline ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{biz.supply_headline}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500">
                      {[biz.city, biz.state, biz.country].filter(Boolean).join(', ') || 'Location not set'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-5 space-y-3 p-4">
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-gray-500" />
            <h2 className="font-medium text-gray-900">
              {selected ? `Listed products — ${selected.name}` : 'Select a supplier'}
            </h2>
          </div>
          {!selected ? (
            <EmptyState title="Pick a supplier" description="Choose a business to see their listed catalog." icon={<Store className="h-10 w-10" />} />
          ) : isOffline ? (
            <EmptyState title="Offline" description="Connect to load listed products." icon={<Store className="h-10 w-10" />} />
          ) : productsQuery.isLoading ? (
            <LoadingSkeleton variant="table" />
          ) : (productsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState title="No listed products" description="This supplier has no active marketplace listings." icon={<Store className="h-10 w-10" />} />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {(productsQuery.data ?? []).map((product) => {
                const price = effectiveSupplyPrice(product);
                const minQty = Math.max(1, product.supply_min_qty ?? 1);
                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(price)}
                        {product.sku ? ` · SKU ${product.sku}` : ''}
                        {` · Min ${minQty}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isOffline || busy}
                      onClick={() => addToCart(product)}
                      className="inline-flex shrink-0 items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-3 space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-500" />
            <h2 className="font-medium text-gray-900">Purchase Order cart</h2>
          </div>
          {cart.length === 0 ? (
            <EmptyState title="Empty cart" description="Add listed products to draft a purchase order." icon={<ShoppingCart className="h-10 w-10" />} />
          ) : (
            <>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {cart.map((line) => (
                  <li key={line.product.id} className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{line.product.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded border border-gray-200 bg-white p-1"
                          disabled={busy}
                          onClick={() => updateQty(line.product.id, line.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          className="rounded border border-gray-200 bg-white p-1"
                          disabled={busy}
                          onClick={() => updateQty(line.product.id, line.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-600">
                        {formatCurrency(effectiveSupplyPrice(line.product) * line.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Notes for the seller (optional)"
                value={notes}
                disabled={isOffline || busy}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="text-sm font-medium text-gray-900">Total {formatCurrency(cartTotal)}</p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isOffline || busy}
                  loading={createPo.isPending && !submitPo.isPending}
                  onClick={() => void placeOrder(false)}
                >
                  Save as draft
                </Button>
                <Button
                  type="button"
                  disabled={isOffline || busy}
                  loading={busy}
                  onClick={() => void placeOrder(true)}
                >
                  Submit purchase order
                </Button>
                <Link
                  to={ROUTES.INVENTORY.PURCHASE_ORDERS}
                  className="text-center text-xs text-blue-600 hover:underline"
                >
                  View my purchase orders
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
