import { useEffect, useRef, useState } from 'react';
import { Store, Package, MoreVertical, Eye, Pencil, PackagePlus, Trash } from 'lucide-react';
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
  onDelete: () => void;
}

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function ProductRowActions({
  product,
  onViewHistory,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductRowActionsProps) {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const updateSupply = useUpdateSupplyListing();
  const updateStorefront = useUpdateStorefrontListing();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const busy = updateSupply.isPending || updateStorefront.isPending;
  const canSupply = tracksStock(product);
  const canAdjust = !product._pendingSync && tracksStock(product);

  const toggleStorefront = () => {
    const target = !product.listed_for_storefront;
    setOpen(false);
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
    setOpen(false);
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        title="Actions"
        aria-label="Product actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { setOpen(false); onViewHistory(); }}>
            <Eye className="h-4 w-4 text-gray-400" /> View history
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { setOpen(false); onEdit(); }}>
            <Pencil className="h-4 w-4 text-gray-400" /> Edit
          </button>
          {canAdjust && (
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => { setOpen(false); onAdjustStock(); }}>
              <PackagePlus className="h-4 w-4 text-blue-600" /> Adjust stock
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
            onClick={() => { setOpen(false); onDelete(); }}
            disabled={product._pendingSync}
          >
            <Trash className="h-4 w-4 text-red-500" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
