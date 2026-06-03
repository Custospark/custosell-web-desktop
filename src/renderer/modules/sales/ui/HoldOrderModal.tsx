import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { holdOrder } from '../api/salesSlice';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HoldOrderModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setName(''); setNotes(''); setTimeout(() => nameRef.current?.focus(), 100); }
  }, [open]);

  const total = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const count = cartItems.reduce((s, c) => s + c.quantity, 0);

  return (
    <Modal isOpen={open} onClose={onClose} title="Hold Order" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm px-3 py-2.5 bg-gray-50 rounded-lg">
          <span className="text-gray-600">{count} item{count > 1 ? 's' : ''}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer / Order Name</label>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John's order, Table 5..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="e.g. Waiting for price check..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { dispatch(holdOrder({ notes: notes || undefined, customerName: name.trim() || 'Guest' })); onClose(); }}>Hold Order</Button>
        </div>
      </div>
    </Modal>
  );
}
