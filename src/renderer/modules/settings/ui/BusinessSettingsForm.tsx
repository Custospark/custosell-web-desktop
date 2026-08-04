import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useBusiness, useUpdateBusiness } from '../api/settings/BusinessQueries';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Badge } from '../../../shared/components/badges/Badge';
import { Button } from '../../../shared/components/buttons/Button';
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
  Receipt,
  Store,
  FileText,
  Pencil,
  WifiOff,
  Coins,
  Camera,
  Image,
} from 'lucide-react';
import {
  emptyForm,
  type BusinessFormSnapshot,
  snapshotFromBusiness,
  snapshotsEqual,
  formatBusinessType,
  formatLocationLine,
  BusinessSectionCard,
  BusinessViewField,
  inputClass,
  labelClass,
} from './businessSettingsFormShared';
import { BusinessProfileSection } from './BusinessProfileSection';
import { BusinessLocationSection } from './BusinessLocationSection';
import { BusinessPaymentSection } from './BusinessPaymentSection';

export default function BusinessSettingsForm() {
  const { data: business, isLoading, error } = useBusiness();
  const mutation = useUpdateBusiness();
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);

  const user = useAppSelector((s) => s.auth.user);
  const isPersonal = user?.account_type === 'personal';

  const [isEditing, setIsEditing] = useState(false);
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

  const currentSnapshot = useMemo<BusinessFormSnapshot>(
    () => ({ form, localPhone, countryCode, localBusinessPhone, businessPhoneCountryCode, logoPath: null }),
    [countryCode, form, localPhone, localBusinessPhone, businessPhoneCountryCode],
  );

  const hasChanges = isEditing && (!snapshotsEqual(currentSnapshot, baseline) || logoFileSelected);
  const canSave = hasChanges && (form.name?.trim().length ?? 0) > 0 && !isCompletelyOffline;

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

  const handleCancel = () => {
    setCountryCode(baseline.countryCode);
    setLocalPhone(baseline.localPhone);
    setBusinessPhoneCountryCode(baseline.businessPhoneCountryCode);
    setLocalBusinessPhone(baseline.localBusinessPhone);
    setForm(baseline.form);
    setLogoPreview(avatarUrl(baseline.logoPath) ?? null);
    setLogoFileSelected(false);
    if (logoFileRef.current) logoFileRef.current.value = '';
    setIsEditing(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      setLogoFileSelected(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    const payload: UpdateBusinessData = {
      ...form,
      name: form.name?.trim() || '',
      business_email: form.business_email?.trim() || null,
      business_phone: buildInternationalPhone(businessPhoneCountryCode, localBusinessPhone) ?? null,
    };

    if (isPersonal) {
      payload.email = form.email?.trim() || null;
      payload.phone = buildInternationalPhone(countryCode, localPhone) ?? null;
    } else {
      delete payload.email;
      delete payload.phone;
    }

    mutation.mutate(
      {
        data: payload,
        logoFile: logoFileRef.current?.files?.[0],
      },
      {
        onSuccess: () => {
          setIsEditing(false);
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
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isCompletelyOffline}
            title={isCompletelyOffline ? 'Requires internet connection' : undefined}
            className="w-full shrink-0 sm:w-auto"
          >
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            {isPersonal ? 'Edit preferences' : 'Edit business'}
          </Button>
        ) : (
          <Badge variant="primary" className="self-start lg:self-auto">Editing</Badge>
        )}
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
        <div className="space-y-4 p-4 sm:p-6">
          {!isEditing && (
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
                    {!isPersonal && baseline.form.business_type ? (
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

          {isEditing && !isPersonal && (
            <BusinessSectionCard
              icon={Image}
              title="Business logo"
              description="Upload your logo — it appears in the app header next to your business name."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100 sm:mx-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-gray-400" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    aria-label="Upload business logo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => logoFileRef.current?.click()}
                  >
                    <Camera className="mr-1.5 h-4 w-4" aria-hidden />
                    Upload logo
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
            </BusinessSectionCard>
          )}

          <BusinessProfileSection
            isEditing={isEditing}
            isPersonal={isPersonal}
            form={form}
            baseline={baseline.form}
            update={update}
            countryCode={countryCode}
            localPhone={localPhone}
            onPhoneCountryChange={handlePhoneCountryChange}
            onLocalPhoneChange={setLocalPhone}
            businessPhoneCountryCode={businessPhoneCountryCode}
            localBusinessPhone={localBusinessPhone}
            onBusinessPhoneCountryChange={handleBusinessPhoneCountryChange}
            onLocalBusinessPhoneChange={setLocalBusinessPhone}
          />

          <BusinessLocationSection
            isEditing={isEditing}
            isPersonal={isPersonal}
            form={form}
            baseline={baseline.form}
            update={update}
            selectedCountryCode={selectedCountryCode}
            handleCountryChange={handleCountryChange}
            handleJurisdictionChange={handleJurisdictionChange}
            currencyRef={currencyRef}
            currencyOpen={currencyOpen}
            setCurrencyOpen={setCurrencyOpen}
            currencySearch={currencySearch}
            setCurrencySearch={setCurrencySearch}
          />

          {!isPersonal && (
            <BusinessPaymentSection
              isEditing={isEditing}
              form={form}
              baseline={baseline.form}
              update={update}
            />
          )}

          {!isPersonal && (
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
          )}
        </div>

        {isEditing && (
          <div className="border-t-2 border-gray-200 bg-gray-50/80 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm font-medium leading-snug text-gray-600">
                {hasChanges ? 'You have unsaved changes' : isPersonal ? 'Update your preferences, then save' : 'Update your business details, then save'}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  disabled={!canSave}
                  className="w-full sm:w-auto"
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
