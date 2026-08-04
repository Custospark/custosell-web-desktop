import type { StorefrontProductFilters, StorefrontShopFilters } from '../api/storefrontTypes';

export type FilterBag = StorefrontShopFilters | StorefrontProductFilters;

const FILTER_KEYS = [
  'category',
  'business_category',
  'type',
  'currency',
  'price_min',
  'price_max',
  'in_stock',
  'min_rating',
  'city',
  'country',
  'sort',
] as const;

/** Parse filter values out of a URLSearchParams object. */
export function readFilters(search: URLSearchParams): FilterBag {
  const out: FilterBag = {};
  for (const key of FILTER_KEYS) {
    const value = search.get(key);
    if (value === null || value === '') continue;
    switch (key) {
      case 'price_min':
      case 'price_max':
      case 'min_rating':
        (out as Record<string, unknown>)[key] = Number(value);
        break;
      case 'in_stock':
        (out as Record<string, unknown>)[key] = value === '1' || value === 'true';
        break;
      default:
        (out as Record<string, string>)[key] = value;
    }
  }
  return out;
}

/** Copy `search` and overlay the given filter bag onto it (other params preserved). */
export function writeFilters(search: URLSearchParams, filters: FilterBag): URLSearchParams {
  const next = new URLSearchParams(search);
  for (const key of FILTER_KEYS) {
    const value = (filters as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === '' || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  return next;
}

export function hasActiveFilters(filters: FilterBag): boolean {
  return FILTER_KEYS.some((key) => {
    const value = (filters as Record<string, unknown>)[key];
    return value !== undefined && value !== null && value !== '' && value !== false;
  });
}

export function activeFilterKeys(filters: FilterBag): string[] {
  return FILTER_KEYS.filter((key) => {
    const value = (filters as Record<string, unknown>)[key];
    return value !== undefined && value !== null && value !== '' && value !== false;
  });
}
