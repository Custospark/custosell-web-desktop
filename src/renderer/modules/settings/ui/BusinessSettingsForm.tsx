import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useBusiness, useUpdateBusiness } from '../api/settings/BusinessQueries';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Badge } from '../../../shared/components/badges/Badge';
import { Button } from '../../../shared/components/buttons/Button';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import { SearchableSelect } from '../../../shared/components/inputs/SearchableSelect';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { CURRENCIES } from '../../../shared/utils/currencies';
import {
  getDefaultVatRateForJurisdiction,
  getJurisdictionLabel,
  hasTaxMetadata,
} from '../../../shared/utils/taxJurisdictions';
import {
  countryCodesByName,
  findCountryByCode,
  getCountryLabel,
  resolveCountryCode,
  type CountryCode,
} from '../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  formatPhoneDisplay,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { cn } from '../../../shared/utils/cn';
import {
  Building2,
  Globe,
  MapPin,
  Receipt,
  Store,
  Mail,
  Phone,
  User,
  Globe2,
  MapPinned,
  Building,
  Hash,
  Tag,
  Clock,
  Coins,
  FileText,
  ChevronDown,
  Pencil,
  WifiOff,
  Scale,
  Landmark,
  Smartphone,
} from 'lucide-react';

const emptyForm: UpdateBusinessData = {
  name: '',
  email: null,
  phone: null,
  website: null,
  description: null,
  business_email: null,
  business_phone: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  tax_id: null,
  tax_regime: 'none',
  jurisdiction: 'UG',
  default_vat_rate: 18,
  prices_include_tax: true,
  timezone: null,
  business_type: null,
  currency: null,
  receipt_footer: null,
  payment_bank_name: null,
  payment_bank_account_name: null,
  payment_bank_account_number: null,
  payment_bank_branch: null,
  payment_mobile_money_provider: null,
  payment_mobile_money_account_name: null,
  payment_mobile_money_number: null,
  payment_instructions: null,
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
  restaurant: 'Restaurant',
  cafe: 'Café',
  service: 'Service',
  salon: 'Salon',
  pharmacy: 'Pharmacy',
  grocery: 'Grocery',
  other: 'Other',
};

const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
const selectClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const iconClass = 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none';

interface BusinessFormSnapshot {
  form: UpdateBusinessData;
  localPhone: string;
  countryCode: CountryCode;
  localBusinessPhone: string;
  businessPhoneCountryCode: CountryCode;
}

function snapshotFromBusiness(business: NonNullable<ReturnType<typeof useBusiness>['data']>): BusinessFormSnapshot {
  const parsedPhone = parseInternationalPhone(business.phone);
  const parsedBusinessPhone = parseInternationalPhone(business.business_phone);
  return {
    countryCode: parsedPhone.countryCode,
    localPhone: parsedPhone.localNumber,
    businessPhoneCountryCode: parsedBusinessPhone.countryCode,
    localBusinessPhone: parsedBusinessPhone.localNumber,
    form: {
      name: business.name || '',
      email: business.email ?? null,
      phone: business.phone ?? null,
      website: business.website ?? null,
      description: business.description ?? null,
      business_email: business.business_email ?? null,
      business_phone: business.business_phone ?? null,
      address: business.address ?? null,
      city: business.city ?? null,
      state: business.state ?? null,
      postal_code: business.postal_code ?? null,
      country: business.country ?? null,
      tax_id: business.tax_id ?? null,
      tax_regime: (business.tax_regime as 'none' | 'vat_registered') ?? 'none',
      jurisdiction: business.jurisdiction ?? 'UG',
      default_vat_rate: business.default_vat_rate != null ? Number(business.default_vat_rate) : 18,
      prices_include_tax: business.prices_include_tax !== false,
      timezone: business.timezone ?? null,
      business_type: business.business_type ?? null,
      currency: business.currency ?? null,
      receipt_footer: business.receipt_footer ?? null,
      payment_bank_name: business.payment_bank_name ?? null,
      payment_bank_account_name: business.payment_bank_account_name ?? null,
      payment_bank_account_number: business.payment_bank_account_number ?? null,
      payment_bank_branch: business.payment_bank_branch ?? null,
      payment_mobile_money_provider: business.payment_mobile_money_provider ?? null,
      payment_mobile_money_account_name: business.payment_mobile_money_account_name ?? null,
      payment_mobile_money_number: business.payment_mobile_money_number ?? null,
      payment_instructions: business.payment_instructions ?? null,
    },
  };
}

function snapshotsEqual(a: BusinessFormSnapshot, b: BusinessFormSnapshot): boolean {
  const fullPhoneA = buildInternationalPhone(a.countryCode, a.localPhone) ?? null;
  const fullPhoneB = buildInternationalPhone(b.countryCode, b.localPhone) ?? null;
  const fullBizPhoneA = buildInternationalPhone(a.businessPhoneCountryCode, a.localBusinessPhone) ?? null;
  const fullBizPhoneB = buildInternationalPhone(b.businessPhoneCountryCode, b.localBusinessPhone) ?? null;
  return (
    fullPhoneA === fullPhoneB
    && fullBizPhoneA === fullBizPhoneB
    && JSON.stringify(a.form) === JSON.stringify(b.form)
  );
}

function formatCurrencyLabel(code: string | null | undefined): string {
  if (!code) return '—';
  const currency = CURRENCIES.find((c) => c.code === code);
  if (!currency) return code;
  return `${currency.code} (${currency.symbol}) — ${currency.name}`;
}

function formatBusinessType(value: string | null | undefined): string {
  if (!value) return '—';
  return BUSINESS_TYPE_LABELS[value] ?? value;
}

function formatLocationLine(form: UpdateBusinessData): string | null {
  const parts = [form.city, form.state, form.country].filter((part) => part?.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

function BusinessSectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Store;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('rounded-xl border-2 border-gray-200 bg-white shadow-sm', className)}>
      <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </article>
  );
}

function BusinessViewField({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3', className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-2 flex items-start gap-2 text-sm font-medium text-gray-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
          {icon}
        </span>
        <span className="min-w-0 break-words whitespace-pre-line">{children}</span>
      </dd>
    </div>
  );
}

export default function BusinessSettingsForm() {
  const { data: business, isLoading, error } = useBusiness();
  const mutation = useUpdateBusiness();
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);

  const [isEditing, setIsEditing] = useState(false);
  const [baseline, setBaseline] = useState<BusinessFormSnapshot>({
    form: emptyForm,
    localPhone: '',
    countryCode: getDefaultCountryCode(),
    localBusinessPhone: '',
    businessPhoneCountryCode: getDefaultCountryCode(),
  });
  const [form, setForm] = useState<UpdateBusinessData>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [localPhone, setLocalPhone] = useState('');
  const [businessPhoneCountryCode, setBusinessPhoneCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [localBusinessPhone, setLocalBusinessPhone] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const currencyRef = useRef<HTMLDivElement>(null);

  const resetFromBusiness = useCallback((nextBusiness: NonNullable<typeof business>) => {
    const snapshot = snapshotFromBusiness(nextBusiness);
    setBaseline(snapshot);
    setCountryCode(snapshot.countryCode);
    setLocalPhone(snapshot.localPhone);
    setBusinessPhoneCountryCode(snapshot.businessPhoneCountryCode);
    setLocalBusinessPhone(snapshot.localBusinessPhone);
    setForm(snapshot.form);
  }, []);

  useEffect(() => {
    if (business) {
      queueMicrotask(() => resetFromBusiness(business));
    }
  }, [business, resetFromBusiness]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentSnapshot = useMemo<BusinessFormSnapshot>(
    () => ({ form, localPhone, countryCode, localBusinessPhone, businessPhoneCountryCode }),
    [countryCode, form, localPhone, localBusinessPhone, businessPhoneCountryCode],
  );

  const hasChanges = isEditing && !snapshotsEqual(currentSnapshot, baseline);
  const canSave = hasChanges && (form.name?.trim().length ?? 0) > 0 && !isCompletelyOffline;

  const update = <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handlePhoneCountryChange = (next: CountryCode) => {
    const old = countryCode;
    setCountryCode(next);
    if (old.dial_code !== next.dial_code && localPhone) {
      const stripped = localPhone.replace(old.dial_code, '');
      setLocalPhone(stripped);
    }
  };

  const handleBusinessPhoneCountryChange = (next: CountryCode) => {
    const old = businessPhoneCountryCode;
    setBusinessPhoneCountryCode(next);
    if (old.dial_code !== next.dial_code && localBusinessPhone) {
      const stripped = localBusinessPhone.replace(old.dial_code, '');
      setLocalBusinessPhone(stripped);
    }
  };

  const handleCountryChange = (isoCode: string) => {
    const country = findCountryByCode(isoCode);
    if (!country) return;
    update('country', country.name);
  };

  const handleJurisdictionChange = (isoCode: string) => {
    update('jurisdiction', isoCode);
    if (form.tax_regime === 'vat_registered' && hasTaxMetadata(isoCode)) {
      update('default_vat_rate', getDefaultVatRateForJurisdiction(isoCode));
    }
  };

  const selectedCountryCode =
    resolveCountryCode(form.country)?.code
    ?? findCountryByCode(form.jurisdiction)?.code
    ?? countryCode.code;

  const handleCancel = () => {
    setCountryCode(baseline.countryCode);
    setLocalPhone(baseline.localPhone);
    setBusinessPhoneCountryCode(baseline.businessPhoneCountryCode);
    setLocalBusinessPhone(baseline.localBusinessPhone);
    setForm(baseline.form);
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    const payload: UpdateBusinessData = {
      ...form,
      name: form.name?.trim() || '',
      phone: buildInternationalPhone(countryCode, localPhone) ?? null,
      business_phone: buildInternationalPhone(businessPhoneCountryCode, localBusinessPhone) ?? null,
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const hasPendingSync = Boolean(business?._pendingSync);
  const locationLine = formatLocationLine(baseline.form);

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState
        icon={<Building2 className="w-12 h-12" />}
        title="Failed to load business settings"
        description={error?.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full min-h-full space-y-6 pb-28">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
            <Building2 className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings</p>
            <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your business details, currency, and receipt settings
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isCompletelyOffline}
            title={isCompletelyOffline ? 'Requires internet connection' : undefined}
            className="shrink-0"
          >
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            Edit business
          </Button>
        ) : (
          <Badge variant="primary">Editing</Badge>
        )}
      </div>

      {isCompletelyOffline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Business profile changes require an internet connection.</p>
        </div>
      )}

      {hasPendingSync && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          These business settings are saved locally and will sync when you are back online.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 p-4 sm:p-6">
          {!isEditing && (
            <article className="rounded-xl border-2 border-blue-200 bg-blue-50/40 shadow-sm">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-md sm:mx-0">
                  <Store className="h-10 w-10 text-blue-600" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-900">{baseline.form.name || 'Your business'}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {baseline.form.email || formatPhoneDisplay(baseline.form.phone) || 'No contact details yet'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {baseline.form.business_type ? (
                      <Badge variant="primary">{formatBusinessType(baseline.form.business_type)}</Badge>
                    ) : null}
                    {baseline.form.currency ? (
                      <Badge variant="neutral">
                        <Coins className="mr-1 inline h-3 w-3" aria-hidden />
                        {baseline.form.currency}
                      </Badge>
                    ) : null}
                    {locationLine ? (
                      <Badge variant="neutral">
                        <MapPin className="mr-1 inline h-3 w-3" aria-hidden />
                        {locationLine}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )}

          <BusinessSectionCard
            icon={Globe}
            title="Business profile"
            description="Public-facing business name and contact details."
          >
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Business name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className={iconClass} aria-hidden />
                    <input
                      className={inputClass}
                      value={form.name || ''}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Enter business name"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Owner Email</label>
                    <div className="relative">
                      <Mail className={iconClass} aria-hidden />
                      <input
                        className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                        type="email"
                        value={form.email || ''}
                        readOnly
                        tabIndex={-1}
                      />
                    </div>
                  </div>
                  <PhoneNumberField
                    label="Owner Phone"
                    countryCode={countryCode}
                    onCountryCodeChange={handlePhoneCountryChange}
                    value={localPhone}
                    onChange={setLocalPhone}
                  />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <div className="relative">
                    <Globe2 className={iconClass} aria-hidden />
                    <input
                      className={inputClass}
                      type="url"
                      value={form.website || ''}
                      onChange={(e) => update('website', e.target.value || null)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Business Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
                    <textarea
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                      rows={3}
                      value={form.description || ''}
                      onChange={(e) => update('description', e.target.value || null)}
                      placeholder="Brief description of your business..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Business Email</label>
                    <div className="relative">
                      <Mail className={iconClass} aria-hidden />
                      <input
                        className={inputClass}
                        type="email"
                        value={form.business_email || ''}
                        onChange={(e) => update('business_email', e.target.value || null)}
                        placeholder="contact@business.com"
                      />
                    </div>
                  </div>
                  <PhoneNumberField
                    label="Business Phone / WhatsApp Number"
                    countryCode={businessPhoneCountryCode}
                    onCountryCodeChange={handleBusinessPhoneCountryChange}
                    value={localBusinessPhone}
                    onChange={setLocalBusinessPhone}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <BusinessViewField label="Business Name" icon={<Store className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.name || '—'}
                </BusinessViewField>
                <BusinessViewField label="Owner Email" icon={<Mail className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.email || '—'}
                </BusinessViewField>
                <BusinessViewField label="Owner Phone" icon={<Phone className="h-4 w-4 text-blue-600" />}>
                  {formatPhoneDisplay(baseline.form.phone)}
                </BusinessViewField>
                <BusinessViewField label="Website" icon={<Globe2 className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.website || '—'}
                </BusinessViewField>
                <BusinessViewField label="Business Description" icon={<FileText className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.description || '—'}
                </BusinessViewField>
                <BusinessViewField label="Business Email" icon={<Mail className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.business_email || '—'}
                </BusinessViewField>
                <BusinessViewField label="Business Phone / WhatsApp Number" icon={<Phone className="h-4 w-4 text-blue-600" />}>
                  {formatPhoneDisplay(baseline.form.business_phone)}
                </BusinessViewField>
              </div>
            )}
          </BusinessSectionCard>

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
                  {baseline.form.address || '—'}
                </BusinessViewField>
                <BusinessViewField label="City" icon={<Building className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.city || '—'}
                </BusinessViewField>
                <BusinessViewField label="State / region" icon={<MapPinned className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.state || '—'}
                </BusinessViewField>
                <BusinessViewField label="Postal code" icon={<Hash className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.postal_code || '—'}
                </BusinessViewField>
                <BusinessViewField label="Country" icon={<Globe className="h-4 w-4 text-blue-600" />}>
                  {getCountryLabel(baseline.form.country) === 'Not set' ? '—' : getCountryLabel(baseline.form.country)}
                </BusinessViewField>
                <BusinessViewField label="Tax / VAT ID" icon={<Tag className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.tax_id || '—'}
                </BusinessViewField>
                <BusinessViewField label="Tax regime" icon={<Scale className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.tax_regime === 'vat_registered' ? 'VAT registered' : 'Not VAT registered'}
                </BusinessViewField>
                <BusinessViewField label="Tax jurisdiction" icon={<Globe className="h-4 w-4 text-blue-600" />}>
                  {getJurisdictionLabel(baseline.form.jurisdiction) === 'Not set'
                    ? '—'
                    : getJurisdictionLabel(baseline.form.jurisdiction)}
                </BusinessViewField>
                <BusinessViewField label="Business type" icon={<Building2 className="h-4 w-4 text-blue-600" />}>
                  {formatBusinessType(baseline.form.business_type)}
                </BusinessViewField>
                <BusinessViewField label="Timezone" icon={<Clock className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.timezone || '—'}
                </BusinessViewField>
                <BusinessViewField label="Currency" icon={<Coins className="h-4 w-4 text-blue-600" />}>
                  {formatCurrencyLabel(baseline.form.currency)}
                </BusinessViewField>
              </div>
            )}
          </BusinessSectionCard>

          <BusinessSectionCard
            icon={Landmark}
            title="Payment details"
            description="Bank and mobile money accounts shown on invoices so customers know where to pay."
          >
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Bank transfer</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Bank name</label>
                      <div className="relative">
                        <Landmark className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_bank_name || ''}
                          onChange={(e) => update('payment_bank_name', e.target.value || null)}
                          placeholder="e.g. Stanbic Bank"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Branch (optional)</label>
                      <div className="relative">
                        <Building className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_bank_branch || ''}
                          onChange={(e) => update('payment_bank_branch', e.target.value || null)}
                          placeholder="e.g. Kampala Road"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Account name</label>
                      <div className="relative">
                        <User className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_bank_account_name || ''}
                          onChange={(e) => update('payment_bank_account_name', e.target.value || null)}
                          placeholder="Name on the bank account"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Account number</label>
                      <div className="relative">
                        <Hash className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_bank_account_number || ''}
                          onChange={(e) => update('payment_bank_account_number', e.target.value || null)}
                          placeholder="e.g. 0123456789"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Mobile money</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Provider / telco</label>
                      <div className="relative">
                        <Smartphone className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_mobile_money_provider || ''}
                          onChange={(e) => update('payment_mobile_money_provider', e.target.value || null)}
                          placeholder="e.g. MTN Mobile Money"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Registered name</label>
                      <div className="relative">
                        <User className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_mobile_money_account_name || ''}
                          onChange={(e) => update('payment_mobile_money_account_name', e.target.value || null)}
                          placeholder="Name on the mobile money account"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Mobile money number</label>
                      <div className="relative">
                        <Phone className={iconClass} aria-hidden />
                        <input
                          className={inputClass}
                          value={form.payment_mobile_money_number || ''}
                          onChange={(e) => update('payment_mobile_money_number', e.target.value || null)}
                          placeholder="e.g. +256 700 000 000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Payment instructions (optional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
                    <textarea
                      className={`${inputClass} resize-none pl-10`}
                      rows={3}
                      value={form.payment_instructions || ''}
                      onChange={(e) => update('payment_instructions', e.target.value || null)}
                      placeholder="e.g. Use invoice number as payment reference."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <BusinessViewField label="Bank name" icon={<Landmark className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_bank_name || '—'}
                </BusinessViewField>
                <BusinessViewField label="Bank branch" icon={<Building className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_bank_branch || '—'}
                </BusinessViewField>
                <BusinessViewField label="Account name" icon={<User className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_bank_account_name || '—'}
                </BusinessViewField>
                <BusinessViewField label="Account number" icon={<Hash className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_bank_account_number || '—'}
                </BusinessViewField>
                <BusinessViewField label="Mobile money provider" icon={<Smartphone className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_mobile_money_provider || '—'}
                </BusinessViewField>
                <BusinessViewField label="Mobile money name" icon={<User className="h-4 w-4 text-blue-600" />}>
                  {baseline.form.payment_mobile_money_account_name || '—'}
                </BusinessViewField>
                <BusinessViewField label="Mobile money number" icon={<Phone className="h-4 w-4 text-blue-600" />} className="md:col-span-2">
                  {baseline.form.payment_mobile_money_number || '—'}
                </BusinessViewField>
                <BusinessViewField label="Payment instructions" icon={<FileText className="h-4 w-4 text-blue-600" />} className="md:col-span-2">
                  {baseline.form.payment_instructions || '—'}
                </BusinessViewField>
              </div>
            )}
          </BusinessSectionCard>

          <BusinessSectionCard
            icon={Receipt}
            title="Receipt settings"
            description="Footer text printed on customer receipts."
          >
            {isEditing ? (
              <div>
                <label className={labelClass}>Receipt footer</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
                  <textarea
                    className={`${inputClass} resize-none pl-10`}
                    rows={4}
                    value={form.receipt_footer || ''}
                    onChange={(e) => update('receipt_footer', e.target.value || null)}
                    placeholder="Thank you for your business!"
                  />
                </div>
              </div>
            ) : (
              <BusinessViewField label="Receipt footer" icon={<FileText className="h-4 w-4 text-blue-600" />}>
                {baseline.form.receipt_footer || '—'}
              </BusinessViewField>
            )}
          </BusinessSectionCard>
        </div>
      </div>

      {isEditing && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t-2 border-gray-200 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-600">
              {hasChanges ? 'You have unsaved changes' : 'Update your business details, then save'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending} disabled={!canSave}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
