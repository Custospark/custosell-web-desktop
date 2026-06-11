import { queryClient } from '../../../../app/api/axiosConfig';
import { store } from '../../../../app/store/store';
import type { BusinessInfo } from '../../../../app/store/slices/authSlice';
import type { TaxBusinessSettings } from '../../../../shared/utils/taxEngine';
import type { BusinessWithSyncMeta } from '../../../../app/store/offline/settings/localBusinessSettingsStore';
import type { Business } from './BusinessTypes';

const businessMineQueryKey = ['business', 'mine'] as const;

function normalizeTaxFields(business: {
  tax_regime?: string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
  jurisdiction?: string | null;
}) {
  return {
    tax_regime: (business.tax_regime === 'vat_registered' ? 'vat_registered' : 'none') as Business['tax_regime'],
    default_vat_rate: business.default_vat_rate != null ? Number(business.default_vat_rate) : 18,
    jurisdiction: business.jurisdiction ?? 'UG',
    prices_include_tax: business.prices_include_tax !== false,
  };
}

/** Patch auth slice from merged business settings (online, offline pending, or server-confirmed). */
export function businessToAuthInfo(business: Business | BusinessWithSyncMeta): BusinessInfo {
  const { _pendingSync: _ps, _localId: _lid, ...info } = business as BusinessWithSyncMeta;
  return {
    ...info,
    ...normalizeTaxFields(info),
  };
}

export function businessToTaxSettings(business: Business | BusinessInfo | null | undefined): TaxBusinessSettings | null {
  if (!business) return null;
  const normalized = normalizeTaxFields(business);
  return {
    tax_regime: normalized.tax_regime,
    default_vat_rate: normalized.default_vat_rate,
    prices_include_tax: normalized.prices_include_tax,
  };
}

/**
 * Resolve tax settings using the standard offline read order for business settings:
 * 1. React Query `['business','mine']` (includes pending local overlay from useBusiness)
 * 2. Auth slice business snapshot
 */
export function resolveBusinessForTax(): TaxBusinessSettings | null {
  const fromQuery = queryClient.getQueryData<Business | BusinessWithSyncMeta>(businessMineQueryKey);
  const fromAuth = store.getState().auth.user?.business ?? null;
  return businessToTaxSettings(fromQuery ?? fromAuth);
}

export function resolveBusinessRecordForTax(): Business | BusinessInfo | null {
  const fromQuery = queryClient.getQueryData<Business | BusinessWithSyncMeta>(businessMineQueryKey);
  const fromAuth = store.getState().auth.user?.business ?? null;
  return fromQuery ?? fromAuth;
}
