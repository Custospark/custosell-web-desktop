import type { CountryCode } from '../../../shared/utils/countryCodes';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import { formatPhoneDisplay } from '../../../shared/utils/phoneNumber';
import {
  Globe,
  Store,
  Mail,
  Phone,
  Globe2,
  FileText,
} from 'lucide-react';
import {
  BusinessSectionCard,
  BusinessViewField,
  iconClass,
  inputClass,
  labelClass,
} from './businessSettingsFormShared';

export interface BusinessProfileSectionProps {
  isEditing: boolean;
  isPersonal: boolean;
  form: UpdateBusinessData;
  baseline: UpdateBusinessData;
  update: <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) => void;
  countryCode: CountryCode;
  localPhone: string;
  onPhoneCountryChange: (next: CountryCode) => void;
  onLocalPhoneChange: (value: string) => void;
  businessPhoneCountryCode: CountryCode;
  localBusinessPhone: string;
  onBusinessPhoneCountryChange: (next: CountryCode) => void;
  onLocalBusinessPhoneChange: (value: string) => void;
  rightSlot?: React.ReactNode;
}

export function BusinessProfileSection({
  isEditing,
  isPersonal,
  form,
  baseline,
  update,
  countryCode,
  localPhone,
  onPhoneCountryChange,
  onLocalPhoneChange,
  businessPhoneCountryCode,
  localBusinessPhone,
  onBusinessPhoneCountryChange,
  onLocalBusinessPhoneChange,
  rightSlot,
}: BusinessProfileSectionProps) {
  return (
    <BusinessSectionCard
      icon={Globe}
      title={isPersonal ? 'Profile' : 'Business profile'}
      description={isPersonal ? 'Your personal name and contact details.' : 'Public-facing business name and contact details.'}
      rightSlot={rightSlot}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              {isPersonal ? 'Full name' : 'Business name'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Store className={iconClass} aria-hidden />
              <input
                className={inputClass}
                value={form.name || ''}
                onChange={(e) => update('name', e.target.value)}
                placeholder={isPersonal ? 'Enter your name' : 'Enter business name'}
                required
              />
            </div>
          </div>
          {isPersonal && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Email</label>
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
                label="Phone"
                countryCode={countryCode}
                onCountryCodeChange={onPhoneCountryChange}
                value={localPhone}
                onChange={onLocalPhoneChange}
              />
            </div>
          )}
          {!isPersonal && (
            <>
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
                  onCountryCodeChange={onBusinessPhoneCountryChange}
                  value={localBusinessPhone}
                  onChange={onLocalBusinessPhoneChange}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BusinessViewField label={isPersonal ? 'Full name' : 'Business Name'} icon={<Store className="h-4 w-4 text-blue-600" />}>
            {baseline.name || '-'}
          </BusinessViewField>
          {isPersonal && (
            <>
              <BusinessViewField label="Email" icon={<Mail className="h-4 w-4 text-blue-600" />}>
                {baseline.email || '-'}
              </BusinessViewField>
              <BusinessViewField label="Phone" icon={<Phone className="h-4 w-4 text-blue-600" />}>
                {formatPhoneDisplay(baseline.phone)}
              </BusinessViewField>
            </>
          )}
          {!isPersonal && (
            <>
              <BusinessViewField label="Website" icon={<Globe2 className="h-4 w-4 text-blue-600" />}>
                {baseline.website || '-'}
              </BusinessViewField>
              <BusinessViewField label="Business Description" icon={<FileText className="h-4 w-4 text-blue-600" />}>
                {baseline.description || '-'}
              </BusinessViewField>
              <BusinessViewField label="Business Email" icon={<Mail className="h-4 w-4 text-blue-600" />}>
                {baseline.business_email || '-'}
              </BusinessViewField>
              <BusinessViewField label="Business Phone / WhatsApp Number" icon={<Phone className="h-4 w-4 text-blue-600" />}>
                {formatPhoneDisplay(baseline.business_phone)}
              </BusinessViewField>
            </>
          )}
        </div>
      )}
    </BusinessSectionCard>
  );
}
