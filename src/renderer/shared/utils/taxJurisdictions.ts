import { findCountryByCode } from './countryCodes';

export interface TaxJurisdictionMetadata {
  defaultVatRate: number;
  /** Display name for filing portal hints (e.g. URA, KRA) — jurisdiction-specific, not hardcoded in UI copy. */
  filingAuthority?: string;
}

/** Known VAT defaults and filing authorities keyed by ISO country code. */
export const TAX_JURISDICTION_METADATA: Record<string, TaxJurisdictionMetadata> = {
  UG: { defaultVatRate: 18, filingAuthority: 'URA' },
  KE: { defaultVatRate: 16, filingAuthority: 'KRA' },
  TZ: { defaultVatRate: 18, filingAuthority: 'TRA' },
  RW: { defaultVatRate: 18, filingAuthority: 'RRA' },
  NG: { defaultVatRate: 7.5, filingAuthority: 'FIRS' },
  GH: { defaultVatRate: 15, filingAuthority: 'GRA' },
  ZA: { defaultVatRate: 15, filingAuthority: 'SARS' },
};

export function findTaxJurisdictionMetadata(code?: string | null): TaxJurisdictionMetadata | undefined {
  if (!code?.trim()) return undefined;
  return TAX_JURISDICTION_METADATA[code.trim().toUpperCase()];
}

export function hasTaxMetadata(code?: string | null): boolean {
  return findTaxJurisdictionMetadata(code) != null;
}

export function getJurisdictionLabel(code?: string | null): string {
  if (!code?.trim()) return 'Not set';
  if (code === 'OTHER') return 'Other / custom';
  return findCountryByCode(code)?.name ?? code;
}

export function getFilingAuthorityLabel(code?: string | null): string {
  return findTaxJurisdictionMetadata(code)?.filingAuthority ?? 'your tax authority';
}

export function getDefaultVatRateForJurisdiction(code?: string | null): number {
  const configured = findTaxJurisdictionMetadata(code)?.defaultVatRate;
  return configured != null && configured > 0 ? configured : 18;
}

export function getTaxFilingHint(code?: string | null): string {
  const authority = getFilingAuthorityLabel(code);
  if (authority === 'your tax authority') {
    return 'Submit through your tax authority\'s online portal.';
  }
  return `Submit through the ${authority} online portal or your jurisdiction's filing channel.`;
}
