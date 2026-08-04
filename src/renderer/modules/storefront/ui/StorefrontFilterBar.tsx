import { useMemo, useState } from 'react';
import { Check, Coins, Filter, MapPin, RotateCcw, Star, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';
import { useStorefrontFacets } from '../api/storefrontQueries';
import {
  STOREFRONT_CITIES_REF,
  STOREFRONT_COUNTRIES,
  STOREFRONT_CURRENCIES,
} from '../api/storefrontLocations';
import type {
  StorefrontProductFilters,
  StorefrontShopFilters,
  StorefrontSort,
} from '../api/storefrontTypes';
import { activeFilterKeys, hasActiveFilters, type FilterBag } from './storefrontFilterUrl';

export type FilterScope = 'shops' | 'products' | 'shop';
type Filterable = StorefrontShopFilters | StorefrontProductFilters;
type FilterKey = keyof Filterable & string;

interface StorefrontFilterBarProps {
  scope: FilterScope;
  filters: FilterBag;
  onChange: (next: FilterBag) => void;
  currency?: string;
  className?: string;
}

const SHOP_SORTS: { value: StorefrontSort | ''; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
];

const PRODUCT_SORTS: { value: StorefrontSort | ''; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name (A–Z)' },
];

const RATING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3+ stars' },
  { value: '4', label: '4+ stars' },
  { value: '4.5', label: '4.5+ stars' },
];

export function StorefrontFilterBar({
  scope,
  filters,
  onChange,
  currency = 'UGX',
  className,
}: StorefrontFilterBarProps) {
  const [open, setOpen] = useState(false);
  const { data: facets } = useStorefrontFacets();
  const active = hasActiveFilters(filters);
  const activeCount = activeFilterKeys(filters).length;
  const isShopScope = scope === 'shops';
  const isProductScope = scope !== 'shops';

  const businessCategories = useMemo(() => facets?.business_categories ?? [], [facets]);
  const countries = useMemo(() => facets?.locations.countries ?? [], [facets]);
  const cities = useMemo(() => facets?.locations.cities ?? [], [facets]);
  const currencies = useMemo(() => facets?.currencies ?? [], [facets]);
  const priceBounds = facets?.price;

  // Never empty: authoritative reference list, but enrich labels with the
  // live facet count when the server already knows it (keeps counts visible).
  const countryOptions = useMemo(() => {
    const withCount = countries.length
      ? STOREFRONT_COUNTRIES.map((name) => {
          const facet = countries.find((c) => c.name === name);
          return facet?.count ? { value: name, label: `${name} (${facet.count})` } : { value: name, label: name };
        })
      : STOREFRONT_COUNTRIES.map((name) => ({ value: name, label: name }));
    return withCount;
  }, [countries]);

  const cityOptions = useMemo(() => {
    const withCount = cities.length
      ? STOREFRONT_CITIES_REF.map((name) => {
          const facet = cities.find((c) => c.name === name);
          return facet?.count ? { value: name, label: `${name} (${facet.count})` } : { value: name, label: name };
        })
      : STOREFRONT_CITIES_REF.map((name) => ({ value: name, label: name }));
    return withCount;
  }, [cities]);

  const currencyOptions = useMemo(() => {
    const withCount = currencies.length
      ? STOREFRONT_CURRENCIES.map((c) => {
          const facet = currencies.find((f) => f.code === c.code);
          return facet?.count ? { value: c.code, label: `${c.code} — ${c.name} (${facet.count})` } : { value: c.code, label: `${c.code} — ${c.name}` };
        })
      : STOREFRONT_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
    return withCount;
  }, [currencies]);

  const categoryKey: FilterKey = isShopScope ? 'category' : 'business_category';
  const categoryActive = (filters as Filterable)[categoryKey] as string | undefined;

  const setFilter = (key: FilterKey, value: unknown) => {
    const next: Filterable = { ...filters };
    if (value === undefined || value === null || value === '' || value === false) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    onChange(next);
  };

  const clearAll = () => onChange({});

  const setSort = (value: string) => setFilter('sort', (value || undefined) as StorefrontSort | undefined);

  const sortOptions = isShopScope ? SHOP_SORTS : PRODUCT_SORTS;

  const pills = useMemo(() => {
    const list: { id: string; label: string; onRemove: () => void }[] = [];
    const bag = filters as Filterable;

    const catValue = bag[categoryKey] as string | undefined;
    if (catValue) {
      const facet = businessCategories.find((c) => c.slug === catValue || String(c.id) === catValue);
      list.push({ id: categoryKey, label: facet?.name ?? catValue, onRemove: () => setFilter(categoryKey, undefined) });
    }
    if (bag.city) {
      list.push({ id: 'city', label: `City: ${bag.city}`, onRemove: () => setFilter('city', undefined) });
    }
    if (bag.country) {
      list.push({ id: 'country', label: `Country: ${bag.country}`, onRemove: () => setFilter('country', undefined) });
    }
    if (bag.type) {
      list.push({ id: 'type', label: bag.type === 'service' ? 'Services only' : 'Products only', onRemove: () => setFilter('type', undefined) });
    }
    if (bag.currency) {
      list.push({ id: 'currency', label: `Currency: ${bag.currency}`, onRemove: () => setFilter('currency', undefined) });
    }
    if (bag.price_min !== undefined) {
      list.push({ id: 'price_min', label: `From ${bag.price_min}`, onRemove: () => setFilter('price_min', undefined) });
    }
    if (bag.price_max !== undefined) {
      list.push({ id: 'price_max', label: `Up to ${bag.price_max}`, onRemove: () => setFilter('price_max', undefined) });
    }
    if (bag.in_stock) {
      list.push({ id: 'in_stock', label: 'In stock', onRemove: () => setFilter('in_stock', undefined) });
    }
    if (bag.min_rating) {
      list.push({ id: 'min_rating', label: `${bag.min_rating}+ stars`, onRemove: () => setFilter('min_rating', undefined) });
    }
    if (bag.sort) {
      const sortLabel = sortOptions.find((s) => s.value === bag.sort)?.label ?? bag.sort;
      list.push({ id: 'sort', label: `Sort: ${sortLabel}`, onRemove: () => setFilter('sort', undefined) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, categoryKey, businessCategories, sortOptions]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
            active || open
              ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
              : 'border-slate-200 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white',
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filters
          {activeCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            clearAll();
          }}
          disabled={!active}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
            active ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'cursor-not-allowed text-slate-300',
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Clear all
        </button>
      </div>

      {active && pills.length > 0 && !open ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            >
              {pill.label}
              <button
                type="button"
                onClick={pill.onRemove}
                aria-label={`Remove ${pill.label}`}
                className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className={cn(marketplaceGlassPanel, 'flex flex-col gap-3 p-3', 'rounded-none sm:rounded-xl')}>
          {(scope === 'shops' || scope === 'products') && businessCategories.length > 0 ? (
            <ChipRow
              label="Business type"
              options={businessCategories.map((c) => ({ value: c.slug, label: `${c.name}`, count: c.count }))}
              value={categoryActive ?? ''}
              onSelect={(v) => setFilter(categoryKey, v || undefined)}
              showAll
            />
          ) : null}

          {(scope === 'shops' || scope === 'products') ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectControl
                icon={MapPin}
                label="Country"
                value={(filters as Filterable).country ?? ''}
                options={countryOptions}
                placeholder="All countries"
                onChange={(v) => setFilter('country', v || undefined)}
              />
              <SelectControl
                icon={MapPin}
                label="City / Town"
                value={(filters as Filterable).city ?? ''}
                options={cityOptions}
                placeholder="All cities"
                onChange={(v) => setFilter('city', v || undefined)}
              />
            </div>
          ) : null}

          {isProductScope ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <SegmentedControl
                label="Item type"
                value={(filters as StorefrontProductFilters).type ?? ''}
                onChange={(v) => setFilter('type', v || undefined)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'product', label: 'Products' },
                  { value: 'service', label: 'Services' },
                ]}
              />
              <SelectControl
                icon={Coins}
                label="Currency"
                value={(filters as StorefrontProductFilters).currency ?? ''}
                options={currencyOptions}
                placeholder="Any currency"
                onChange={(v) => setFilter('currency', v || undefined)}
              />
              <ToggleChip
                label="In stock"
                checked={Boolean((filters as StorefrontProductFilters).in_stock)}
                onChange={(v) => setFilter('in_stock', v || undefined)}
              />
            </div>
          ) : null}

          {isProductScope && (priceBounds || (filters as StorefrontProductFilters).price_min != null || (filters as StorefrontProductFilters).price_max != null) ? (
            <PriceRange
              minValue={(filters as StorefrontProductFilters).price_min}
              maxValue={(filters as StorefrontProductFilters).price_max}
              bounds={priceBounds}
              currency={currency}
              onMin={(v) => setFilter('price_min', v ?? undefined)}
              onMax={(v) => setFilter('price_max', v ?? undefined)}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SelectControl
              icon={Star}
              label="Minimum rating"
              value={(filters as Filterable).min_rating !== undefined ? String((filters as Filterable).min_rating) : ''}
              options={RATING_OPTIONS}
              placeholder="Any rating"
              onChange={(v) => setFilter('min_rating', v ? Number(v) : undefined)}
            />
            <SelectControl
              icon={Filter}
              label="Sort by"
              value={(filters as Filterable).sort ?? ''}
              options={sortOptions}
              placeholder="Default"
              onChange={setSort}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipRow({ label, options, value, onSelect, showAll }: {
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

function SelectControl({ icon: Icon, label, value, options, placeholder, onChange, disabled }: {
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

function SegmentedControl({ label, value, options, onChange }: {
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

function ToggleChip({ label, checked, onChange }: {
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

function PriceRange({ minValue, maxValue, bounds, currency, onMin, onMax }: {
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