import { Trash2, Plus } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { EstimateLineItem, EstimateLineItemType, MarkupType } from '../api/estimateTypes';
import { computeLinePrice } from './EstimateMarginSummary';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export type EditableLineItem = {
  key: string;
  type: EstimateLineItemType;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  markup_type: MarkupType;
  markup_value: number;
  is_billable: boolean;
  product_id?: number | null;
};

export function newEditableLineItem(): EditableLineItem {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'other',
    description: '',
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
    markup_type: 'percent',
    markup_value: 0,
    is_billable: true,
    product_id: null,
  };
}

export function estimateToEditableItems(items: EstimateLineItem[]): EditableLineItem[] {
  return items.map((item, idx) => ({
    key: `existing-${item.id ?? idx}`,
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    unit_price: item.unit_price,
    markup_type: item.markup_type,
    markup_value: item.markup_value,
    is_billable: item.is_billable,
    product_id: item.product_id,
  }));
}

export function editableToPayload(items: EditableLineItem[]) {
  return items
    .filter((item) => item.description.trim())
    .map((item, idx) => ({
      product_id: item.product_id ?? null,
      type: item.type,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unit_cost: Number(item.unit_cost) || 0,
      unit_price: computeLinePrice(
        Number(item.unit_cost) || 0,
        item.markup_type,
        Number(item.markup_value) || 0,
        Number(item.unit_price) || 0,
      ),
      markup_type: item.markup_type,
      markup_value: Number(item.markup_value) || 0,
      is_billable: item.is_billable,
      sort_order: idx,
    }));
}

const inputClass = cn(
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900',
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
);

const selectClass = cn(inputClass, 'pr-8');

interface EstimateLineItemEditorProps {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
  currency: string;
  readOnly?: boolean;
}

export default function EstimateLineItemEditor({
  items,
  onChange,
  currency,
  readOnly = false,
}: EstimateLineItemEditorProps) {
  const updateItem = (key: string, patch: Partial<EditableLineItem>) => {
    onChange(items.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, ...patch };
      if ('unit_cost' in patch || 'markup_type' in patch || 'markup_value' in patch) {
        next.unit_price = computeLinePrice(
          Number(next.unit_cost) || 0,
          next.markup_type,
          Number(next.markup_value) || 0,
        );
      }
      return next;
    }));
  };

  const removeItem = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const addItem = () => {
    onChange([...items, newEditableLineItem()]);
  };

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-2">Type</th>
              <th className="pb-2 pr-2">Description</th>
              <th className="pb-2 pr-2 w-20">Qty</th>
              <th className="pb-2 pr-2 w-28">Unit cost</th>
              <th className="pb-2 pr-2 w-24">Markup</th>
              <th className="pb-2 pr-2 w-28">Unit price</th>
              <th className="pb-2 pr-2 w-28">Line total</th>
              {!readOnly && <th className="pb-2 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const unitPrice = computeLinePrice(
                item.unit_cost,
                item.markup_type,
                item.markup_value,
                item.unit_price,
              );
              const lineTotal = (Number(item.quantity) || 0) * unitPrice;
              return (
                <tr key={item.key}>
                  <td className="py-2 pr-2 align-top">
                    <select
                      value={item.type}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { type: e.target.value as EstimateLineItemType })}
                      className={selectClass}
                    >
                      <option value="labor">Labor</option>
                      <option value="material">Material</option>
                      <option value="equipment">Equipment</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      value={item.description}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { description: e.target.value })}
                      placeholder="Line description"
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { unit_cost: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <div className="flex gap-1">
                      <select
                        value={item.markup_type}
                        disabled={readOnly}
                        onChange={(e) => updateItem(item.key, { markup_type: e.target.value as MarkupType })}
                        className={cn(selectClass, 'w-16 shrink-0')}
                      >
                        <option value="none">—</option>
                        <option value="percent">%</option>
                        <option value="fixed">+</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.markup_value}
                        disabled={readOnly || item.markup_type === 'none'}
                        onChange={(e) => updateItem(item.key, { markup_value: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2 align-top tabular-nums text-gray-800">
                    {formatCurrency(unitPrice, currency)}
                  </td>
                  <td className="py-2 pr-2 align-top font-medium tabular-nums text-gray-900">
                    {formatCurrency(lineTotal, currency)}
                  </td>
                  {!readOnly && (
                    <td className="py-2 align-top">
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add line item
        </Button>
      )}
    </div>
  );
}
