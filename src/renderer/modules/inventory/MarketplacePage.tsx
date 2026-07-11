import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ChevronDown, MapPin, Store } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import {
  useAddSupplier,
  useMarketplaceBusinesses,
  useMarketplaceProducts,
  useMySuppliers,
  useRemoveSupplier,
} from './api/marketplace/useMarketplaceQueries';
import type {
  MarketplaceBusiness,
  MarketplaceCartLine,
  MarketplaceProduct,
} from './api/marketplace/marketplaceTypes';
import {
  useCreatePurchaseOrder,
  useSubmitPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';
import { BrowseSuppliersModal } from './ui/marketplace/BrowseSuppliersModal';
import { MarketplaceActionStrip } from './ui/marketplace/MarketplaceActionStrip';
import { MarketplaceCartSheet } from './ui/marketplace/MarketplaceCartSheet';
import { MarketplaceCatalog } from './ui/marketplace/MarketplaceCatalog';
import { MySuppliersModal } from './ui/marketplace/MySuppliersModal';
import {
  marketplaceGlassHeader,
  marketplaceGlassPanel,
  marketplaceWorkspaceStyle,
} from './ui/marketplace/marketplaceTheme';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const isOffline = useAppSelector(selectIsCompletelyOffline);

  const [selected, setSelected] = useState<MarketplaceBusiness | null>(null);
  const [cart, setCart] = useState<MarketplaceCartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mySuppliersOpen, setMySuppliersOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const businessesQuery = useMarketplaceBusinesses(undefined, !isOffline);
  const mySuppliersQuery = useMySuppliers(undefined, !isOffline);
  const productsQuery = useMarketplaceProducts(selected?.id ?? null, !isOffline && !!selected);
  const addSupplier = useAddSupplier();
  const removeSupplier = useRemoveSupplier();
  const createPo = useCreatePurchaseOrder();
  const submitPo = useSubmitPurchaseOrder();

  const cartSellerId = cart[0]?.product.business_id ?? selected?.id ?? null;
  const busy = createPo.isPending || submitPo.isPending;
  const saveBusyId = addSupplier.isPending
    ? (addSupplier.variables?.seller_business_id ?? null)
    : removeSupplier.isPending
      ? (removeSupplier.variables?.sellerBusinessId ?? null)
      : null;

  const filteredProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q)
        || (p.sku?.toLowerCase().includes(q) ?? false)
        || (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [productsQuery.data, productSearch]);

  function addToCart(product: MarketplaceProduct) {
    if (isOffline) return;
    if (cartSellerId != null && cartSellerId !== product.business_id) {
      setCart([{ product, quantity: Math.max(1, product.supply_min_qty ?? 1) }]);
      setCartOpen(true);
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
    setCartOpen(true);
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
    setCartOpen(false);
  }

  function selectSupplier(biz: MarketplaceBusiness) {
    setSelected(biz);
    setProductSearch('');
    if (cart.length > 0 && cart[0]?.product.business_id !== biz.id) {
      setCart([]);
      setNotes('');
    }
  }

  function toggleSave(biz: MarketplaceBusiness) {
    if (isOffline) return;
    if (biz.is_saved) {
      void removeSupplier.mutateAsync({ sellerBusinessId: biz.id, name: biz.name });
    } else {
      void addSupplier.mutateAsync({ seller_business_id: biz.id });
    }
  }

  function refresh() {
    void businessesQuery.refetch();
    void mySuppliersQuery.refetch();
    if (selected) void productsQuery.refetch();
  }

  const mySuppliers = mySuppliersQuery.data ?? [];
  const location = selected
    ? [selected.city, selected.state, selected.country].filter(Boolean).join(', ')
    : '';

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm m-0 sm:m-3"
      style={marketplaceWorkspaceStyle()}
    >
      <header className={marketplaceGlassHeader}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">Marketplace</p>
          {selected ? (
            <button
              type="button"
              onClick={() => setBrowseOpen(true)}
              disabled={isOffline}
              className="mt-0.5 flex max-w-full items-center gap-1.5 text-left"
            >
              <span className="truncate text-base font-semibold text-slate-900">{selected.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          ) : (
            <h1 className="mt-0.5 text-base font-semibold text-slate-900">Find suppliers & stock up</h1>
          )}
          {selected?.supply_headline ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{selected.supply_headline}</p>
          ) : null}
          {location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </p>
          ) : null}
        </div>
        {selected ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={isOffline}
            onClick={() => setBrowseOpen(true)}
          >
            Switch supplier
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {isOffline ? (
          <div className="mb-3">
            <SupplyOfflineBanner />
          </div>
        ) : null}

        {!selected ? (
          <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center')}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/30">
              <Store className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
              Start with a supplier
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Open My suppliers for your shortlist, or browse every business open for supply — then add items to a purchase order.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                disabled={isOffline}
                onClick={() => setMySuppliersOpen(true)}
              >
                <Bookmark className="mr-1.5 h-4 w-4" />
                My suppliers
                {mySuppliers.length > 0 ? ` (${mySuppliers.length})` : ''}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isOffline}
                onClick={() => setBrowseOpen(true)}
              >
                Browse all
              </Button>
            </div>
          </div>
        ) : (
          <MarketplaceCatalog
            products={filteredProducts}
            loading={productsQuery.isLoading}
            offline={isOffline}
            busy={busy}
            onAdd={addToCart}
            productSearch={productSearch}
            onProductSearchChange={setProductSearch}
          />
        )}
      </div>

      <MarketplaceActionStrip
        onMySuppliers={() => setMySuppliersOpen(true)}
        onBrowseSuppliers={() => setBrowseOpen(true)}
        onOpenCart={() => setCartOpen(true)}
        cartCount={cart.length}
        onOpenOrders={() => navigate(ROUTES.INVENTORY.PURCHASE_ORDERS)}
        onRefresh={refresh}
        mySuppliersCount={mySuppliers.length}
        refreshing={
          businessesQuery.isFetching
          || mySuppliersQuery.isFetching
          || productsQuery.isFetching
        }
        disabled={isOffline}
      />

      <MySuppliersModal
        open={mySuppliersOpen}
        onClose={() => setMySuppliersOpen(false)}
        suppliers={mySuppliers}
        selectedId={selected?.id ?? null}
        loading={mySuppliersQuery.isLoading}
        removingId={removeSupplier.isPending ? (removeSupplier.variables?.sellerBusinessId ?? null) : null}
        onSelect={selectSupplier}
        onRemove={(biz) => {
          void removeSupplier.mutateAsync({ sellerBusinessId: biz.id, name: biz.name });
        }}
        onBrowseAll={() => setBrowseOpen(true)}
      />

      <BrowseSuppliersModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        suppliers={businessesQuery.data ?? []}
        selectedId={selected?.id ?? null}
        loading={businessesQuery.isLoading}
        savingId={saveBusyId}
        onSelect={selectSupplier}
        onToggleSave={toggleSave}
      />

      <MarketplaceCartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        notes={notes}
        onNotesChange={setNotes}
        onUpdateQty={updateQty}
        onSaveDraft={() => void placeOrder(false)}
        onSubmit={() => void placeOrder(true)}
        busy={busy}
        offline={isOffline}
        creatingDraft={createPo.isPending && !submitPo.isPending}
      />
    </div>
  );
}
