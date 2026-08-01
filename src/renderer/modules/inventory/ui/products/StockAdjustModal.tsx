import { useEffect, useRef, useState } from 'react';
import { useCreateStockMovement } from '../../api/products/ProductQueries';
import type { Product } from '../../api/products/ProductTypes';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../../pipeline/ui/pipelineFormFields';
import { PackagePlus, Plus, Minus, AlertTriangle, Archive, Tag, ChevronDown, Check, ArrowDownUp } from 'lucide-react';

interface StockAdjustModalProps {
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

export default function StockAdjustModal({ open, onClose, product }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createMovement = useCreateStockMovement();
  const isSubmitting = createMovement.isPending;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setDirection('add');
      setQuantity(1);
      setReason(addReasons[0].value);
    });
  }, [open]);

  const afterAdjust = direction === 'add'
    ? product.stock_quantity + quantity
    : Math.max(0, product.stock_quantity - quantity);

  const wouldGoNegative = direction === 'remove' && quantity > product.stock_quantity;
  const reasons = direction === 'add' ? addReasons : removeReasons;
  const canSubmit = !wouldGoNegative && quantity > 0 && reason !== '';

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
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

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Adjust Stock"
      subtitle={product.name}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PipelineModalHero
          icon={PackagePlus}
          tone="blue"
          title="Adjust stock levels"
          description={`${product.name} · current stock ${product.stock_quantity}`}
        />

        <PipelineFormSection title="Direction" icon={ArrowDownUp}>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                direction === 'add' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setDirection('add')}
            >
              <Plus className="h-4 w-4" /> Add stock
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                direction === 'remove' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setDirection('remove')}
            >
              <Minus className="h-4 w-4" /> Remove stock
            </button>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Quantity" icon={Archive}>
          <PipelineIconField label={`Number of units to ${direction}`} icon={Archive}>
            <input
              ref={inputRef}
              className={pipelineInputClass}
              type="number"
              min={1}
              value={quantity || ''}
              onChange={(e) => setQuantity(e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value, 10) || 1))}
              onFocus={(e) => e.target.select()}
            />
          </PipelineIconField>
          <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Current stock:</span>
              <span className="font-medium">{product.stock_quantity}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>After adjustment:</span>
              <span className={`font-semibold ${afterAdjust <= product.low_stock_threshold && afterAdjust > 0 ? 'text-amber-600' : afterAdjust === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {afterAdjust}
              </span>
            </div>
          </div>
          {wouldGoNegative && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Stock cannot go below zero.</span>
            </div>
          )}
        </PipelineFormSection>

        <PipelineFormSection title="Reason" icon={Tag}>
          <PipelineIconField label="Select reason for this adjustment" icon={Tag}>
            <select
              className={pipelineSelectClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </PipelineIconField>
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            <Check className="h-4 w-4" />
            {direction === 'add' ? 'Add stock' : 'Remove stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
