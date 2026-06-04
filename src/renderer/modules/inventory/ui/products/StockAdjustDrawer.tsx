import { useState, useRef, useEffect } from 'react';
import { useCreateStockMovement } from '../../api/products/ProductQueries';
import type { Product } from '../../api/products/ProductTypes';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { Plus, Minus, AlertTriangle, Archive, Tag } from 'lucide-react';

interface StockAdjustDrawerProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

const addReasons = [
  { value: 'purchase', label: 'Purchase — New stock received from supplier' },
  { value: 'return', label: 'Return — Customer returned item' },
  { value: 'adjustment', label: 'Adjustment — Stock count correction (increase)' },
  { value: 'initial', label: 'Initial — Setting up initial stock' },
];

const removeReasons = [
  { value: 'adjustment', label: 'Adjustment — Damage, loss, or write-off' },
  { value: 'return', label: 'Return to Supplier — Sent back to vendor' },
];

export default function StockAdjustDrawer({ open, onClose, product }: StockAdjustDrawerProps) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createMovement = useCreateStockMovement();

  useEffect(() => {
    if (open) {
      setDirection('add');
      setQuantity(1);
      setReason(addReasons[0].value);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = () => {
    const change = direction === 'add' ? quantity : -quantity;
    const newStock = product.stock_quantity + change;
    createMovement.mutate(
      {
        product_id: product.id,
        type: reason as 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial',
        quantity_change: change,
        stock_before: product.stock_quantity,
        stock_after: Math.max(0, newStock),
        notes: reason,
      },
      { onSuccess: onClose },
    );
  };

  const afterAdjust = direction === 'add'
    ? product.stock_quantity + quantity
    : Math.max(0, product.stock_quantity - quantity);

  const wouldGoNegative = direction === 'remove' && quantity > product.stock_quantity;
  const reasons = direction === 'add' ? addReasons : removeReasons;

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      subtitle={product.name}
      onSubmit={handleSubmit}
      isSubmitting={createMovement.isPending}
      canSubmit={!wouldGoNegative && quantity > 0 && reason !== ''}
    >
      {/* Direction */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Direction</h3>
        </div>
        <div className="p-4">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'add' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setDirection('add')}>
              <Plus className="w-4 h-4 inline mr-1.5" />Add Stock
            </button>
            <button type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setDirection('remove')}>
              <Minus className="w-4 h-4 inline mr-1.5" />Remove Stock
            </button>
          </div>
        </div>
      </div>

      {/* Quantity */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Quantity</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Number of units to {direction}</label>
            <div className="relative">
              <Archive className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input ref={inputRef} className={inputClass} type="number" min={1} value={quantity || ''}
                onChange={(e) => setQuantity(e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value) || 1))}
                onFocus={(e) => e.target.select()} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Current stock:</span>
              <span className="font-medium">{product.stock_quantity}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>After adjustment:</span>
              <span className={`font-semibold ${afterAdjust <= product.low_stock_threshold && afterAdjust > 0 ? 'text-amber-600' : afterAdjust === 0 ? 'text-red-600' : 'text-gray-900'}`}>{afterAdjust}</span>
            </div>
          </div>
          {wouldGoNegative && (
            <div className="flex items-start gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Stock cannot go below zero.</span>
            </div>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Reason</h3>
        </div>
        <div className="p-4 space-y-1">
          <label className={labelClass}>Select reason for this adjustment</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
            <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SlideDrawer>
  );
}
