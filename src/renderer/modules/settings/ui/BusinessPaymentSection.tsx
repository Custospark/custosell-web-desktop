import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import {
  Landmark,
  Building,
  Hash,
  User,
  Smartphone,
  Phone,
  FileText,
} from 'lucide-react';
import {
  BusinessSectionCard,
  BusinessViewField,
  iconClass,
  inputClass,
  labelClass,
} from './businessSettingsFormShared';

export interface BusinessPaymentSectionProps {
  isEditing: boolean;
  form: UpdateBusinessData;
  baseline: UpdateBusinessData;
  update: <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) => void;
  rightSlot?: React.ReactNode;
}

export function BusinessPaymentSection({
  isEditing,
  form,
  baseline,
  update,
  rightSlot,
}: BusinessPaymentSectionProps) {
  return (
    <BusinessSectionCard
      icon={Landmark}
      title="Payment details"
      description="Bank and mobile money accounts shown on invoices so customers know where to pay."
      rightSlot={rightSlot}
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
            {baseline.payment_bank_name || '-'}
          </BusinessViewField>
          <BusinessViewField label="Bank branch" icon={<Building className="h-4 w-4 text-blue-600" />}>
            {baseline.payment_bank_branch || '-'}
          </BusinessViewField>
          <BusinessViewField label="Account name" icon={<User className="h-4 w-4 text-blue-600" />}>
            {baseline.payment_bank_account_name || '-'}
          </BusinessViewField>
          <BusinessViewField label="Account number" icon={<Hash className="h-4 w-4 text-blue-600" />}>
            {baseline.payment_bank_account_number || '-'}
          </BusinessViewField>
          <BusinessViewField label="Mobile money provider" icon={<Smartphone className="h-4 w-4 text-blue-600" />}>
            {baseline.payment_mobile_money_provider || '-'}
          </BusinessViewField>
          <BusinessViewField label="Mobile money name" icon={<User className="h-4 w-4 text-blue-600" />}>
            {baseline.payment_mobile_money_account_name || '-'}
          </BusinessViewField>
          <BusinessViewField label="Mobile money number" icon={<Phone className="h-4 w-4 text-blue-600" />} className="md:col-span-2">
            {baseline.payment_mobile_money_number || '-'}
          </BusinessViewField>
          <BusinessViewField label="Payment instructions" icon={<FileText className="h-4 w-4 text-blue-600" />} className="md:col-span-2">
            {baseline.payment_instructions || '-'}
          </BusinessViewField>
        </div>
      )}
    </BusinessSectionCard>
  );
}
