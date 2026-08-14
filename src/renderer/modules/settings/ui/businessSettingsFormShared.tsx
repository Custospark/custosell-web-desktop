/* eslint-disable react-refresh/only-export-components -- shared form UI + constants/helpers */
import { type ReactNode } from 'react';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { CURRENCIES } from '../../../shared/utils/currencies';
import {
  buildInternationalPhone,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';
import { type CountryCode } from '../../../shared/utils/countryCodes';
import { cn } from '../../../shared/utils/cn';
import { Store } from 'lucide-react';

export const emptyForm: UpdateBusinessData = {
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
  business_category_id: null,
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

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
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

export const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
export const selectClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
export const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
export const iconClass = 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none';

export interface BusinessFormSnapshot {
  form: UpdateBusinessData;
  localPhone: string;
  countryCode: CountryCode;
  localBusinessPhone: string;
  businessPhoneCountryCode: CountryCode;
  logoPath: string | null;
}

type BusinessLike = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  tax_regime?: string | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
  timezone?: string | null;
  business_type?: string | null;
  business_category_id?: number | null;
  currency?: string | null;
  receipt_footer?: string | null;
  payment_bank_name?: string | null;
  payment_bank_account_name?: string | null;
  payment_bank_account_number?: string | null;
  payment_bank_branch?: string | null;
  payment_mobile_money_provider?: string | null;
  payment_mobile_money_account_name?: string | null;
  payment_mobile_money_number?: string | null;
  payment_instructions?: string | null;
  logo_path?: string | null;
};

export function snapshotFromBusiness(business: BusinessLike): BusinessFormSnapshot {
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
      business_category_id: business.business_category_id ?? null,
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
    logoPath: business.logo_path ?? null,
  };
}

export function snapshotsEqual(a: BusinessFormSnapshot, b: BusinessFormSnapshot): boolean {
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

export function formatCurrencyLabel(code: string | null | undefined): string {
  if (!code) return '-';
  const currency = CURRENCIES.find((c) => c.code === code);
  if (!currency) return code;
  return `${currency.code} (${currency.symbol}) - ${currency.name}`;
}

export function formatBusinessType(value: string | null | undefined): string {
  if (!value) return '-';
  return BUSINESS_TYPE_LABELS[value] ?? value;
}

export function formatLocationLine(form: UpdateBusinessData): string | null {
  const parts = [form.city, form.state, form.country].filter((part) => part?.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

export function BusinessSectionCard({
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

export function BusinessViewField({
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
