import { useState, useMemo } from 'react';
import {
  useStockMovements, useCreateStockMovement, useProducts,
} from '../../api/products/ProductQueries';
import type { StockMovement, CreateStockMovementData } from '../../api/products/ProductTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Select } from '../../../../shared/components/inputs/Select';
import { Input } from '../../../../shared/components/inputs/Input';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { ClipboardList, Plus } from 'lucide-react';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sale', label: 'Sale' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
  { value: 'initial', label: 'Initial' },
];

const typeBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'primary' | 'neutral'> = {
  purchase: 'success',
  sale: 'danger',
  adjustment: 'warning',
  return: 'primary',
  initial: 'neutral',
};

const emptyForm: CreateStockMovementData = {
  product_id: 0,
  type: 'adjustment',
  quantity_change: 0,
  stock_before: 0,
  stock_after: 0,
  reference: null,
  notes: null,
};

export default function StockLedger() {
  const { data: movements, isLoading, error } = useStockMovements();
  const { data: products } = useProducts();
  const createMutation = useCreateStockMovement();

  const [filterProductId, setFilterProductId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateStockMovementData>(emptyForm);

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => {
      if (filterProductId && m.product_id !== Number(filterProductId)) return false;
      if (filterType && m.type !== filterType) return false;
      return true;
    });
  }, [movements, filterProductId, filterType]);

  const openAddModal = () => {
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, { onSuccess: closeModal });
  };

  const updateField = <K extends keyof CreateStockMovementData>(key: K, value: CreateStockMovementData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'quantity_change' || key === 'stock_before') {
        const qty = key === 'quantity_change' ? Number(value) : next.quantity_change;
        const before = key === 'stock_before' ? Number(value) : next.stock_before;
        next.stock_after = before + qty;
      }
      return next;
    });
  };

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<ClipboardList className="w-12 h-12" />}
        title="Failed to load stock movements"
        description={error?.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  const productSelectOptions = [
    { value: '', label: 'All Products' },
    ...(products?.map((p) => ({ value: String(p.id), label: p.name })) || []),
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Stock Ledger</h2>
          <p className="text-sm text-gray-500 mt-1">Inventory movements and audit trail</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Adjustment
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-64">
          <Select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            options={productSelectOptions}
            placeholder="All Products"
          />
        </div>
        <div className="w-48">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={typeOptions}
            placeholder="All Types"
          />
        </div>
      </div>

      <Table<StockMovement>
        columns={[
          {
            key: 'created_at',
            header: 'Date',
            render: (item) => new Date(item.created_at).toLocaleString(),
          },
          {
            key: 'product',
            header: 'Product',
            render: (item) => item.product?.data?.name || <span className="text-gray-400">—</span>,
          },
          {
            key: 'type',
            header: 'Type',
            render: (item) => (
              <Badge variant={typeBadgeVariant[item.type] || 'neutral'}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Badge>
            ),
          },
          {
            key: 'quantity_change',
            header: 'Change',
            render: (item) => {
              const isPositive = item.quantity_change > 0;
              return (
                <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {isPositive ? '+' : ''}{item.quantity_change}
                </span>
              );
            },
          },
          { key: 'stock_before', header: 'Before' },
          { key: 'stock_after', header: 'After' },
          {
            key: 'reference',
            header: 'Reference',
            render: (item) => item.reference || <span className="text-gray-400">—</span>,
          },
          {
            key: 'notes',
            header: 'Notes',
            render: (item) => item.notes || <span className="text-gray-400">—</span>,
          },
        ]}
        data={filtered}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Record Stock Adjustment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Product"
            value={formData.product_id ? String(formData.product_id) : ''}
            onChange={(e) => updateField('product_id', Number(e.target.value))}
            options={products?.map((p) => ({ value: String(p.id), label: p.name })) || []}
            required
          />
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => updateField('type', e.target.value as CreateStockMovementData['type'])}
            options={typeOptions.slice(1)}
          />
          <Input
            label="Quantity Change"
            type="number"
            value={formData.quantity_change}
            onChange={(e) => updateField('quantity_change', parseInt(e.target.value) || 0)}
            required
          />
          <Input
            label="Stock Before"
            type="number"
            min={0}
            value={formData.stock_before}
            onChange={(e) => updateField('stock_before', parseInt(e.target.value) || 0)}
            required
          />
          <Input
            label="Stock After (auto-calculated)"
            type="number"
            min={0}
            value={formData.stock_after}
            disabled
          />
          <Input
            label="Reference (optional)"
            value={formData.reference || ''}
            onChange={(e) => updateField('reference', e.target.value || null)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value || null)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>
              Record Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
