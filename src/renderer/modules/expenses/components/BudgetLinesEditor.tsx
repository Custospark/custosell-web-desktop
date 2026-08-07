import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  Plus, Trash2, ShoppingCart, Calculator, Pencil,
} from 'lucide-react';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import type { BudgetLine } from '../api/BudgetTypes';

interface LineDraft {
  key: string;
  id: number | null;
  item_name: string;
  quantity: number;
  unit_price: number;
}

interface BudgetLinesEditorProps {
  value: BudgetLine[];
  onChange: (lines: BudgetLine[]) => void;
}

interface AddLineState {
  key: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
}

function toDraft(id: number | null, item: BudgetLine | Partial<BudgetLine>): LineDraft {
  return {
    id,
    item_name: item.item_name ?? '',
    quantity: Math.max(1, Number(item.quantity ?? 1) || 1),
    unit_price: Number(item.unit_price ?? 0) || 0,
  };
}

let lineSeq = 0;
const newKey = () => `new-${Date.now()}-${lineSeq++}`;

export default function BudgetLinesEditor({ value, onChange }: BudgetLinesEditorProps) {
  const [rows, setRows] = useState<LineDraft[]>(
    () => (value ?? []).map((line) => toDraft(line.id, line)),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<AddLineState>({ key: null, item_name: '', quantity: 1, unit_price: 0 });

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0);

  const emit = (next: LineDraft[]) => {
    onChange(
      next
        .filter((r) => r.item_name.trim())
        .map((r) => ({
          id: r.id,
          item_name: r.item_name.trim(),
          quantity: r.quantity,
          unit_price: r.unit_price,
          line_total: r.quantity * r.unit_price,
          purchased: false,
          expense_id: null,
          personal_budget_id: 0,
        })),
    );
  };

  const openAdd = () => {
    setDraft({ key: null, item_name: '', quantity: 1, unit_price: 0 });
    setModalOpen(true);
  };

  const openEdit = (row: LineDraft) => {
    setDraft({ key: row.key, item_name: row.item_name, quantity: row.quantity, unit_price: row.unit_price });
    setModalOpen(true);
  };

  const saveDraft = () => {
    if (!draft.item_name.trim()) return;
    if (draft.key) {
      const current = rows.find((r) => r.key === draft.key);
      if (current) {
        setRows((prev) => {
          const next = prev.map((r) => (r.key === draft.key ? { ...r, ...draft } : r));
          emit(next);
          return next;
        });
      }
    } else {
      const newRow = { key: newKey(), id: null, item_name: draft.item_name, quantity: draft.quantity, unit_price: draft.unit_price };
      const next = [...rows, newRow];
      setRows(next);
      emit(next);
    }
    setModalOpen(false);
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      emit(next);
      return next;
    });
  };

  const canSave = draft.item_name.trim().length > 0;

  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" /> Shopping list / plan (optional)
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-400">
            Add the items you plan to buy roughly. The plan auto-totals and becomes your budget target — usually
            you'll then record actual expenses against this same budget.
          </p>

          {rows.length > 0 && (
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{row.item_name}</p>
                    <p className="text-xs text-gray-500">
                      {row.quantity} × {getBusinessCurrency()} {row.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    {getBusinessCurrency()} {(row.quantity * row.unit_price).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                      title="Edit item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calculator className="w-4 h-4 text-blue-500" /> Auto-total
              </div>
              <span className="font-bold text-blue-700">
                {getBusinessCurrency()} {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={draft.key ? 'Edit item' : 'Add an item'}
        subtitle="Add the items you plan to buy roughly — the plan auto-totals into your budget target."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item name *</label>
            <input
              type="text"
              value={draft.item_name}
              onChange={(e) => setDraft((d) => ({ ...d, item_name: e.target.value }))}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
              placeholder="e.g. Bread, Milk, Data bundle"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number" step="1" min="1"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: Math.max(1, Number(e.target.value)) }))}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                <input
                  type="number" step="0.01" min="0"
                  value={draft.unit_price}
                  onChange={(e) => setDraft((d) => ({ ...d, unit_price: Math.max(0, Number(e.target.value)) }))}
                  className="w-full pl-12 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
            <span className="text-sm text-gray-600">Line total</span>
            <span className="text-sm font-bold text-blue-700">
              {getBusinessCurrency()} {(draft.quantity * draft.unit_price).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="button" onClick={saveDraft} disabled={!canSave}>
            <Plus className="h-4 w-4" /> {draft.key ? 'Save item' : 'Add item'}
          </Button>
        </div>
      </Modal>
    </>
  );
}