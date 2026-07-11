import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { clearCart } from '../api/salesSlice';
import { cartItemsToOrderItems, type CreateOrderPayload } from '../api/orders/orderTypes';
import { useOpenOrders, useUpdateOrder } from '../api/orders/useOrderQueries';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { computeSaleTax } from '../../../shared/utils/taxEngine';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Saves cart changes back to the order opened via explicit Update. */
function UpdateOrderForm({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const cartNotes = useAppSelector((s) => s.sales.notes);
  const activeOrderId = useAppSelector((s) => s.sales.activeOrderId);
  const shiftId = useAppSelector((s) => s.auth.user?.shift_id ?? null);
  const { data: openOrders = [] } = useOpenOrders();
  const { taxSettings } = useBusinessTaxSettings();
  const updateOrder = useUpdateOrder();

  const linked = openOrders.find((o) => o.id === activeOrderId);
  const [name, setName] = useState(
    !linked?.customer_name || linked.customer_name === 'Guest' ? '' : linked.customer_name,
  );
  const [notes, setNotes] = useState(cartNotes || linked?.notes || '');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const discountValue = discountType === 'percentage'
    ? (subtotal * discountAmount) / 100
    : Math.min(discountAmount, subtotal);
  const taxBreakdown = computeSaleTax(taxSettings, cartItems, discountValue);
  const count = cartItems.reduce((s, c) => s + c.quantity, 0);

  const buildPayload = (): CreateOrderPayload => ({
    customer_id: customerId,
    customer_name: name.trim() || 'Guest',
    shift_id: shiftId,
    notes: notes.trim() || null,
    subtotal: taxBreakdown.subtotalNet,
    tax_total: taxBreakdown.taxTotal,
    discount_amount: taxBreakdown.discountAmount,
    total_amount: taxBreakdown.total,
    items: cartItemsToOrderItems(cartItems),
  });

  const handleUpdate = () => {
    if (!activeOrderId || cartItems.length === 0) return;
    updateOrder.mutate(
      { id: activeOrderId, ...buildPayload() },
      {
        onSuccess: () => {
          dispatch(clearCart());
          onClose();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2.5 text-sm">
        <span className="text-blue-800 font-medium">
          Updating {linked?.order_number ?? `order #${activeOrderId}`}
        </span>
        <span className="font-semibold text-gray-900">{formatCurrency(taxBreakdown.total)}</span>
      </div>

      <p className="text-xs text-gray-500">
        {count} item{count === 1 ? '' : 's'} — saves changes to this open order only.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Customer / Order Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John's order, Table 5..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Waiting for price check..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={updateOrder.isPending}>Cancel</Button>
        <Button onClick={handleUpdate} disabled={updateOrder.isPending || cartItems.length === 0 || !activeOrderId}>
          {updateOrder.isPending ? 'Updating…' : 'Update Order'}
        </Button>
      </div>
    </div>
  );
}

export default function UpdateOrderModal({ open, onClose }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Update Order" size="sm">
      {open ? <UpdateOrderForm key="update-form" onClose={onClose} /> : null}
    </Modal>
  );
}
