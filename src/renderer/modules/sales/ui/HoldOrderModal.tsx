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
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setNotes(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  const total = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const count = cartItems.reduce((s, c) => s + c.quantity, 0);

  return (
    <Modal isOpen={open} onClose={onClose} title="Hold Order" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-gray-600">{count} item{count > 1 ? 's' : ''}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>

        <textarea ref={inputRef} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Notes (optional)..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { dispatch(holdOrder(notes || undefined)); onClose(); }}>Hold Order</Button>
        </div>
      </div>
    </Modal>
  );
}
