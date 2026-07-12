import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronDown, MapPin, Store } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import {
  addMarketplaceCartLine,
  clearMarketplaceCart,
  removeMarketplaceCartLine,
  selectMarketplaceCartLineCount,
  selectMarketplaceCartLines,
  selectMarketplaceCartNotes,
  selectMarketplaceCartOpen,
  selectMarketplaceCartSellerId,
  selectMarketplaceSelectedSupplier,
  setMarketplaceCartNotes,
  setMarketplaceCartOpen,
  setMarketplaceSelectedSupplier,
  updateMarketplaceCartQty,
} from './api/marketplace/marketplaceCartSlice';
import {
  useAddSupplier,
  useMarketplaceBusinesses,
  useMarketplaceProducts,
  useMySuppliers,
  useRemoveSupplier,
} from './api/marketplace/useMarketplaceQueries';
import type { MarketplaceBusiness, MarketplaceProduct } from './api/marketplace/marketplaceTypes';
import { isOpenPurchaseOrderStatus } from './api/purchaseOrders/purchaseOrderTypes';
import {
  refetchPurchaseOrderQueries,
  useCreatePurchaseOrder,
  usePurchaseOrders,
  useSubmitPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { BrowseSuppliersModal } from './ui/marketplace/BrowseSuppliersModal';
import { MarketplaceActionStrip } from './ui/marketplace/MarketplaceActionStrip';
import { MarketplaceCartSheet } from './ui/marketplace/MarketplaceCartSheet';
import { MarketplaceCatalog } from './ui/marketplace/MarketplaceCatalog';
import { MySuppliersModal } from './ui/marketplace/MySuppliersModal';
import {
  marketplaceGlassHeader,
  marketplaceGlassPanel,
  useMarketplaceHeroBackground,
} from './ui/marketplace/marketplaceTheme';

/** Phones + tablets: cart as overlay sheet. Desktop (lg+): docked panel. */
function usePrefersCartSheet() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(max-width: 1023px)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => true,
  );
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const prefersSheet = usePrefersCartSheet();
  const heroStyle = useMarketplaceHeroBackground();

  const cart = useAppSelector(selectMarketplaceCartLines);
  const notes = useAppSelector(selectMarketplaceCartNotes);
  const selected = useAppSelector(selectMarketplaceSelectedSupplier);
  const cartOpen = useAppSelector(selectMarketplaceCartOpen);
  const cartLineCount = useAppSelector(selectMarketplaceCartLineCount);
  const cartSellerId = useAppSelector(selectMarketplaceCartSellerId);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [mySuppliersOpen, setMySuppliersOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const businessesQuery = useMarketplaceBusinesses(undefined, !isOffline);
  const mySuppliersQuery = useMySuppliers(undefined, !isOffline);
  const productsQuery = useMarketplaceProducts(selected?.id ?? null, !isOffline && !!selected);
  const purchaseOrdersQuery = usePurchaseOrders(undefined, !isOffline);
  const addSupplier = useAddSupplier();
  const removeSupplier = useRemoveSupplier();
  const createPo = useCreatePurchaseOrder();
  const submitPo = useSubmitPurchaseOrder();

  const busy = createPo.isPending || submitPo.isPending;
  const saveBusyId = addSupplier.isPending
    ? (addSupplier.variables?.seller_business_id ?? null)
    : removeSupplier.isPending
      ? (removeSupplier.variables?.sellerBusinessId ?? null)
      : null;
  const cartDocked = cartOpen && !prefersSheet;

  const openOrdersCount = useMemo(
    () => (purchaseOrdersQuery.data ?? []).filter((po) => isOpenPurchaseOrderStatus(po.status)).length,
    [purchaseOrdersQuery.data],
  );

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
    dispatch(addMarketplaceCartLine(product));
  }

  async function placeOrder(submitAfterCreate: boolean) {
    const sellerId = cartSellerId ?? selected?.id ?? null;
    if (!sellerId || cart.length === 0 || isOffline) return;
    try {
      const po = await createPo.mutateAsync({
        seller_business_id: sellerId,
        notes: notes.trim() || null,
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      if (submitAfterCreate) {
        await submitPo.mutateAsync(po.id);
      }
      await refetchPurchaseOrderQueries(queryClient);
      dispatch(clearMarketplaceCart());
    } catch {
      /* toasts handled by mutation hooks */
    }
  }

  function selectSupplier(biz: MarketplaceBusiness) {
    dispatch(setMarketplaceSelectedSupplier(biz));
    setProductSearch('');
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
    void purchaseOrdersQuery.refetch();
    if (selected) void productsQuery.refetch();
  }

  const mySuppliers = mySuppliersQuery.data ?? [];
  const location = selected
    ? [selected.address, selected.city, selected.state, selected.country]
        .filter(Boolean)
        .join(', ')
    : '';

  const cartProps = {
    open: cartOpen,
    onClose: () => dispatch(setMarketplaceCartOpen(false)),
    cart,
    notes,
    onNotesChange: (value: string) => dispatch(setMarketplaceCartNotes(value)),
    onUpdateQty: (productId: number, quantity: number) =>
      dispatch(updateMarketplaceCartQty({ productId, quantity })),
    onRemoveLine: (productId: number) => dispatch(removeMarketplaceCartLine(productId)),
    onSaveDraft: () => void placeOrder(false),
    onSubmit: () => void placeOrder(true),
    busy,
    offline: isOffline,
    creatingDraft: createPo.isPending && !submitPo.isPending,
  } as const;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 overflow-hidden',
        'flex-col lg:flex-row',
        cartDocked ? 'gap-0 sm:gap-3 sm:p-3' : 'gap-0',
      )}
    >
      {/* Marketplace chrome */}
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          'rounded-none border-0 shadow-none',
          cartDocked
            ? 'sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm'
            : 'm-0 sm:m-3 sm:rounded-xl sm:border sm:border-white/50 sm:shadow-sm',
        )}
        style={heroStyle}
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
              <p className="mt-1 flex items-start gap-1 text-xs text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{location}</span>
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
              <span className="hidden sm:inline">Switch supplier</span>
              <span className="sm:hidden">Switch</span>
            </Button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-4" data-scroll-container>


          {!selected ? (
            <div className={cn(marketplaceGlassPanel, 'mx-auto flex max-w-xl flex-col items-center px-5 py-10 text-center sm:px-6 sm:py-14')}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/30 sm:h-14 sm:w-14">
                <Store className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 sm:mt-5 sm:text-xl">
                Start with a supplier
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Open My suppliers for your shortlist, or browse every business open for supply — then add items to a purchase order.
              </p>
              <div className="mt-5 flex w-full max-w-sm flex-col gap-2.5 sm:mt-6 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
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
                  className="w-full sm:w-auto"
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
              compact={cartDocked}
            />
          )}
        </div>

        <MarketplaceActionStrip
          onMySuppliers={() => setMySuppliersOpen(true)}
          onBrowseSuppliers={() => setBrowseOpen(true)}
          onOpenCart={() => dispatch(setMarketplaceCartOpen(true))}
          cartCount={cartLineCount}
          onOpenOrders={() => navigate(ROUTES.INVENTORY.PURCHASE_ORDERS)}
          openOrdersCount={openOrdersCount}
          onRefresh={refresh}
          mySuppliersCount={mySuppliers.length}
          refreshing={
            businessesQuery.isFetching
            || mySuppliersQuery.isFetching
            || productsQuery.isFetching
            || purchaseOrdersQuery.isFetching
          }
          disabled={isOffline}
        />
      </div>

      {/* Desktop dock — outside marketplace chrome, with outer padding / gap for breathing room */}
      {cartDocked ? (
        <div className="hidden min-h-0 w-[min(100%,22rem)] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex xl:w-[26rem] 2xl:w-[28rem]">
          <MarketplaceCartSheet
            {...cartProps}
            variant="dock"
            className="rounded-xl border-0 shadow-none"
          />
        </div>
      ) : null}

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

      {prefersSheet ? <MarketplaceCartSheet {...cartProps} variant="sheet" /> : null}
    </div>
  );
}
