import { useMemo } from 'react';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import type { EstimateLineItem, MarkupType } from '../api/estimateTypes';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';

export function computeLinePrice(
  unitCost: number,
  markupType: MarkupType,
  markupValue: number,
  explicitUnitPrice?: number,
): number {
  if (explicitUnitPrice != null && explicitUnitPrice > 0) return explicitUnitPrice;
  if (markupType === 'percent') return unitCost * (1 + markupValue / 100);
  if (markupType === 'fixed') return unitCost + markupValue;
  return unitCost;
}

export function computeMarginSummary(
  lineItems: Pick<EstimateLineItem, 'quantity' | 'unit_cost' | 'unit_price' | 'markup_type' | 'markup_value' | 'is_billable'>[],
  taxRate = 0,
  discountAmount = 0,
) {
  let costSubtotal = 0;
  let priceSubtotal = 0;

  for (const item of lineItems) {
    if (!item.is_billable) continue;
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unit_cost) || 0;
    const unitPrice = computeLinePrice(unitCost, item.markup_type, Number(item.markup_value) || 0, item.unit_price);
    costSubtotal += qty * unitCost;
    priceSubtotal += qty * unitPrice;
  }

  const subtotal = Math.max(0, priceSubtotal - discountAmount);
  const taxTotal = subtotal * (taxRate / 100);
  const total = subtotal + taxTotal;
  const grossProfit = priceSubtotal - costSubtotal - discountAmount;
  const marginPercent = priceSubtotal > 0 ? (grossProfit / priceSubtotal) * 100 : 0;

  return {
    costSubtotal,
    priceSubtotal,
    subtotal,
    taxTotal,
    total,
    grossProfit,
    marginPercent,
  };
}

interface EstimateMarginSummaryProps {
  lineItems: EstimateLineItem[];
  currency: string;
  taxRate?: number;
  discountAmount?: number;
  compact?: boolean;
  className?: string;
}

export default function EstimateMarginSummary({
  lineItems,
  currency,
  taxRate = 0,
  discountAmount = 0,
  compact = false,
  className,
}: EstimateMarginSummaryProps) {
  const summary = useMemo(
    () => computeMarginSummary(lineItems, taxRate, discountAmount),
    [lineItems, taxRate, discountAmount],
  );

  const marginColor = summary.marginPercent >= 30
    ? 'text-emerald-700'
    : summary.marginPercent >= 15
      ? 'text-amber-700'
      : 'text-red-700';

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-4 text-sm', className)}>
        <span className="text-gray-500">
          Cost: <strong className="text-gray-800">{formatCurrency(summary.costSubtotal, currency)}</strong>
        </span>
        <span className="text-gray-500">
          Price: <strong className="text-gray-800">{formatCurrency(summary.priceSubtotal, currency)}</strong>
        </span>
        <span className={cn('font-semibold', marginColor)}>
          Margin: {summary.marginPercent.toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4', className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        Margin summary
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign className="h-3 w-3" /> Total cost
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-gray-900">
            {formatCurrency(summary.costSubtotal, currency)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign className="h-3 w-3" /> Subtotal (price)
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-gray-900">
            {formatCurrency(summary.priceSubtotal, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Gross profit</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700">
            {formatCurrency(summary.grossProfit, currency)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-gray-500">
            <Percent className="h-3 w-3" /> Margin
          </dt>
          <dd className={cn('mt-0.5 font-bold tabular-nums', marginColor)}>
            {summary.marginPercent.toFixed(1)}%
          </dd>
        </div>
      </dl>
      {taxRate > 0 && (
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">Tax ({taxRate}%)</span>
          <span className="font-medium tabular-nums">{formatCurrency(summary.taxTotal, currency)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sm font-semibold">
        <span>Total to customer</span>
        <span className="tabular-nums text-blue-700">{formatCurrency(summary.total, currency)}</span>
      </div>
    </div>
  );
}
