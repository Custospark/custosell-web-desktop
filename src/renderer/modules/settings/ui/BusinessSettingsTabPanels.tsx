import type { RefObject } from 'react';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Button } from '../../../shared/components/buttons/Button';
import {
  BusinessSectionCard,
  BusinessViewField,
  inputClass,
  labelClass,
} from './businessSettingsFormShared';
import { BusinessProfileSection } from './BusinessProfileSection';
import { BusinessLocationSection } from './BusinessLocationSection';
import { BusinessPaymentSection } from './BusinessPaymentSection';
import { BusinessSocialSection } from './BusinessSocialSection';
import { Camera, FileText, Image, Pencil, Store } from 'lucide-react';
import type { BusinessSettingsTab } from './BusinessSettingsTabs';

export interface BusinessSettingsTabPanelsProps {
  activeTab: BusinessSettingsTab;
  editingTab: BusinessSettingsTab | null;
  isPersonal: boolean;
  form: UpdateBusinessData;
  baseline: UpdateBusinessData;
  isCompletelyOffline: boolean;
  isSaving: boolean;
  logoPreview: string | null;
  logoFileRef: RefObject<HTMLInputElement | null>;
  currencyRef: RefObject<HTMLDivElement | null>;
  currencyOpen: boolean;
  setCurrencyOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  currencySearch: string;
  setCurrencySearch: (value: string) => void;
  selectedCountryCode: string;
  update: <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) => void;
  countryCode: CountryCode;
  localPhone: string;
  businessPhoneCountryCode: CountryCode;
  localBusinessPhone: string;
  onPhoneCountryChange: (next: CountryCode) => void;
  onLocalPhoneChange: (value: string) => void;
  onBusinessPhoneCountryChange: (next: CountryCode) => void;
  onLocalBusinessPhoneChange: (value: string) => void;
  onCountryChange: (isoCode: string) => void;
  onJurisdictionChange: (isoCode: string) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditTab: (tab: BusinessSettingsTab) => void;
  onCancelEdit: () => void;
  hasTabChanges: (tab: BusinessSettingsTab) => boolean;
  tabCanSave: (tab: BusinessSettingsTab) => boolean;
}

export function BusinessSettingsTabPanels({
  activeTab,
  editingTab,
  isPersonal,
  form,
  baseline,
  isCompletelyOffline,
  isSaving,
  logoPreview,
  logoFileRef,
  currencyRef,
  currencyOpen,
  setCurrencyOpen,
  currencySearch,
  setCurrencySearch,
  selectedCountryCode,
  update,
  countryCode,
  localPhone,
  businessPhoneCountryCode,
  localBusinessPhone,
  onPhoneCountryChange,
  onLocalPhoneChange,
  onBusinessPhoneCountryChange,
  onLocalBusinessPhoneChange,
  onCountryChange,
  onJurisdictionChange,
  onLogoChange,
  onEditTab,
  onCancelEdit,
  hasTabChanges,
  tabCanSave,
}: BusinessSettingsTabPanelsProps) {
  const isEditing = (tab: BusinessSettingsTab) => editingTab === tab;
  const editButton = (tab: BusinessSettingsTab) =>
    editingTab !== tab ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEditTab(tab)}
        disabled={isCompletelyOffline}
        title={isCompletelyOffline ? 'Requires internet connection' : undefined}
      >
        <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
        Edit
      </Button>
    ) : undefined;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {activeTab === 'profile' && (
        <>
          {isEditing('profile') && !isPersonal && (
            <BusinessSectionCard
              icon={Image}
              title="Business logo"
              description="Upload your logo - it appears in the app header next to your business name."
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
                    onChange={onLogoChange}
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
            isEditing={isEditing('profile')}
            isPersonal={isPersonal}
            form={form}
            baseline={baseline}
            update={update}
            countryCode={countryCode}
            localPhone={localPhone}
            onPhoneCountryChange={onPhoneCountryChange}
            onLocalPhoneChange={onLocalPhoneChange}
            businessPhoneCountryCode={businessPhoneCountryCode}
            localBusinessPhone={localBusinessPhone}
            onBusinessPhoneCountryChange={onBusinessPhoneCountryChange}
            onLocalBusinessPhoneChange={onLocalBusinessPhoneChange}
            rightSlot={editButton('profile')}
          />

          {isEditing('profile') && (
            <EditFooter
              hasChanges={hasTabChanges('profile')}
              canSave={tabCanSave('profile')}
              isSaving={isSaving}
              onCancel={onCancelEdit}
              label="Update your profile, then save"
            />
          )}
        </>
      )}

      {activeTab === 'location' && (
        <>
          <BusinessLocationSection
            isEditing={isEditing('location')}
            isPersonal={isPersonal}
            form={form}
            baseline={baseline}
            update={update}
            selectedCountryCode={selectedCountryCode}
            handleCountryChange={onCountryChange}
            handleJurisdictionChange={onJurisdictionChange}
            currencyRef={currencyRef}
            currencyOpen={currencyOpen}
            setCurrencyOpen={setCurrencyOpen}
            currencySearch={currencySearch}
            setCurrencySearch={setCurrencySearch}
            rightSlot={editButton('location')}
          />

          {isEditing('location') && (
            <EditFooter
              hasChanges={hasTabChanges('location')}
              canSave={tabCanSave('location')}
              isSaving={isSaving}
              onCancel={onCancelEdit}
              label="Update your location & tax details, then save"
            />
          )}
        </>
      )}

      {activeTab === 'payments' && !isPersonal && (
        <>
          <BusinessPaymentSection
            isEditing={isEditing('payments')}
            form={form}
            baseline={baseline}
            update={update}
            rightSlot={editButton('payments')}
          />

          {isEditing('payments') && (
            <EditFooter
              hasChanges={hasTabChanges('payments')}
              canSave={tabCanSave('payments')}
              isSaving={isSaving}
              onCancel={onCancelEdit}
              label="Update your payment details, then save"
            />
          )}
        </>
      )}

      {activeTab === 'receipts' && !isPersonal && (
        <>
          <BusinessSectionCard
            icon={FileText}
            title="Receipt settings"
            description="Footer text printed on customer receipts."
            rightSlot={editButton('receipts')}
          >
            {isEditing('receipts') ? (
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
                {baseline.receipt_footer || '-'}
              </BusinessViewField>
            )}
          </BusinessSectionCard>

          {isEditing('receipts') && (
            <EditFooter
              hasChanges={hasTabChanges('receipts')}
              canSave={tabCanSave('receipts')}
              isSaving={isSaving}
              onCancel={onCancelEdit}
              label="Update your receipt settings, then save"
            />
          )}
        </>
      )}

      {activeTab === 'social' && !isPersonal && <BusinessSocialSection />}
    </div>
  );
}

/** Per-tab Save/Cancel footer shown while that tab is being edited. */
function EditFooter({
  hasChanges,
  canSave,
  isSaving,
  onCancel,
  label,
}: {
  hasChanges: boolean;
  canSave: boolean;
  isSaving: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-snug text-gray-600">
          {hasChanges ? 'You have unsaved changes' : label}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" loading={isSaving} disabled={!canSave} className="w-full sm:w-auto">
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
