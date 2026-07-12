import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import type { PosOrder } from '../api/orders/orderTypes';
import { useUpdateOrder } from '../api/orders/useOrderQueries';

interface Props {
  open: boolean;
  order: PosOrder | null;
  onClose: () => void;
}

function RenameOrderForm({ order, onClose }: { order: PosOrder; onClose: () => void }) {
  const updateOrder = useUpdateOrder();
  const [name, setName] = useState(order.customer_name || 'Guest');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSave = () => {
    updateOrder.mutate(
      {
        id: order.id,
        customer_name: name.trim() || 'Guest',
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Updates the display name for <span className="font-medium text-gray-700">{order.order_number}</span>.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Customer / Order Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !updateOrder.isPending) handleSave();
          }}
          placeholder="e.g. John's order, Table 5..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={updateOrder.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateOrder.isPending}>
          {updateOrder.isPending ? 'Saving…' : 'Save name'}
        </Button>
      </div>
    </div>
  );
}

export default function RenameOrderModal({ open, order, onClose }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Rename order" size="sm">
      {open && order ? (
        <RenameOrderForm key={order.id} order={order} onClose={onClose} />
      ) : null}
    </Modal>
  );
}
