import { useMemo } from 'react';
import { useBusiness } from '../api/settings/BusinessQueries';
import { businessToTaxSettings } from '../api/settings/businessAuthSync';
import { isTaxEnabled, type TaxBusinessSettings } from '../../../shared/utils/taxEngine';

/**
 * Canonical tax settings for UI modules (POS, expenses, compliance, shift).
 * Uses `useBusiness()` read-merged path: server → pending local overlay → auth fallback.
 * Auth slice is kept in sync by `useBusiness()` per offline settings design.
 */
export function useBusinessTaxSettings() {
  const query = useBusiness();

  const taxSettings = useMemo<TaxBusinessSettings | null>(
    () => businessToTaxSettings(query.data ?? null),
    [query.data],
  );

  return {
    ...query,
    business: query.data,
    taxSettings,
    taxEnabled: isTaxEnabled(taxSettings),
  };
}
