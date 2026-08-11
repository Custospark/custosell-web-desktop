import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Store, Package, MoreVertical, Eye, Pencil, PackagePlus, ArrowLeftRight, Trash } from 'lucide-react';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { useToast } from '../../../../app/contexts/useToast';
import { useUpdateSupplyListing } from '../../api/products/ProductQueries';
import { useUpdateStorefrontListing } from '../../api/products/ProductStorefrontQueries';
import { tracksStock } from '../../api/products/ProductTypes';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';

interface ProductRowActionsProps {
  product: ProductWithSyncMeta;
  onViewHistory: () => void;
  onEdit: () => void;
  onAdjustStock: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function ProductRowActions({
  product,
  onViewHistory,
  onEdit,
  onAdjustStock,
  onTransfer,
  onDelete,
}: ProductRowActionsProps) {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const updateSupply = useUpdateSupplyListing();
  const updateStorefront = useUpdateStorefrontListing();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ right: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const correctedRef = useRef(false);

  const handleClose = useCallback(() => {
    setOpen(false);
    setOrigin(null);
    correctedRef.current = false;
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        correctedRef.current = false;
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) {
          setOrigin({ right: window.innerWidth - rect.right, top: rect.bottom + 4 });
        }
      }
      return !prev;
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || correctedRef.current) return;
    const el = menuRef.current;
    const btn = btnRef.current;
    if (!el || !btn) return;
    const btnRect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom - 4;
    if (spaceBelow < el.offsetHeight) {
      const top = Math.max(8, btnRect.top - el.offsetHeight - 4);
      queueMicrotask(() => setOrigin((prev) => (prev ? { ...prev, top } : prev)));
    }
    correctedRef.current = true;
  }, [open]);

  const busy = updateSupply.isPending || updateStorefront.isPending;
  const canSupply = tracksStock(product);
  const canAdjust = !product._pendingSync && tracksStock(product);

  const toggleStorefront = () => {
    const target = !product.listed_for_storefront;
    handleClose();
    updateStorefront.mutate(
      { id: product.id, listed_for_storefront: target },
      {
        onSuccess: () => showToast('success', target ? 'Listed on public shop' : 'Removed from public shop'),
        onError: () => showToast('error', 'Could not update shop listing'),
      },
    );
  };

  const toggleSupply = () => {
    const listing = product.listed_for_supply;
    handleClose();
    updateSupply.mutate({
      id: product.id,
      data: listing
        ? { listed_for_supply: false, supply_price: null, supply_min_qty: 1 }
        : {
            listed_for_supply: true,
            supply_price: Number(product.supply_price ?? product.wholesale_price ?? product.unit_price),
            supply_min_qty: product.supply_min_qty ?? 1,
          },
    });
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        title="Actions"
        aria-label="Product actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close menu"
            onClick={handleClose}
          />
          {origin && (
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-40 mt-0.5 max-h-[calc(100vh-1rem)] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              style={{ right: origin.right, top: origin.top }}
            >
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onViewHistory(); }}>
                <Eye className="h-4 w-4 text-gray-400" /> View history
              </button>
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onEdit(); }}>
                <Pencil className="h-4 w-4 text-gray-400" /> Edit
              </button>
              {canAdjust && (
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onAdjustStock(); }}>
                  <PackagePlus className="h-4 w-4 text-blue-600" /> Adjust stock
                </button>
              )}
              {canAdjust && (
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { handleClose(); onTransfer(); }}>
                  <ArrowLeftRight className="h-4 w-4 text-indigo-600" /> Transfer
                </button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={toggleStorefront}
                disabled={isOffline || busy}
                title={isOffline ? 'Unavailable offline' : ''}
              >
                <Store className="h-4 w-4 text-emerald-600" />
                {product.listed_for_storefront ? 'Unlist from public shop' : 'List on public shop'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={toggleSupply}
                disabled={isOffline || busy || !canSupply}
                title={isOffline ? 'Unavailable offline' : !canSupply ? 'Only physical products can be listed for supply' : ''}
              >
                <Package className="h-4 w-4 text-blue-600" />
                {product.listed_for_supply ? 'Unlist for supply' : 'List for supply'}
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={() => { handleClose(); onDelete(); }}
                disabled={product._pendingSync}
              >
                <Trash className="h-4 w-4 text-red-500" /> Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
