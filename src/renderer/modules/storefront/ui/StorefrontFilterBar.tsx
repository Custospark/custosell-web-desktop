import { useMemo, useState } from 'react';
import { Building2, Coins, Filter, MapPin, RotateCcw, Search, Star, X } from 'lucide-react';
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
import { PriceRange, SelectControl, SegmentedControl, ToggleChip } from './StorefrontFilterControls';

export type FilterScope = 'shops' | 'products' | 'shop';
type Filterable = StorefrontShopFilters | StorefrontProductFilters;
type FilterKey = keyof StorefrontShopFilters | keyof StorefrontProductFilters;

interface StorefrontFilterBarProps {
  scope: FilterScope;
  filters: FilterBag;
  onChange: (next: FilterBag) => void;
  currency?: string;
  className?: string;
}

const SHOP_SORTS: { value: StorefrontSort | ''; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
];

const PRODUCT_SORTS: { value: StorefrontSort | ''; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name (A-Z)' },
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
  // `draft` holds the user's in-progress selections. It is NOT applied to the
  // server until the user clicks "Search". `filters` is the committed bag.
  const [committed, setCommitted] = useState(filters);
  const [draft, setDraft] = useState<FilterBag>(filters);
  // Re-sync the draft when the committed filters change externally
  if (committed !== filters) {
    setCommitted(filters);
    setDraft(filters);
  }
  const hasDraftChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(filters), [draft, filters]);

  const active = hasActiveFilters(filters);
  const activeCount = activeFilterKeys(filters).length;
  const draftDirty = hasActiveFilters(draft) && hasDraftChanges;
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
          return facet?.count ? { value: c.code, label: `${c.code} - ${c.name} (${facet.count})` } : { value: c.code, label: `${c.code} - ${c.name}` };
        })
      : STOREFRONT_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }));
    return withCount;
  }, [currencies]);

  const categoryKey: FilterKey = isShopScope ? 'category' : 'business_category';

  // Update the local draft only. Nothing hits the server until apply() runs.
  const setFilter = (key: FilterKey, value: unknown) => {
    setDraft((prev) => {
      const next: Filterable = { ...prev };
      if (value === undefined || value === null || value === '' || value === false) {
        delete (next as Record<string, unknown>)[key];
      } else {
        (next as Record<string, unknown>)[key] = value;
      }
      return next;
    });
  };

  const apply = () => {
    onChange({ ...draft });
    setOpen(false);
  };

  const clearAll = () => {
    setDraft({});
    onChange({});
    setOpen(false);
  };

  const setSort = (value: string) => setFilter('sort', (value || undefined) as StorefrontSort | undefined);

  const sortOptions = isShopScope ? SHOP_SORTS : PRODUCT_SORTS;

  const pills = useMemo(() => {
    const list: { id: string; label: string; onRemove: () => void }[] = [];
    const bag = draft as Filterable;
    const productBag = bag as StorefrontProductFilters;
    const remove = (key: FilterKey) => {
      setDraft((prev) => {
        const next: Filterable = { ...prev };
        delete (next as Record<string, unknown>)[key];
        return next;
      });
    };
    const catValue = (bag as Record<string, unknown>)[categoryKey] as string | undefined;
    if (catValue) {
      const facet = businessCategories.find((c) => c.slug === catValue || String(c.id) === catValue);
      list.push({ id: categoryKey, label: facet?.name ?? catValue, onRemove: () => remove(categoryKey) });
    }
    if (bag.city) {
      list.push({ id: 'city', label: `City: ${bag.city}`, onRemove: () => remove('city') });
    }
    if (bag.country) {
      list.push({ id: 'country', label: `Country: ${bag.country}`, onRemove: () => remove('country') });
    }
    if (productBag.type) {
      list.push({ id: 'type', label: productBag.type === 'service' ? 'Services only' : 'Products only', onRemove: () => remove('type') });
    }
    if (productBag.currency) {
      list.push({ id: 'currency', label: `Currency: ${productBag.currency}`, onRemove: () => remove('currency') });
    }
    if (productBag.price_min !== undefined) {
      list.push({ id: 'price_min', label: `From ${productBag.price_min}`, onRemove: () => remove('price_min') });
    }
    if (productBag.price_max !== undefined) {
      list.push({ id: 'price_max', label: `Up to ${productBag.price_max}`, onRemove: () => remove('price_max') });
    }
    if (productBag.in_stock) {
      list.push({ id: 'in_stock', label: 'In stock', onRemove: () => remove('in_stock') });
    }
    if (bag.min_rating) {
      list.push({ id: 'min_rating', label: `${bag.min_rating}+ stars`, onRemove: () => remove('min_rating') });
    }
    if (bag.sort) {
      const sortLabel = sortOptions.find((s) => s.value === bag.sort)?.label ?? bag.sort;
      list.push({ id: 'sort', label: `Sort: ${sortLabel}`, onRemove: () => remove('sort') });
    }
    return list;
  }, [draft, categoryKey, businessCategories, sortOptions]);

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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectControl
                icon={Building2}
                label="Business type"
                value={((draft as Record<string, unknown>)[categoryKey] as string | undefined) ?? ''}
                options={businessCategories.map((c) => ({ value: c.slug, label: `${c.name}${c.count ? ` (${c.count})` : ''}` }))}
                placeholder="All business types"
                onChange={(v) => setFilter(categoryKey, v || undefined)}
              />
            </div>
          ) : null}

          {(scope === 'shops' || scope === 'products') ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectControl
                icon={MapPin}
                label="Country"
                value={(draft as Filterable).country ?? ''}
                options={countryOptions}
                placeholder="All countries"
                onChange={(v) => setFilter('country', v || undefined)}
              />
              <SelectControl
                icon={MapPin}
                label="City / Town"
                value={(draft as Filterable).city ?? ''}
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
                value={(draft as StorefrontProductFilters).type ?? ''}
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
                value={(draft as StorefrontProductFilters).currency ?? ''}
                options={currencyOptions}
                placeholder="Any currency"
                onChange={(v) => setFilter('currency', v || undefined)}
              />
              <ToggleChip
                label="In stock"
                checked={Boolean((draft as StorefrontProductFilters).in_stock)}
                onChange={(v) => setFilter('in_stock', v || undefined)}
              />
            </div>
          ) : null}

          {isProductScope && (priceBounds || (draft as StorefrontProductFilters).price_min != null || (draft as StorefrontProductFilters).price_max != null) ? (
            <PriceRange
              minValue={(draft as StorefrontProductFilters).price_min}
              maxValue={(draft as StorefrontProductFilters).price_max}
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
              value={(draft as Filterable).min_rating !== undefined ? String((draft as Filterable).min_rating) : ''}
              options={RATING_OPTIONS}
              placeholder="Any rating"
              onChange={(v) => setFilter('min_rating', v ? Number(v) : undefined)}
            />
            <SelectControl
              icon={Filter}
              label="Sort by"
              value={(draft as Filterable).sort ?? ''}
              options={sortOptions}
              placeholder="Default"
              onChange={setSort}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => {
                setDraft({ ...filters });
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!hasDraftChanges}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition',
                hasDraftChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400',
              )}
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              {draftDirty ? `Search (${activeFilterKeys(draft).length})` : 'Search'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}