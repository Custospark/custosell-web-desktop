/* eslint-disable react-refresh/only-export-components */
import { useCallback } from 'react';
import { Trash2, Plus, RotateCcw } from 'lucide-react';
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

let itemCounter = 0;

export function newEditableLineItem(defaultMarkup = 0): EditableLineItem {
  itemCounter += 1;
  return {
    key: `line-${Date.now()}-${itemCounter}`,
    type: 'other',
    description: '',
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
    markup_type: defaultMarkup > 0 ? 'percent' : 'none',
    markup_value: defaultMarkup,
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

const TYPE_OPTIONS: { value: EstimateLineItemType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'service', label: 'Service' },
  { value: 'travel', label: 'Travel' },
  { value: 'permit', label: 'Permit' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'discount', label: 'Discount' },
  { value: 'other', label: 'Other' },
];

const inputClass = cn(
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900',
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
  'transition-colors',
);

const selectClass = cn(inputClass, 'pr-8 appearance-none');

const typeColors: Record<string, string> = {
  labor: 'border-l-blue-400',
  material: 'border-l-emerald-400',
  equipment: 'border-l-amber-400',
  service: 'border-l-purple-400',
  travel: 'border-l-cyan-400',
  permit: 'border-l-rose-400',
  subcontractor: 'border-l-orange-400',
  discount: 'border-l-red-400',
  other: 'border-l-gray-400',
};

const n = (v: unknown): number => Number(v) || 0;

/** Render a numeric input that shows empty when 0 (no sticky zero) */
function NumInput({ value, onChange, disabled, className, placeholder = '0', min, step }: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
  className?: string; placeholder?: string; min?: number; step?: string;
}) {
  const display = value === 0 ? '' : String(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') { onChange(0); return; }
        const num = parseFloat(raw);
        if (!isNaN(num)) onChange(num);
      }}
      className={className}
      min={min}
      step={step}
    />
  );
}

interface EstimateLineItemEditorProps {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
  currency: string;
  readOnly?: boolean;
  defaultMarkup?: number;
}

export default function EstimateLineItemEditor({
  items,
  onChange,
  currency,
  readOnly = false,
  defaultMarkup = 0,
}: EstimateLineItemEditorProps) {
  const updateItem = useCallback((key: string, patch: Partial<EditableLineItem>) => {
    onChange(items.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, ...patch };
      if ('unit_cost' in patch || 'markup_type' in patch || 'markup_value' in patch) {
        next.unit_price = computeLinePrice(
          n(next.unit_cost),
          next.markup_type,
          n(next.markup_value),
        );
      }
      return next;
    }));
  }, [items, onChange]);

  const removeItem = useCallback((key: string) => {
    onChange(items.filter((item) => item.key !== key));
  }, [onChange, items]);

  const addItem = useCallback(() => {
    onChange([...items, newEditableLineItem(defaultMarkup)]);
  }, [onChange, items, defaultMarkup]);

  const applyDefaultToAll = useCallback(() => {
    onChange(items.map((item) => ({
      ...item,
      markup_type: (defaultMarkup > 0 ? 'percent' : 'none') as MarkupType,
      markup_value: defaultMarkup,
    })));
  }, [onChange, items, defaultMarkup]);

  const hasMarkupOverride = items.some(
    (item) => item.markup_value !== defaultMarkup || (defaultMarkup > 0 && item.markup_type !== 'percent'),
  );

  const renderRow = (item: EditableLineItem) => {
    const unitPrice = computeLinePrice(n(item.unit_cost), item.markup_type, n(item.markup_value), n(item.unit_price));
    const lineTotal = n(item.quantity) * unitPrice;

    const markupCell = (
      <div className="flex items-center gap-1">
        <NumInput
          value={n(item.markup_value)}
          onChange={(v) => updateItem(item.key, {
            markup_value: v,
            markup_type: v > 0 ? 'percent' : 'none',
          })}
          disabled={readOnly}
          placeholder="0"
          className={cn(inputClass, 'w-16 text-right')}
          min={0}
          step="1"
        />
        <span className="text-xs text-gray-400 shrink-0">%</span>
      </div>
    );

    const markupCellMobile = (
      <div>
        <label className="mb-1 block text-xs text-gray-500">Markup %</label>
        <div className="flex items-center gap-1">
          <NumInput
            value={n(item.markup_value)}
            onChange={(v) => updateItem(item.key, {
              markup_value: v,
              markup_type: v > 0 ? 'percent' : 'none',
            })}
            disabled={readOnly}
            placeholder="0"
            className={cn(inputClass, 'flex-1 text-right')}
            min={0}
            step="1"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
      </div>
    );

    return { unitPrice, lineTotal, markupCell, markupCellMobile };
  };

  return (
    <div className="space-y-3">
      {/* Apply default markup banner */}
      {!readOnly && defaultMarkup > 0 && hasMarkupOverride && (
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2">
          <p className="text-xs text-blue-800">
            Default markup: <strong>{defaultMarkup}%</strong>
          </p>
          <button
            type="button"
            onClick={applyDefaultToAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Apply to all
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-2 w-28">Type</th>
              <th className="pb-2 pr-2 min-w-[160px]">Description</th>
              <th className="pb-2 pr-2 w-20 text-right">Qty</th>
              <th className="pb-2 pr-2 w-28 text-right">Cost</th>
              <th className="pb-2 pr-2 w-24 text-right">Markup %</th>
              <th className="pb-2 pr-2 w-28 text-right">Price</th>
              <th className="pb-2 pr-2 w-28 text-right">Total</th>
              {!readOnly && <th className="pb-2 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const { unitPrice, lineTotal, markupCell } = renderRow(item);
              return (
                <tr key={item.key} className={cn('hover:bg-gray-50/50 border-l-2', typeColors[item.type] ?? 'border-l-transparent')}>
                  <td className="py-2 pr-2 align-top">
                    <select
                      value={item.type}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { type: e.target.value as EstimateLineItemType })}
                      className={cn(selectClass, 'w-full')}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
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
                    <NumInput
                      value={n(item.quantity)}
                      onChange={(v) => updateItem(item.key, { quantity: v })}
                      disabled={readOnly}
                      className={cn(inputClass, 'text-right')}
                      min={0}
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <NumInput
                      value={n(item.unit_cost)}
                      onChange={(v) => updateItem(item.key, { unit_cost: v })}
                      disabled={readOnly}
                      className={cn(inputClass, 'text-right')}
                      min={0}
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    {markupCell}
                  </td>
                  <td className="py-2 pr-2 align-top tabular-nums text-gray-800 text-right">
                    {formatCurrency(unitPrice, currency)}
                  </td>
                  <td className="py-2 pr-2 align-top font-medium tabular-nums text-gray-900 text-right">
                    {formatCurrency(lineTotal, currency)}
                  </td>
                  {!readOnly && (
                    <td className="py-2 align-top text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const { unitPrice, lineTotal, markupCellMobile } = renderRow(item);
          return (
            <div
              key={item.key}
              className={cn(
                'rounded-xl border border-gray-200 bg-white overflow-hidden',
                'border-l-4',
                typeColors[item.type] ?? 'border-l-gray-400',
              )}
            >
              <div className="space-y-3 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <select
                      value={item.type}
                      disabled={readOnly}
                      onChange={(e) => updateItem(item.key, { type: e.target.value as EstimateLineItemType })}
                      className={cn(selectClass, 'w-full text-xs')}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  value={item.description}
                  disabled={readOnly}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  placeholder="Line description"
                  className={inputClass}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Qty</label>
                    <NumInput
                      value={n(item.quantity)}
                      onChange={(v) => updateItem(item.key, { quantity: v })}
                      disabled={readOnly}
                      className={inputClass}
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Unit cost</label>
                    <NumInput
                      value={n(item.unit_cost)}
                      onChange={(v) => updateItem(item.key, { unit_cost: v })}
                      disabled={readOnly}
                      className={inputClass}
                      min={0}
                      step="0.01"
                    />
                  </div>
                  {markupCellMobile}
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Unit price</label>
                    <p className="flex h-9 items-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 text-sm font-medium tabular-nums text-gray-800">
                      {formatCurrency(unitPrice, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-xs text-gray-500">Line total</span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {formatCurrency(lineTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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