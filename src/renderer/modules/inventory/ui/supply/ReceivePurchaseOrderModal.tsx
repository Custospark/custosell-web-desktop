import { useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { useProducts } from '../../api/products/ProductQueries';
import { tracksStock, type Product } from '../../api/products/ProductTypes';
import { useReceivePurchaseOrder } from '../../api/purchaseOrders/usePurchaseOrderQueries';
import type { PurchaseOrder, PurchaseOrderItem } from '../../api/purchaseOrders/purchaseOrderTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';

interface ReceivePurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

function autoMapLines(items: PurchaseOrderItem[], localProducts: Product[]): Record<number, number> {
  const next: Record<number, number> = {};
  for (const item of items) {
    const skuMatch = item.product_sku
      ? localProducts.find((p) => p.sku && p.sku.toLowerCase() === item.product_sku!.toLowerCase())
      : undefined;
    const nameMatch = localProducts.find(
      (p) => p.name.trim().toLowerCase() === item.product_name.trim().toLowerCase(),
    );
    const matched = skuMatch ?? nameMatch;
    if (matched) next[item.id] = matched.id;
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
  const [manual, setManual] = useState<Record<number, number>>({});
  const mappings = useMemo(() => ({ ...suggested, ...manual }), [suggested, manual]);
  const allMapped = items.length > 0 && items.every((item) => mappings[item.id] > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receive ${purchaseOrder.po_number}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Map each fulfilled line to one of your local products. Stock will increase on those products.
        </p>
        <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-0.5">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Qty {item.quantity_fulfilled || item.quantity} · {formatCurrency(Number(item.unit_price))}
                    {item.product_sku ? ` · SKU ${item.product_sku}` : ''}
                  </p>
                </div>
                <label className="flex w-full min-w-0 flex-col gap-1 text-xs font-medium text-gray-700 sm:max-w-xs">
                  Map to my product
                  <select
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-900"
                    value={mappings[item.id] ?? ''}
                    onChange={(e) => {
                      const productId = Number(e.target.value);
                      setManual((prev) => ({ ...prev, [item.id]: productId }));
                    }}
                  >
                    <option value="">Select product…</option>
                    {localProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
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
                    items: items.map((item) => ({
                      id: item.id,
                      product_id: mappings[item.id],
                    })),
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
