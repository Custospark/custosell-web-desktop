import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  Plus, Trash2, ShoppingCart, Calculator, Pencil, Scale,
} from 'lucide-react';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
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
  /** Optional budget planned target to compare against the plan auto-total. */
  budgetTarget?: number | null;
}

interface AddLineState {
  key: string | null;
  item_name: string;
  quantity: string;
  unit_price: string;
}

const lineSeqRef = { n: 0 };
const newKey = () => `new-${Date.now()}-${lineSeqRef.n++}`;

function buildRows(value: BudgetLine[] | undefined, prev?: LineDraft[]): LineDraft[] {
  const src = value ?? [];
  return src.map((line, i) => {
    const id: number | null = line.id != null ? Number(line.id) : null;
    if (id != null) {
      return {
        id,
        key: `line-${id}`,
        item_name: line.item_name ?? '',
        quantity: Math.max(1, Number(line.quantity ?? 1) || 1),
        unit_price: Math.max(0, Number(line.unit_price ?? 0) || 0),
      };
    }
    return {
      id: null,
      key: prev?.[i]?.key ?? newKey(),
      item_name: line.item_name ?? '',
      quantity: Math.max(1, Number(line.quantity ?? 1) || 1),
      unit_price: Math.max(0, Number(line.unit_price ?? 0) || 0),
    };
  });
}

const EMPTY_DRAFT: AddLineState = { key: null, item_name: '', quantity: '1', unit_price: '' };

export default function BudgetLinesEditor({ value, onChange, budgetTarget }: BudgetLinesEditorProps) {
  const [rows, setRows] = useState<LineDraft[]>(
    () => buildRows(value),
  );
  const [prevValue, setPrevValue] = useState<BudgetLine[]>(value);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<AddLineState>(EMPTY_DRAFT);

  // Adjust state during render when the parent supplies new lines (async load /
  // reset on open). Same-content re-renders from our own edits are idempotent.
  if (prevValue !== value) {
    setPrevValue(value);
    setRows(buildRows(value, rows));
  }

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0);

  const emit = (next: LineDraft[]) => {
    onChange(
      next
        .filter((r) => r.item_name.trim())
        .map((r) => ({
          id: r.id ?? 0,
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
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  };

  const openEdit = (row: LineDraft) => {
    setDraft({
      key: row.key,
      item_name: row.item_name,
      quantity: String(row.quantity),
      unit_price: row.unit_price ? String(row.unit_price) : '',
    });
    setModalOpen(true);
  };

  const saveDraft = () => {
    if (!draft.item_name.trim()) return;
    const quantity = Math.max(1, parseInt(draft.quantity, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(draft.unit_price) || 0);
    const saved: LineDraft = {
      key: draft.key ?? newKey(),
      id: draft.key ? (rows.find((r) => r.key === draft.key)?.id ?? null) : null,
      item_name: draft.item_name.trim(),
      quantity,
      unit_price: unitPrice,
    };
    const exists = rows.some((r) => r.key === saved.key);
    const next = exists
      ? rows.map((r) => (r.key === saved.key ? saved : r))
      : [...rows, saved];
    setRows(next);
    emit(next);
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
  const lineTotalPreview = (parseInt(draft.quantity, 10) || 1) * (parseFloat(draft.unit_price) || 0);
  const target = budgetTarget ?? null;
  const showComparison = target !== null && total !== target;

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
            Add the items you plan to buy roughly. This list is tracked separately from your target - it doesn't
            change the budget's planned amount.
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
            <div className="flex items-center gap-3">
              {showComparison && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700">
                  <Scale className="w-3.5 h-3.5" />
                  Plan total {getBusinessCurrency()} {total.toFixed(2)} vs target {getBusinessCurrency()} {target.toFixed(2)}
                </div>
              )}
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
        subtitle="Add the items you plan to buy roughly - this list is tracked separately from your budget target."
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
                type="number" step="1" min="1" inputMode="numeric"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                <input
                  type="number" step="0.01" min="0" inputMode="decimal"
                  value={draft.unit_price}
                  onChange={(e) => setDraft((d) => ({ ...d, unit_price: e.target.value }))}
                  className="w-full pl-12 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center justify-between rounded-lg border px-3 py-2',
              lineTotalPreview > 0 ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200',
            )}
          >
            <span className="text-sm text-gray-600">Line total</span>
            <span className={cn('text-sm font-bold', lineTotalPreview > 0 ? 'text-blue-700' : 'text-gray-400')}>
              {getBusinessCurrency()} {lineTotalPreview.toFixed(2)}
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