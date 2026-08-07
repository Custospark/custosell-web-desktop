import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Plus, Trash2, ShoppingCart, Calculator } from 'lucide-react';
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

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0);

  const update = (key: string, patch: Partial<LineDraft>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.key === key ? { ...r, ...patch } : r));
      emit(next);
      return next;
    });
  };

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

  return (
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

        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={row.item_name}
              onChange={(e) => update(row.key, { item_name: e.target.value })}
              className="col-span-6 sm:col-span-5 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Item"
            />
            <input
              type="number" step="1" min="1"
              value={row.quantity}
              onChange={(e) => update(row.key, { quantity: Math.max(1, Number(e.target.value)) })}
              className="col-span-2 px-2 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-center"
              title="Quantity"
            />
            <div className="col-span-3 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">{getBusinessCurrency()}</span>
              <input
                type="number" step="0.01" min="0"
                value={row.unit_price}
                onChange={(e) => update(row.key, { unit_price: Math.max(0, Number(e.target.value)) })}
                className="w-full pl-8 pr-2 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                title="Unit price"
              />
            </div>
            <button
              type="button"
              onClick={() => emit(rows.filter((r) => r.key !== row.key))}
              className="col-span-1 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const next = [...rows, { key: newKey(), id: null, item_name: '', quantity: 1, unit_price: 0 }];
              emit(next);
            }}
          >
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
  );
}