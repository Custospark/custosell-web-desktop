import { useMemo, useState } from 'react';
import { PackageCheck, PackagePlus } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { useProducts } from '../../api/products/ProductQueries';
import { tracksStock, type Product } from '../../api/products/ProductTypes';
import { useReceivePurchaseOrder } from '../../api/purchaseOrders/usePurchaseOrderQueries';
import type { PurchaseOrder, PurchaseOrderItem } from '../../api/purchaseOrders/purchaseOrderTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cn } from '../../../../shared/utils/cn';

interface ReceivePurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

const CREATE_NEW = '__create__';

function autoMapLines(items: PurchaseOrderItem[], localProducts: Product[]): Record<number, string> {
  const next: Record<number, string> = {};
  for (const item of items) {
    const skuMatch = item.product_sku
      ? localProducts.find((p) => p.sku && p.sku.toLowerCase() === item.product_sku!.toLowerCase())
      : undefined;
    const nameMatch = localProducts.find(
      (p) => p.name.trim().toLowerCase() === item.product_name.trim().toLowerCase(),
    );
    const matched = skuMatch ?? nameMatch;
    next[item.id] = matched ? String(matched.id) : CREATE_NEW;
  }
  return next;
}

/** Parent should pass `key={purchaseOrder.id}` so manual overrides reset per PO. */
export function ReceivePurchaseOrderModal({ purchaseOrder, isOpen, onClose }: ReceivePurchaseOrderModalProps) {
  const { data: products = [] } = useProducts();
  const receivePo = useReceivePurchaseOrder();
  const localProducts = useMemo(
    () => products.filter((p) => tracksStock(p) && p.is_active && p.id > 0),
    [products],
  );

  const items = useMemo(() => purchaseOrder.items ?? [], [purchaseOrder.items]);
  const suggested = useMemo(
    () => autoMapLines(items, localProducts),
    [items, localProducts],
  );
  const [manual, setManual] = useState<Record<number, string>>({});
  const mappings = useMemo(() => ({ ...suggested, ...manual }), [suggested, manual]);
  const allMapped = items.length > 0 && items.every((item) => {
    const value = mappings[item.id];
    return value === CREATE_NEW || Number(value) > 0;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receive ${purchaseOrder.po_number}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Map each line to a product you already stock, or create a new product from the supplier line
          (for items you do not have yet). Stock increases when you confirm.
        </p>
        <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-0.5">
          {items.map((item) => {
            const value = mappings[item.id] ?? '';
            const creating = value === CREATE_NEW;
            return (
              <li key={item.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      Qty {item.quantity_fulfilled || item.quantity} · {formatCurrency(Number(item.unit_price))}
                      {item.product_sku ? ` · SKU ${item.product_sku}` : ''}
                    </p>
                    {creating ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <PackagePlus className="h-3.5 w-3.5" />
                        Will create a new product in your catalog
                      </p>
                    ) : null}
                  </div>
                  <label className="flex w-full min-w-0 flex-col gap-1 text-xs font-medium text-gray-700 sm:max-w-xs">
                    Map to my product
                    <select
                      className={cn(
                        'w-full rounded-lg border px-2 py-1.5 text-sm font-normal text-gray-900',
                        creating ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300',
                      )}
                      value={value}
                      onChange={(e) => {
                        setManual((prev) => ({ ...prev, [item.id]: e.target.value }));
                      }}
                    >
                      <option value="">Select product…</option>
                      <option value={CREATE_NEW}>+ Create new product from this line</option>
                      {localProducts.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}{p.sku ? ` (${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={receivePo.isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!allMapped || receivePo.isPending}
            loading={receivePo.isPending}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            onClick={() => {
              receivePo.mutate(
                {
                  id: purchaseOrder.id,
                  payload: {
                    items: items.map((item) => {
                      const value = mappings[item.id];
                      if (value === CREATE_NEW) {
                        return { id: item.id, create_product: true };
                      }
                      return { id: item.id, product_id: Number(value) };
                    }),
                  },
                },
                { onSuccess: onClose },
              );
            }}
          >
            <PackageCheck className="h-4 w-4" />
            Confirm stock in
          </Button>
        </div>
      </div>
    </Modal>
  );
}
