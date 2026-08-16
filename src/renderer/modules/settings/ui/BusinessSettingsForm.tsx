import { useState, useEffect, useRef, useCallback } from 'react';
import { useBusiness, useUpdateBusiness } from '../api/settings/BusinessQueries';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Badge } from '../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import {
  getDefaultVatRateForJurisdiction,
  hasTaxMetadata,
} from '../../../shared/utils/taxJurisdictions';
import {
  findCountryByCode,
  resolveCountryCode,
  type CountryCode,
} from '../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  formatPhoneDisplay,
  getDefaultCountryCode,
} from '../../../shared/utils/phoneNumber';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import {
  Building2,
  MapPin,
  Store,
  WifiOff,
  Coins,
  Tags,
} from 'lucide-react';
import {
  emptyForm,
  type BusinessFormSnapshot,
  snapshotFromBusiness,
  formatLocationLine,
} from './businessSettingsFormShared';
import { useStorefrontFacets } from '../../storefront/api/storefrontQueries';
import { BusinessSettingsTabs, type BusinessSettingsTab } from './BusinessSettingsTabs';
import { BusinessSettingsTabPanels } from './BusinessSettingsTabPanels';

export default function BusinessSettingsForm() {
  const { data: business, isLoading, error } = useBusiness();
  const mutation = useUpdateBusiness();
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: facets } = useStorefrontFacets();

  const user = useAppSelector((s) => s.auth.user);
  const isPersonal = user?.account_type === 'personal';

  const [activeTab, setActiveTab] = useState<BusinessSettingsTab>('profile');
  const [editingTab, setEditingTab] = useState<BusinessSettingsTab | null>(null);
  const [baseline, setBaseline] = useState<BusinessFormSnapshot>({
    form: emptyForm,
    localPhone: '',
    countryCode: getDefaultCountryCode(),
    localBusinessPhone: '',
    businessPhoneCountryCode: getDefaultCountryCode(),
    logoPath: null,
  });
  const [form, setForm] = useState<UpdateBusinessData>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [localPhone, setLocalPhone] = useState('');
  const [businessPhoneCountryCode, setBusinessPhoneCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [localBusinessPhone, setLocalBusinessPhone] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const currencyRef = useRef<HTMLDivElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileSelected, setLogoFileSelected] = useState(false);

  const selectedCategoryId = business?.business_category_id ?? baseline.form.business_category_id ?? null;
  const businessCategoryLabel =
    facets?.business_categories.find((c) => c.id === selectedCategoryId)?.name ?? null;

  const resetFromBusiness = useCallback((nextBusiness: NonNullable<typeof business>) => {
    const snapshot = snapshotFromBusiness(nextBusiness);
    setBaseline(snapshot);
    setCountryCode(snapshot.countryCode);
    setLocalPhone(snapshot.localPhone);
    setBusinessPhoneCountryCode(snapshot.businessPhoneCountryCode);
    setLocalBusinessPhone(snapshot.localBusinessPhone);
    setForm(snapshot.form);
    setLogoPreview(avatarUrl(snapshot.logoPath) ?? null);
    setLogoFileSelected(false);
    if (logoFileRef.current) logoFileRef.current.value = '';
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

  const update = <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handlePhoneCountryChange = (next: CountryCode) => {
    const old = countryCode;
    setCountryCode(next);
    if (old.dial_code !== next.dial_code && localPhone) {
      setLocalPhone(localPhone.replace(old.dial_code, ''));
    }
  };

  const handleBusinessPhoneCountryChange = (next: CountryCode) => {
    const old = businessPhoneCountryCode;
    setBusinessPhoneCountryCode(next);
    if (old.dial_code !== next.dial_code && localBusinessPhone) {
      setLocalBusinessPhone(localBusinessPhone.replace(old.dial_code, ''));
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      setLogoFileSelected(true);
    }
  };

  // ── Per-tab editing ────────────────────────────────────────────────────────
  // Each tab owns a subset of the business form fields and can be edited and
  // saved independently - no global edit mode, no "save everything" gate.

  const TAB_FIELDS: Record<BusinessSettingsTab, (keyof UpdateBusinessData)[]> = {
    profile: ['name', 'website', 'description', 'business_email', 'business_phone', 'email', 'phone'],
    location: [
      'address', 'city', 'state', 'postal_code', 'country', 'tax_id', 'tax_regime',
      'jurisdiction', 'default_vat_rate', 'prices_include_tax', 'timezone', 'currency',
      'business_category_id',
    ],
    payments: [
      'payment_bank_name', 'payment_bank_branch', 'payment_bank_account_name',
      'payment_bank_account_number', 'payment_mobile_money_provider',
      'payment_mobile_money_account_name', 'payment_mobile_money_number',
      'payment_instructions',
    ],
    receipts: ['receipt_footer'],
    social: [],
  };

  /** True when the given tab has un-saved edits. */
  function tabHasChanges(tab: BusinessSettingsTab): boolean {
    if (tab === 'profile') {
      const phoneChanged =
        localPhone !== baseline.localPhone
        || businessPhoneCountryCode.code !== baseline.businessPhoneCountryCode.code
        || localBusinessPhone !== baseline.localBusinessPhone
        || countryCode.code !== baseline.countryCode.code;
      return phoneChanged || logoFileSelected || TAB_FIELDS.profile.some((k) => form[k] !== baseline.form[k]);
    }
    if (tab === 'social') return false;
    return TAB_FIELDS[tab].some((k) => form[k] !== baseline.form[k]);
  }

  const tabCanSave = (tab: BusinessSettingsTab): boolean =>
    tab !== 'social'
    && tabHasChanges(tab)
    && (tab !== 'profile' || (form.name?.trim().length ?? 0) > 0)
    && !isCompletelyOffline;

  const startEdit = (tab: BusinessSettingsTab) => {
    if (isCompletelyOffline) return;
    setEditingTab(tab);
  };

  const cancelEdit = () => {
    setCountryCode(baseline.countryCode);
    setLocalPhone(baseline.localPhone);
    setBusinessPhoneCountryCode(baseline.businessPhoneCountryCode);
    setLocalBusinessPhone(baseline.localBusinessPhone);
    setForm(baseline.form);
    setLogoPreview(avatarUrl(baseline.logoPath) ?? null);
    setLogoFileSelected(false);
    if (logoFileRef.current) logoFileRef.current.value = '';
    setEditingTab(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tab = editingTab;
    if (!tab || !tabCanSave(tab)) return;

    const payload: UpdateBusinessData = {};
    for (const key of TAB_FIELDS[tab]) {
      payload[key] = form[key];
    }

    if (tab === 'profile') {
      payload.name = form.name?.trim() || '';
      payload.business_email = form.business_email?.trim() || null;
      payload.business_phone = buildInternationalPhone(businessPhoneCountryCode, localBusinessPhone) ?? null;
      if (isPersonal) {
        payload.email = form.email?.trim() || null;
        payload.phone = buildInternationalPhone(countryCode, localPhone) ?? null;
      } else {
        delete payload.email;
        delete payload.phone;
      }
    }

    mutation.mutate(
      {
        data: payload,
        logoFile: tab === 'profile' ? logoFileRef.current?.files?.[0] : undefined,
      },
      {
        onSuccess: () => {
          setEditingTab(null);
        },
      },
    );
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
    <form onSubmit={handleSubmit} className="relative w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600 sm:p-2.5">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings</p>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{isPersonal ? 'Preferences' : 'Business Profile'}</h1>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              {isPersonal ? 'Manage your preferences, location, and currency' : 'Manage your business details, tax, payments, and receipts'}
            </p>
          </div>
        </div>
      </div>

      {isCompletelyOffline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{isPersonal ? 'Preference changes require an internet connection.' : 'Business profile changes require an internet connection.'}</p>
        </div>
      )}

      {hasPendingSync && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          These business settings are saved locally and will sync when you are back online.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <article className="rounded-xl border-2 border-blue-200 bg-blue-50/40 shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:mx-0">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-10 w-10 text-blue-600" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900">{baseline.form.name || (isPersonal ? 'Your profile' : 'Your business')}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {isPersonal
                  ? (baseline.form.email || formatPhoneDisplay(baseline.form.phone) || 'No contact details yet')
                  : (baseline.form.business_email || formatPhoneDisplay(baseline.form.business_phone) || 'No business contact details yet')}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {!isPersonal && businessCategoryLabel ? (
                  <Badge variant="primary">
                    <Tags className="mr-1 inline h-3 w-3" aria-hidden />
                    {businessCategoryLabel}
                  </Badge>
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

        <BusinessSettingsTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          isPersonal={isPersonal}
        />

        <BusinessSettingsTabPanels
          activeTab={activeTab}
          editingTab={editingTab}
          isPersonal={isPersonal}
          form={form}
          baseline={baseline.form}
          isCompletelyOffline={isCompletelyOffline}
          isSaving={mutation.isPending}
          logoPreview={logoPreview}
          logoFileRef={logoFileRef}
          currencyRef={currencyRef}
          currencyOpen={currencyOpen}
          setCurrencyOpen={setCurrencyOpen}
          currencySearch={currencySearch}
          setCurrencySearch={setCurrencySearch}
          selectedCountryCode={selectedCountryCode}
          update={update}
          countryCode={countryCode}
          localPhone={localPhone}
          businessPhoneCountryCode={businessPhoneCountryCode}
          localBusinessPhone={localBusinessPhone}
          onPhoneCountryChange={handlePhoneCountryChange}
          onLocalPhoneChange={setLocalPhone}
          onBusinessPhoneCountryChange={handleBusinessPhoneCountryChange}
          onLocalBusinessPhoneChange={setLocalBusinessPhone}
          onCountryChange={handleCountryChange}
          onJurisdictionChange={handleJurisdictionChange}
          onLogoChange={handleLogoChange}
          onEditTab={startEdit}
          onCancelEdit={cancelEdit}
          hasTabChanges={tabHasChanges}
          tabCanSave={tabCanSave}
        />
      </div>
    </form>
  );
}
