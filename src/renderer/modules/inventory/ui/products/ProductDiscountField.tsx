import { Percent } from 'lucide-react';
import { PipelineIconField, pipelineInputClass } from '../../../pipeline/ui/pipelineFormFields';
import { formatCurrency, getBusinessCurrency } from '../../../../shared/utils/formatCurrency';

interface ProductDiscountFieldProps {
  unitPrice: string;
  discountPercent: string;
  onChange: (value: string) => void;
}

function toNumber(val: string): number {
  const n = parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

/** Optional sale % with live “Was X → Now Y” preview for the product form. */
export function ProductDiscountField({
  unitPrice,
  discountPercent,
  onChange,
}: ProductDiscountFieldProps) {
  const currency = getBusinessCurrency();
  const regular = toNumber(unitPrice);
  const pct = discountPercent === '' ? null : toNumber(discountPercent);
  const onSale = pct != null && pct > 0 && pct <= 100 && regular > 0;
  const sale = onSale ? Math.round(regular * (1 - pct / 100) * 100) / 100 : null;

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <PipelineIconField label="Sale discount % (optional)" icon={Percent}>
        <input
          className={pipelineInputClass}
          type="number"
          step="0.01"
          min={0}
          max={100}
          value={discountPercent}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 15"
        />
      </PipelineIconField>
      <p className="text-[11px] text-gray-500">
        Applies on your public shop. Clear the % to end the sale. POS till still uses the regular unit price.
      </p>
      {onSale && sale != null ? (
        <p className="text-sm text-teal-800">
          Was <span className="line-through tabular-nums text-slate-500">{formatCurrency(regular, currency)}</span>
          {' → '}
          Now <span className="font-semibold tabular-nums">{formatCurrency(sale, currency)}</span>
        </p>
      ) : null}
    </div>
  );
}
