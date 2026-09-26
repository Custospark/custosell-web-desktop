import { useEffect, useState } from 'react';
import { Globe, Hash, Landmark, Pencil, Receipt, Tag, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { isBusinessOwner } from '../../../shared/utils/moduleAccess';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';
import { useUpdateBusiness } from '../../settings/api/settings/BusinessQueries';
import { TAX_REGIME_LABELS } from '../../../shared/utils/taxEngine';
import {
  getDefaultVatRateForJurisdiction,
  getFilingAuthorityLabel,
  getJurisdictionLabel,
  hasTaxMetadata,
} from '../../../shared/utils/taxJurisdictions';
import { countryCodesByName, findCountryByCode } from '../../../shared/utils/countryCodes';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

interface TaxForm {
  tax_regime: 'none' | 'vat_registered';
  tax_id: string;
  jurisdiction: string;
  default_vat_rate: number;
  prices_include_tax: boolean;
}

function formFromBusiness(business: {
  tax_regime?: string | null;
  tax_id?: string | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
} | null | undefined): TaxForm {
  return {
    tax_regime: business?.tax_regime === 'vat_registered' ? 'vat_registered' : 'none',
    tax_id: business?.tax_id ?? '',
    jurisdiction: business?.jurisdiction ?? 'UG',
    default_vat_rate: business?.default_vat_rate != null ? Number(business.default_vat_rate) : 18,
    prices_include_tax: business?.prices_include_tax !== false,
  };
}

/**
 * Business tax profile, editable inline on the EFRIS page (owners only).
 * Reads and writes through the same business queries/types as Settings →
 * Business - no duplicated data layer.
 */
export function EfrisTaxProfile() {
  const user = useAppSelector((s) => s.auth.user);
  const owner = isBusinessOwner(user);
  const { business, isLoading } = useBusinessTaxSettings();
  const updateMutation = useUpdateBusiness();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TaxForm>(() => formFromBusiness(business));
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      queueMicrotask(() => {
        setForm(formFromBusiness(business));
        setRateError(null);
      });
    }
  }, [editing, business]);

  const jurisdictionLabel = getJurisdictionLabel(business?.jurisdiction ?? 'UG');
  const filingAuthority = getFilingAuthorityLabel(business?.jurisdiction ?? 'UG');
  const taxRegime = (business?.tax_regime as 'none' | 'vat_registered') ?? 'none';

  function handleJurisdictionChange(code: string) {
    const next = code || 'UG';
    setForm((prev) => ({
      ...prev,
      jurisdiction: next,
      default_vat_rate:
        prev.tax_regime === 'vat_registered' && hasTaxMetadata(next)
          ? getDefaultVatRateForJurisdiction(next)
          : prev.default_vat_rate,
    }));
  }

  function handleSave() {
    if (form.tax_regime === 'vat_registered' && !(form.default_vat_rate >= 0 && form.default_vat_rate <= 100)) {
      setRateError('Enter a VAT rate between 0 and 100.');
      return;
    }
    setRateError(null);
    updateMutation.mutate(
      {
        data: {
          tax_regime: form.tax_regime,
          tax_id: form.tax_id.trim() || null,
          jurisdiction: form.jurisdiction,
          default_vat_rate: form.tax_regime === 'vat_registered' ? form.default_vat_rate : null,
          prices_include_tax: form.prices_include_tax,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">Business tax profile</h2>
        {owner && !editing && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3">
          <LoadingSkeleton variant="minimal" message="Loading tax profile…" />
        </div>
      ) : editing ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax regime</label>
              <select
                value={form.tax_regime}
                onChange={(e) => setForm((prev) => ({ ...prev, tax_regime: e.target.value as TaxForm['tax_regime'] }))}
                className={`${inputClass} bg-white`}
              >
                <option value="none">Not VAT registered</option>
                <option value="vat_registered">VAT registered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax jurisdiction</label>
              <select
                value={form.jurisdiction}
                onChange={(e) => handleJurisdictionChange(e.target.value)}
                className={`${inputClass} bg-white`}
              >
                {form.jurisdiction === 'OTHER' && !findCountryByCode('OTHER') ? (
                  <option value="OTHER">Other / custom</option>
                ) : null}
                {countryCodesByName.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax / VAT ID
            </label>
            <input
              value={form.tax_id}
              onChange={(e) => setForm((prev) => ({ ...prev, tax_id: e.target.value }))}
              placeholder="Tax registration number"
              className={inputClass}
            />
          </div>
          {form.tax_regime === 'vat_registered' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default VAT rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.default_vat_rate}
                  onChange={(e) => setForm((prev) => ({ ...prev, default_vat_rate: parseFloat(e.target.value) || 0 }))}
                  className={inputClass}
                />
                {rateError && <span className="mt-1 block text-xs text-red-500">{rateError}</span>}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 sm:pt-6">
                <input
                  type="checkbox"
                  checked={form.prices_include_tax}
                  onChange={(e) => setForm((prev) => ({ ...prev, prices_include_tax: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Shelf prices include VAT
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={updateMutation.isPending}
            >
              <X className="h-4 w-4" aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={updateMutation.isPending}
              onClick={handleSave}
            >
              Save tax profile
            </Button>
          </div>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            { label: 'Tax regime', icon: <Receipt className="h-4 w-4 text-blue-600" />, value: TAX_REGIME_LABELS[taxRegime] },
            { label: 'TIN / Tax ID', icon: <Tag className="h-4 w-4 text-blue-600" />, value: business?.tax_id || '-' },
            { label: 'Jurisdiction', icon: <Globe className="h-4 w-4 text-blue-600" />, value: jurisdictionLabel === 'Not set' ? '-' : jurisdictionLabel },
            { label: 'Filing authority', icon: <Landmark className="h-4 w-4 text-blue-600" />, value: filingAuthority === 'your tax authority' ? '-' : filingAuthority },
            { label: 'Default VAT rate', icon: <Hash className="h-4 w-4 text-blue-600" />, value: `${(business?.default_vat_rate != null ? Number(business.default_vat_rate) : 18).toFixed(2)}%` },
            { label: 'Prices include VAT', icon: <Receipt className="h-4 w-4 text-blue-600" />, value: business?.prices_include_tax !== false ? 'Yes' : 'No' },
          ]).map(({ label, icon, value }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="mt-2 flex items-start gap-2 text-sm font-medium text-gray-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  {icon}
                </span>
                <span className="min-w-0 break-words self-center">{value}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
