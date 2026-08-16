import type { RefObject } from 'react';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { SearchableSelect } from '../../../shared/components/inputs/SearchableSelect';
import { CURRENCIES } from '../../../shared/utils/currencies';
import {
  countryCodesByName,
  findCountryByName,
  findCountryByCode,
  getCountryLabel,
} from '../../../shared/utils/countryCodes';
import {
  STOREFRONT_CITIES_REF,
  STOREFRONT_COUNTRIES,
} from '../../storefront/api/storefrontLocations';
import { useStorefrontFacets } from '../../storefront/api/storefrontQueries';
import { getJurisdictionLabel } from '../../../shared/utils/taxJurisdictions';
import { cn } from '../../../shared/utils/cn';
import {
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
  RefreshCw,
} from 'lucide-react';
import {
  BusinessSectionCard,
  BusinessViewField,
  formatCurrencyLabel,
  iconClass,
  inputClass,
  labelClass,
  selectClass,
} from './businessSettingsFormShared';

export interface BusinessLocationSectionProps {
  isEditing: boolean;
  isPersonal: boolean;
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
  rightSlot?: React.ReactNode;
}

export function BusinessLocationSection({
  isEditing,
  isPersonal,
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
  rightSlot,
}: BusinessLocationSectionProps) {
  const { data: facets, refetch: refetchFacets, isFetching: facetsLoading } = useStorefrontFacets();
  const businessCategories = facets?.business_categories ?? [];
  // Build country options from the standard reference list (East Africa first),
  // keeping the existing ISO-code value contract for the country select.
  const countryOptions = STOREFRONT_COUNTRIES.map((name) => {
    const entry = findCountryByName(name);
    return {
      value: entry?.code ?? name,
      label: entry ? `${entry.flag} ${name}` : name,
      group: name === 'Uganda' || ['Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan', 'Ethiopia', 'Somalia', 'Djibouti', 'Eritrea'].includes(name)
        ? 'East Africa'
        : undefined,
    };
  });
  // Keep any country already saved by the business even if not on the reference list.
  if (form.country && form.country !== 'Uganda' && !STOREFRONT_COUNTRIES.includes(form.country)) {
    countryOptions.push({ value: form.country, label: form.country, group: undefined });
  }
  const selectedCategoryId = form.business_category_id ? String(form.business_category_id) : '';
  const businessCategoryLabel =
    businessCategories.find((c) => c.id === baseline.business_category_id)?.name ?? '';

  return (
    <BusinessSectionCard
      icon={MapPin}
      title={isPersonal ? 'Location & preferences' : 'Location & details'}
      description={isPersonal ? 'Your location, timezone, and currency preferences.' : 'Address, tax information, timezone, and currency.'}
      rightSlot={rightSlot}
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
                <label className={labelClass}>Town/City</label>
                <SearchableSelect
                  placeholder="Select town / city"
                  searchPlaceholder="Search towns / cities..."
                  value={form.city || ''}
                  onChange={(v) => update('city', v || null)}
                  options={STOREFRONT_CITIES_REF.map((city) => ({ value: city, label: city }))}
                  emptyOption={{ value: '', label: 'No town/city selected' }}
                />
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
                options={countryOptions}
                emptyOption={{ value: '', label: 'No country selected' }}
              />
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Business category</label>
                  <button
                    type="button"
                    onClick={() => refetchFacets()}
                    disabled={facetsLoading}
                    title="Refresh categories"
                    aria-label="Refresh categories"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', facetsLoading && 'animate-spin')} aria-hidden />
                    Refresh
                  </button>
                </div>
                <SearchableSelect
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  value={selectedCategoryId}
                  onChange={(v) => update('business_category_id', v ? Number(v) : null)}
                  options={businessCategories.map((c) => ({ value: String(c.id), label: c.name }))}
                  emptyOption={{ value: '', label: 'No category selected' }}
                />
              </div>
            </div>
          </div>
          {!isPersonal && (
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
            </div>
          )}
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
            {baseline.address || '-'}
          </BusinessViewField>
          <BusinessViewField label="Town/City" icon={<Building className="h-4 w-4 text-blue-600" />}>
            {baseline.city || '-'}
          </BusinessViewField>
          <BusinessViewField label="State / region" icon={<MapPinned className="h-4 w-4 text-blue-600" />}>
            {baseline.state || '-'}
          </BusinessViewField>
          <BusinessViewField label="Postal code" icon={<Hash className="h-4 w-4 text-blue-600" />}>
            {baseline.postal_code || '-'}
          </BusinessViewField>
          <BusinessViewField label="Country" icon={<Globe className="h-4 w-4 text-blue-600" />}>
            {getCountryLabel(baseline.country) === 'Not set' ? '-' : getCountryLabel(baseline.country)}
          </BusinessViewField>
          {!isPersonal && (
            <>
              <BusinessViewField label="Tax / VAT ID" icon={<Tag className="h-4 w-4 text-blue-600" />}>
                {baseline.tax_id || '-'}
              </BusinessViewField>
              <BusinessViewField label="Tax regime" icon={<Scale className="h-4 w-4 text-blue-600" />}>
                {baseline.tax_regime === 'vat_registered' ? 'VAT registered' : 'Not VAT registered'}
              </BusinessViewField>
              <BusinessViewField label="Tax jurisdiction" icon={<Globe className="h-4 w-4 text-blue-600" />}>
                {getJurisdictionLabel(baseline.jurisdiction) === 'Not set'
                  ? '-'
                  : getJurisdictionLabel(baseline.jurisdiction)}
              </BusinessViewField>
              <BusinessViewField label="Business category" icon={<Tag className="h-4 w-4 text-blue-600" />}>
                {businessCategoryLabel || '-'}
              </BusinessViewField>
            </>
          )}
          <BusinessViewField label="Timezone" icon={<Clock className="h-4 w-4 text-blue-600" />}>
            {baseline.timezone || '-'}
          </BusinessViewField>
          <BusinessViewField label="Currency" icon={<Coins className="h-4 w-4 text-blue-600" />}>
            {formatCurrencyLabel(baseline.currency)}
          </BusinessViewField>
        </div>
      )}
    </BusinessSectionCard>
  );
}
