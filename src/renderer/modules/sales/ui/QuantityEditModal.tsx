import { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../../../app/store/hooks/useApp';
import { updateQuantity } from '../api/salesSlice';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Package, Hash, ArrowRight } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  currentQty: number;
  maxQty: number;
  /** When set, updates quantity via callback instead of the sales cart slice. */
  onConfirm?: (quantity: number) => void;
}

export default function QuantityEditModal({ open, onClose, productId, productName, currentQty, maxQty, onConfirm }: Props) {
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState(String(currentQty));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset qty when modal opens
      setQty(String(currentQty));
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [open, currentQty]);

  const handleSave = () => {
    const n = parseInt(qty);
    if (n <= 0) return;
    if (onConfirm) {
      if (maxQty > 0 && n > maxQty) return;
      onConfirm(n);
    } else if (n <= maxQty) {
      dispatch(updateQuantity({ product_id: productId, quantity: n }));
    }
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Update Quantity" size="sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Package className="w-8 h-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{productName}</p>
            <p className="text-xs text-gray-500">Current: {currentQty}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">New Quantity</label>
          {maxQty > 0 && maxQty < 9999 && (
            <p className="text-xs text-gray-400 mb-1.5">In stock: {maxQty}</p>
          )}
          {maxQty >= 9999 && (
            <p className="text-xs text-gray-400 mb-1.5">Service — no stock limit</p>
          )}
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input ref={inputRef} type="number" min={1} max={maxQty || undefined} value={qty}
              onChange={(e) => setQty(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums" />
          </div>
          {parseInt(qty) > maxQty && maxQty > 0 && (
            <p className="text-xs text-red-500 mt-1">Only {maxQty} in stock</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <ArrowRight className="w-4 h-4 mr-1.5" />Update
          </Button>
        </div>
      </div>
    </Modal>
  );
}
