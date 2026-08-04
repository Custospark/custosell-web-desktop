import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export function ChipRow({ label, options, value, onSelect, showAll }: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  value: string;
  onSelect: (value: string) => void;
  showAll?: boolean;
}) {
  const all = [{ value: '', label: 'All' }, ...options];
  const list = showAll ? all : options;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(active && opt.value === value ? '' : opt.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50',
              )}
            >
              {opt.label}
              {typeof opt.count === 'number' ? (
                <span className={cn('text-[10px]', active ? 'text-indigo-100' : 'text-slate-400')}>{opt.count}</span>
              ) : null}
              {active ? <Check className="h-3 w-3" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SelectControl({ icon: Icon, label, value, options, placeholder, onChange, disabled }: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder ?? 'Any'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition',
              i > 0 && 'border-l border-slate-200',
              value === opt.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleChip({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
          checked
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
        )}
      >
        <Check className={cn('h-3.5 w-3.5', checked ? 'opacity-100' : 'opacity-0')} aria-hidden />
        {checked ? 'In stock only' : 'Any stock'}
      </button>
    </div>
  );
}

export function PriceRange({ minValue, maxValue, bounds, currency, onMin, onMax }: {
  minValue?: number;
  maxValue?: number;
  bounds?: { min: number; max: number };
  currency: string;
  onMin: (value?: number) => void;
  onMax: (value?: number) => void;
}) {
  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Price range ({currency})</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={bounds?.min}
          inputMode="numeric"
          placeholder={bounds?.min !== undefined ? `Min ${Math.round(bounds.min)}` : 'Min'}
          value={minValue ?? ''}
          onChange={(e) => onMin(e.target.value ? Number(e.target.value) : undefined)}
          className={inputCls}
        />
        <span className="text-xs text-slate-400">–</span>
        <input
          type="number"
          min={bounds?.min}
          inputMode="numeric"
          placeholder={bounds?.max !== undefined ? `Max ${Math.round(bounds.max)}` : 'Max'}
          value={maxValue ?? ''}
          onChange={(e) => onMax(e.target.value ? Number(e.target.value) : undefined)}
          className={inputCls}
        />
      </div>
    </div>
  );
}