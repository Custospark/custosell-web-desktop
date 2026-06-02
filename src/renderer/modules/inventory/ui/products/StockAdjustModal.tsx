import { useState, useRef, useEffect } from 'react';
import { useCreateStockMovement } from '../../api/products/ProductQueries';
import type { Product } from '../../api/products/ProductTypes';
import { Plus, Minus, AlertTriangle, X } from 'lucide-react';

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export default function StockAdjustModal({ open, onClose, product }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createMovement = useCreateStockMovement();

  useEffect(() => {
    if (open) {
      setDirection('add');
      setQuantity(1);
      setNotes('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const change = direction === 'add' ? quantity : -quantity;
    const newStock = product.stock_quantity + change;
    createMovement.mutate(
      {
        product_id: product.id,
        type: 'adjustment',
        quantity_change: change,
        stock_before: product.stock_quantity,
        stock_after: Math.max(0, newStock),
        notes: notes || `Manual ${direction}`,
      },
      { onSuccess: onClose },
    );
  };

  if (!open) return null;

  const afterAdjust = direction === 'add'
    ? product.stock_quantity + quantity
    : Math.max(0, product.stock_quantity - quantity);

  const wouldGoNegative = direction === 'remove' && quantity > product.stock_quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" role="dialog">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-1">Adjust Stock</h2>
        <p className="text-sm text-gray-500 mb-5">{product.name}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Direction toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${direction === 'add' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setDirection('add')}
            >
              <Plus className="w-4 h-4 inline mr-1" />Add Stock
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${direction === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setDirection('remove')}
            >
              <Minus className="w-4 h-4 inline mr-1" />Remove Stock
            </button>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              ref={inputRef}
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Reason for adjustment"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={wouldGoNegative || createMovement.isPending}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${direction === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {createMovement.isPending ? 'Saving...' : `${direction === 'add' ? 'Add' : 'Remove'} Stock`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
