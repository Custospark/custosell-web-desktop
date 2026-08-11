import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { useLocations } from '../../../settings/api/settings/LocationQueries';
import { useLocationStock, useStockTransfer, type TransferLine } from '../../api/products/BranchStockQueries';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { isServiceItem } from '../../api/products/ProductTypes';
import { ArrowLeftRight } from 'lucide-react';

interface BranchTransferModalProps {
  open: boolean;
  onClose: () => void;
  products: ProductWithSyncMeta[];
}

interface Row {
  product_id: number;
  name: string;
  quantity: number;
  selected: boolean;
}

export default function BranchTransferModal({ open, onClose, products }: BranchTransferModalProps) {
  const { data: locations = [] } = useLocations();
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const transfer = useStockTransfer();

  const activeLocations = useMemo(() => locations.filter((l) => l.is_active), [locations]);

  const stockProducts = useMemo(() => products.filter((p) => !isServiceItem(p)), [products]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      const defaultLoc = activeLocations.find((l) => l.is_default);
      setFromId(defaultLoc?.id ?? activeLocations[0]?.id ?? null);
      setToId(null);
      setRows(stockProducts.map((p) => ({ product_id: p.id, name: p.name, quantity: 0, selected: false })));
    });
  }, [open, stockProducts, activeLocations]);

  const { data: fromStock = [] } = useLocationStock(fromId);

  const stockByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of fromStock) map.set(item.product_id, item.stock_quantity);
    return map;
  }, [fromStock]);

  const toOptions = activeLocations.filter((l) => l.id !== fromId);

  const totalQty = rows.reduce((sum, r) => sum + (Number.isFinite(r.quantity) ? r.quantity : 0), 0);
  const valid =
    fromId !== null &&
    toId !== null &&
    rows.length > 0 &&
    rows.some((r) => r.quantity > 0) &&
    !rows.some((r) => {
      const available = stockByProduct.get(r.product_id) ?? 0;
      return r.quantity > available;
    });

  const handleRowChange = (productId: number, quantity: number) => {
    setRows((prev) => prev.map((r) => (r.product_id === productId ? { ...r, quantity } : r)));
  };

  const handleToggleRow = (productId: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.product_id !== productId) return r;
        const available = stockByProduct.get(r.product_id) ?? 0;
        return { ...r, selected: !r.selected, quantity: r.selected ? 0 : available };
      }),
    );
  };

  const allChecked = rows.length > 0 && rows.every((r) => r.selected);

  const handleToggleAll = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: !allChecked,
        quantity: !allChecked ? (stockByProduct.get(r.product_id) ?? 0) : 0,
      })),
    );
  };

  const handleTransfer = () => {
    if (!fromId || !toId) return;
    const items: TransferLine[] = rows
      .filter((r) => r.quantity > 0)
      .map((r) => ({ product_id: r.product_id, quantity: r.quantity }));
    if (items.length === 0) return;
    transfer.mutate(
      { from_location_id: fromId, to_location_id: toId, items },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Transfer Stock Between Branches"
      size="lg"
      bodyClassName="px-4 sm:px-6 py-4 sm:py-5 min-h-0"
      overflowVisible
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium text-gray-700">
            <span className="block mb-1">From Branch</span>
            <select
              value={fromId ?? ''}
              onChange={(e) => setFromId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
            >
              {activeLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (Default)' : ''}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            <span className="block mb-1">To Branch</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
              value={toId ?? ''}
              onChange={(e) => setToId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select destination branch</option>
              {toOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}{o.is_default ? ' (Default)' : ''}</option>
              ))}
            </select>
          </label>
        </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Transfer all available
              </label>
              <span className="text-xs text-gray-400">({rows.length})</span>
            </div>
            <span className="text-xs text-gray-400">Total: {totalQty}</span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {rows.map((r) => {
              const available = stockByProduct.get(r.product_id) ?? 0;
              const over = r.quantity > available;
              return (
                <div key={r.product_id} className="flex items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => handleToggleRow(r.product_id)}
                    title={r.selected ? 'Skip this product' : 'Transfer all available'}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">Available: {available}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={available}
                    value={r.quantity || ''}
                    onChange={(e) => handleRowChange(r.product_id, Number(e.target.value))}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-right"
                  />
                  {over && <span className="text-xs text-red-600 w-16">Exceeds</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleTransfer} disabled={!valid || transfer.isPending}>
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            {transfer.isPending ? 'Transferring...' : 'Transfer Stock'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}