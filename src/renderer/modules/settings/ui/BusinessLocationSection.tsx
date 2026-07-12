import type { RefObject } from 'react';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { SearchableSelect } from '../../../shared/components/inputs/SearchableSelect';
import { CURRENCIES } from '../../../shared/utils/currencies';
import { getJurisdictionLabel } from '../../../shared/utils/taxJurisdictions';
import {
  countryCodesByName,
  findCountryByCode,
  getCountryLabel,
} from '../../../shared/utils/countryCodes';
import { cn } from '../../../shared/utils/cn';
import {
  Building2,
  Globe,
  MapPin,
  MapPinned,
  Building,
  Hash,
  Tag,
  Clock,
  Coins,
  ChevronDown,
  Scale,
} from 'lucide-react';
import {
  BUSINESS_TYPE_LABELS,
  BusinessSectionCard,
  BusinessViewField,
  formatBusinessType,
  formatCurrencyLabel,
  iconClass,
  inputClass,
  labelClass,
  selectClass,
} from './businessSettingsFormShared';

export interface BusinessLocationSectionProps {
  isEditing: boolean;
  form: UpdateBusinessData;
  baseline: UpdateBusinessData;
  update: <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) => void;
  selectedCountryCode: string;
  handleCountryChange: (isoCode: string) => void;
  handleJurisdictionChange: (isoCode: string) => void;
  currencyRef: RefObject<HTMLDivElement | null>;
  currencyOpen: boolean;
  setCurrencyOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  currencySearch: string;
  setCurrencySearch: (value: string) => void;
}

export function BusinessLocationSection({
  isEditing,
  form,
  baseline,
  update,
  selectedCountryCode,
  handleCountryChange,
  handleJurisdictionChange,
  currencyRef,
  currencyOpen,
  setCurrencyOpen,
  currencySearch,
  setCurrencySearch,
}: BusinessLocationSectionProps) {
  return (
    <BusinessSectionCard
      icon={MapPin}
      title="Location & details"
      description="Address, tax information, timezone, and currency."
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
                <textarea
                  className={`${inputClass} resize-none pl-10`}
                  rows={3}
                  value={form.address || ''}
                  onChange={(e) => update('address', e.target.value || null)}
                  placeholder="Street address"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>City</label>
                <div className="relative">
                  <Building className={iconClass} aria-hidden />
                  <input
                    className={inputClass}
                    value={form.city || ''}
                    onChange={(e) => update('city', e.target.value || null)}
                    placeholder="Kampala"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>State / region</label>
                  <div className="relative">
                    <MapPinned className={iconClass} aria-hidden />
                    <input
                      className={inputClass}
                      value={form.state || ''}
                      onChange={(e) => update('state', e.target.value || null)}
                      placeholder="Central"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Postal code</label>
                  <div className="relative">
                    <Hash className={iconClass} aria-hidden />
                    <input
                      className={inputClass}
                      value={form.postal_code || ''}
                      onChange={(e) => update('postal_code', e.target.value || null)}
                      placeholder="00100"
                    />
                  </div>
                </div>
              </div>
              <SearchableSelect
                label="Country"
                placeholder="Select country"
                searchPlaceholder="Search countries..."
                value={selectedCountryCode}
                onChange={handleCountryChange}
                options={countryCodesByName.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
                emptyOption={{ value: '', label: 'No country selected' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Tax / VAT ID</label>
              <div className="relative">
                <Tag className={iconClass} aria-hidden />
                <input
                  className={inputClass}
                  value={form.tax_id || ''}
                  onChange={(e) => update('tax_id', e.target.value || null)}
                  placeholder="Tax registration number"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Tax regime</label>
              <div className="relative">
                <Scale className={iconClass} aria-hidden />
                <select
                  className={selectClass}
                  value={form.tax_regime || 'none'}
                  onChange={(e) => update('tax_regime', e.target.value as 'none' | 'vat_registered')}
                  title="Tax regime"
                >
                  <option value="none">Not VAT registered</option>
                  <option value="vat_registered">VAT registered</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Tax jurisdiction</label>
              <div className="relative">
                <Globe className={iconClass} aria-hidden />
                <select
                  className={selectClass}
                  value={form.jurisdiction || selectedCountryCode || 'UG'}
                  onChange={(e) => handleJurisdictionChange(e.target.value || 'UG')}
                  title="Tax jurisdiction"
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
            {form.tax_regime === 'vat_registered' && (
              <>
                <div>
                  <label className={labelClass}>Default VAT rate (%)</label>
                  <div className="relative">
                    <Hash className={iconClass} aria-hidden />
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={form.default_vat_rate ?? 18}
                      onChange={(e) => update('default_vat_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="prices_include_tax"
                    type="checkbox"
                    checked={form.prices_include_tax !== false}
                    onChange={(e) => update('prices_include_tax', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="prices_include_tax" className="text-sm text-gray-700">
                    Shelf prices include VAT (tax-inclusive pricing)
                  </label>
                </div>
              </>
            )}
            <div>
              <label className={labelClass}>Business type</label>
              <div className="relative">
                <Building2 className={iconClass} aria-hidden />
                <select
                  className={selectClass}
                  value={form.business_type || ''}
                  onChange={(e) => update('business_type', e.target.value || null)}
                  title="Business type"
                >
                  <option value="">Select business type</option>
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Timezone</label>
              <div className="relative">
                <Clock className={iconClass} aria-hidden />
                <input
                  className={inputClass}
                  value={form.timezone || ''}
                  onChange={(e) => update('timezone', e.target.value || null)}
                  placeholder="Africa/Kampala"
                />
              </div>
            </div>
            <div ref={currencyRef}>
              <label className={labelClass}>Currency</label>
              <div className="relative">
                <Coins className={iconClass} aria-hidden />
                <button
                  type="button"
                  onClick={() => setCurrencyOpen((open) => !open)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-left text-sm transition-colors hover:border-gray-400"
                >
                  <span className={form.currency ? 'text-gray-900' : 'text-gray-400'}>
                    {form.currency ? formatCurrencyLabel(form.currency) : 'Select currency'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                </button>
                {currencyOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                      <input
                        type="text"
                        placeholder="Search currency..."
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    {CURRENCIES.filter(
                      (c) =>
                        c.code.toLowerCase().includes(currencySearch.toLowerCase())
                        || c.name.toLowerCase().includes(currencySearch.toLowerCase()),
                    ).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          update('currency', c.code);
                          setCurrencyOpen(false);
                          setCurrencySearch('');
                        }}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-blue-50',
                          form.currency === c.code && 'bg-blue-50 font-medium',
                        )}
                      >
                        <span className="text-gray-800">{c.code}</span>
                        <span className="text-gray-400">{c.symbol}</span>
                        <span className="ml-auto truncate text-gray-500">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BusinessViewField
            label="Address"
            icon={<MapPin className="h-4 w-4 text-blue-600" />}
            className="md:col-span-2"
          >
            {baseline.address || '—'}
          </BusinessViewField>
          <BusinessViewField label="City" icon={<Building className="h-4 w-4 text-blue-600" />}>
            {baseline.city || '—'}
          </BusinessViewField>
          <BusinessViewField label="State / region" icon={<MapPinned className="h-4 w-4 text-blue-600" />}>
            {baseline.state || '—'}
          </BusinessViewField>
          <BusinessViewField label="Postal code" icon={<Hash className="h-4 w-4 text-blue-600" />}>
            {baseline.postal_code || '—'}
          </BusinessViewField>
          <BusinessViewField label="Country" icon={<Globe className="h-4 w-4 text-blue-600" />}>
            {getCountryLabel(baseline.country) === 'Not set' ? '—' : getCountryLabel(baseline.country)}
          </BusinessViewField>
          <BusinessViewField label="Tax / VAT ID" icon={<Tag className="h-4 w-4 text-blue-600" />}>
            {baseline.tax_id || '—'}
          </BusinessViewField>
          <BusinessViewField label="Tax regime" icon={<Scale className="h-4 w-4 text-blue-600" />}>
            {baseline.tax_regime === 'vat_registered' ? 'VAT registered' : 'Not VAT registered'}
          </BusinessViewField>
          <BusinessViewField label="Tax jurisdiction" icon={<Globe className="h-4 w-4 text-blue-600" />}>
            {getJurisdictionLabel(baseline.jurisdiction) === 'Not set'
              ? '—'
              : getJurisdictionLabel(baseline.jurisdiction)}
          </BusinessViewField>
          <BusinessViewField label="Business type" icon={<Building2 className="h-4 w-4 text-blue-600" />}>
            {formatBusinessType(baseline.business_type)}
          </BusinessViewField>
          <BusinessViewField label="Timezone" icon={<Clock className="h-4 w-4 text-blue-600" />}>
            {baseline.timezone || '—'}
          </BusinessViewField>
          <BusinessViewField label="Currency" icon={<Coins className="h-4 w-4 text-blue-600" />}>
            {formatCurrencyLabel(baseline.currency)}
          </BusinessViewField>
        </div>
      )}
    </BusinessSectionCard>
  );
}
