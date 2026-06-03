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
}

export default function QuantityEditModal({ open, onClose, productId, productName, currentQty }: Props) {
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState(String(currentQty));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQty(String(currentQty)); setTimeout(() => inputRef.current?.select(), 100); }
  }, [open, currentQty]);

  const handleSave = () => {
    const n = parseInt(qty);
    if (n > 0) dispatch(updateQuantity({ product_id: productId, quantity: n }));
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
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input ref={inputRef} type="number" min={1} value={qty}
              onChange={(e) => setQty(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums" />
          </div>
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
