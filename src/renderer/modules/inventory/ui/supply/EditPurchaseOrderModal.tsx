import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useUpdatePurchaseOrder } from '../../api/purchaseOrders/usePurchaseOrderQueries';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface EditPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

interface EditableItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function EditPurchaseOrderModal({ purchaseOrder, isOpen, onClose }: EditPurchaseOrderModalProps) {
  const updatePo = useUpdatePurchaseOrder();
  const [notes, setNotes] = useState(purchaseOrder.notes ?? '');
  const [items, setItems] = useState<EditableItem[]>(
    (purchaseOrder.items ?? []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
    })),
  );

  function handleQtyChange(index: number, value: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, value) } : item)));
  }

  async function handleSave() {
    await updatePo.mutateAsync({
      id: purchaseOrder.id,
      payload: {
        notes: notes || null,
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
      },
    });
    onClose();
  }

  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${purchaseOrder.po_number}`} size="md">
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(i, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-sm font-medium"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleQtyChange(i, parseInt(e.target.value) || 1)}
                    className="w-16 text-center rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleQtyChange(i, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-right text-sm font-semibold text-gray-900">Total: {formatCurrency(total)}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="po-notes" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </label>
          <textarea
            id="po-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Add notes for the seller…"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={updatePo.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={updatePo.isPending} disabled={updatePo.isPending}>
            {updatePo.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4 mr-1.5" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
