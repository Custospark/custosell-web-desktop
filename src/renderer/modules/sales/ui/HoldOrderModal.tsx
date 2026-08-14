import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { clearCart, setActiveOrderId } from '../api/salesSlice';
import { cartItemsToOrderItems, type CreateOrderPayload } from '../api/orders/orderTypes';
import { useCreateOrder } from '../api/orders/useOrderQueries';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { computeSaleTax } from '../../../shared/utils/taxEngine';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Hold always creates a new open order - never updates an existing one. */
function HoldOrderForm({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const cartNotes = useAppSelector((s) => s.sales.notes);
  const shiftId = useAppSelector((s) => s.auth.user?.shift_id ?? null);
  const { taxSettings } = useBusinessTaxSettings();
  const createOrder = useCreateOrder();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState(cartNotes || '');
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

  const handleHoldNew = () => {
    if (cartItems.length === 0) return;
    createOrder.mutate(buildPayload(), {
      onSuccess: () => {
        dispatch(clearCart());
        dispatch(setActiveOrderId(null));
        onClose();
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
        <span className="text-gray-600">{count} item{count > 1 ? 's' : ''}</span>
        <span className="font-semibold text-gray-900">{formatCurrency(taxBreakdown.total)}</span>
      </div>

      <p className="text-xs text-gray-500">
        Creates a <strong>new</strong> open order. To change an existing order, use Update on the Orders list.
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
        <Button variant="secondary" onClick={onClose} disabled={createOrder.isPending}>Cancel</Button>
        <Button onClick={handleHoldNew} disabled={createOrder.isPending || cartItems.length === 0}>
          {createOrder.isPending ? 'Holding…' : 'Hold Order'}
        </Button>
      </div>
    </div>
  );
}

export default function HoldOrderModal({ open, onClose }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Hold Order" size="sm">
      {open ? <HoldOrderForm key="hold-form" onClose={onClose} /> : null}
    </Modal>
  );
}
