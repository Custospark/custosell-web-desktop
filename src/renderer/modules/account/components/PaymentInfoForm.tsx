import { useMemo, useState } from 'react';
import { Check, Landmark, Smartphone } from 'lucide-react';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import { SearchableSelect } from '../../../shared/components/inputs/SearchableSelect';
import { cn } from '../../../shared/utils/cn';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import { buildInternationalPhone } from '../../../shared/utils/phoneNumber';
import { useUpdatePaymentInfo } from '../api/useAccountQueries';
import { BANK_GROUPS, findBankByName, OTHER_OPTION } from '../data/bankOptions';
import { mobileMoneyProvidersFor } from '../data/mobileMoneyProviders';
import {
  validatePaymentForm,
  type PaymentFormState,
  type PaymentMethod,
} from '../data/paymentInfoFormShared';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors';

const selectCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

interface MethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function MethodCard({ icon, title, description, selected, onClick }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors cursor-pointer',
        selected
          ? 'border-indigo-500 bg-indigo-50/60'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{description}</span>
      </span>
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

interface PaymentInfoFormProps {
  initialForm: PaymentFormState;
  initialCountry: CountryCode;
  hasSavedData: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

const bankOptions = BANK_GROUPS.flatMap((group) =>
  group.banks.map((bank) => ({
    value: bank.name,
    label: bank.name,
    group: `${group.region} · ${group.country}`,
  })),
);

export function PaymentInfoForm({ initialForm, initialCountry, hasSavedData, onCancel, onSaved }: PaymentInfoFormProps) {
  const updatePaymentInfo = useUpdatePaymentInfo();

  const [form, setForm] = useState<PaymentFormState>(initialForm);
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [bankOther, setBankOther] = useState(false);
  const [branchOther, setBranchOther] = useState(false);
  const [providerOther, setProviderOther] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const selectedBank = useMemo(() => findBankByName(form.bank_name), [form.bank_name]);
  const branches = useMemo(() => (selectedBank ? selectedBank.branches : []), [selectedBank]);
  const bankIsOther = bankOther || (form.bank_name !== '' && !selectedBank);
  const branchIsOther = branchOther || (form.bank_branch !== '' && branches.length > 0 && !branches.includes(form.bank_branch));

  const providerOptions = useMemo(() => mobileMoneyProvidersFor(country.code), [country.code]);
  const providerIsOther = providerOther || (form.mobile_money_provider !== '' && !providerOptions.includes(form.mobile_money_provider));

  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: branch, label: branch })),
    [branches],
  );

  const errors = useMemo(() => validatePaymentForm(form), [form]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.payment_method) return;
    const nextErrors = validatePaymentForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    const payload: Record<string, string> = { payment_method: form.payment_method };
    if (form.payment_method === 'mobile_money') {
      payload.mobile_money_provider = form.mobile_money_provider.trim();
      payload.mobile_money_number = buildInternationalPhone(country, form.mobile_money_number) ?? '';
    } else if (form.payment_method === 'bank') {
      payload.bank_name = form.bank_name.trim();
      payload.bank_account_name = form.bank_account_name.trim();
      payload.bank_account_number = form.bank_account_number.trim();
      payload.bank_branch = form.bank_branch.trim();
    }
    updatePaymentInfo.mutate(payload, { onSuccess: onSaved });
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setForm((f) => ({ ...f, payment_method: method }));
    setShowErrors(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <p className="text-sm font-medium text-gray-800 mb-3">How would you like to receive your referral rewards?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MethodCard
            icon={<Smartphone className="h-5 w-5" />}
            title="Mobile Money"
            description="M-Pesa, MTN MoMo, Airtel Money and more"
            selected={form.payment_method === 'mobile_money'}
            onClick={() => handleMethodChange('mobile_money')}
          />
          <MethodCard
            icon={<Landmark className="h-5 w-5" />}
            title="Bank Transfer"
            description="Deposit to a bank account worldwide"
            selected={form.payment_method === 'bank'}
            onClick={() => handleMethodChange('bank')}
          />
        </div>
      </div>

      {form.payment_method === 'mobile_money' && (
        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900">Mobile Money details</h3>
          </div>

          <div>
            <FieldLabel required>Mobile Money Number</FieldLabel>
            <PhoneNumberField
              countryCode={country}
              onCountryCodeChange={(c) => {
                setCountry(c);
                setForm((f) => ({ ...f, mobile_money_provider: '' }));
                setProviderOther(false);
              }}
              value={form.mobile_money_number}
              onChange={(local) => {
                setForm((f) => ({ ...f, mobile_money_number: local.replace(/\D/g, '') }));
                setShowErrors(false);
              }}
              placeholder="700 123 456"
              showPreview
            />
            {showErrors && errors.mobile_money_number && (
              <FieldError message={errors.mobile_money_number} />
            )}
          </div>

          <div>
            <FieldLabel required>Provider</FieldLabel>
            {providerOptions.length > 0 ? (
              <>
                <select
                  className={selectCls}
                  value={providerIsOther ? OTHER_OPTION : form.mobile_money_provider}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === OTHER_OPTION) {
                      setProviderOther(true);
                      setForm((f) => ({ ...f, mobile_money_provider: '' }));
                    } else if (value === '') {
                      setProviderOther(false);
                      setForm((f) => ({ ...f, mobile_money_provider: '' }));
                    } else {
                      setProviderOther(false);
                      setForm((f) => ({ ...f, mobile_money_provider: value }));
                    }
                    setShowErrors(false);
                  }}
                >
                  <option value="">Select provider</option>
                  {providerOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value={OTHER_OPTION}>Other provider…</option>
                </select>
                {providerIsOther && (
                  <input
                    type="text"
                    value={form.mobile_money_provider}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, mobile_money_provider: e.target.value }));
                      setShowErrors(false);
                    }}
                    placeholder="Type provider name"
                    className={cn(inputCls, 'mt-2')}
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                value={form.mobile_money_provider}
                onChange={(e) => {
                  setForm((f) => ({ ...f, mobile_money_provider: e.target.value }));
                  setShowErrors(false);
                }}
                placeholder="Type provider name"
                className={inputCls}
              />
            )}
            {showErrors && errors.mobile_money_provider && (
              <FieldError message={errors.mobile_money_provider} />
            )}
          </div>
        </section>
      )}

      {form.payment_method === 'bank' && (
        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900">Bank account details</h3>
          </div>

          <div>
            <FieldLabel required>Bank Name</FieldLabel>
            <select
              className={selectCls}
              value={bankIsOther ? OTHER_OPTION : form.bank_name}
              onChange={(e) => {
                const bankValue = e.target.value;
                if (bankValue === OTHER_OPTION) {
                  setBankOther(true);
                  setBranchOther(false);
                  setForm((f) => ({ ...f, bank_name: '', bank_branch: '' }));
                } else if (bankValue === '') {
                  setBankOther(false);
                  setBranchOther(false);
                  setForm((f) => ({ ...f, bank_name: '', bank_branch: '' }));
                } else {
                  setBankOther(false);
                  setBranchOther(false);
                  setForm((f) => ({ ...f, bank_name: bankValue, bank_branch: '' }));
                }
                setShowErrors(false);
              }}
            >
              <option value="">Select bank</option>
              {bankOptions.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
              <option value={OTHER_OPTION}>Other bank…</option>
            </select>
            {bankIsOther && (
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_name: e.target.value }));
                  setShowErrors(false);
                }}
                placeholder="Type your bank name"
                className={cn(inputCls, 'mt-2')}
              />
            )}
            {showErrors && errors.bank_name && <FieldError message={errors.bank_name} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Account Name</FieldLabel>
              <input
                type="text"
                value={form.bank_account_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_account_name: e.target.value }));
                  setShowErrors(false);
                }}
                placeholder="Full name on account"
                className={inputCls}
              />
              {showErrors && errors.bank_account_name && <FieldError message={errors.bank_account_name} />}
            </div>

            <div>
              <FieldLabel required>Account Number</FieldLabel>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_account_number: e.target.value }));
                  setShowErrors(false);
                }}
                placeholder="Account number"
                className={inputCls}
              />
              {showErrors && errors.bank_account_number && <FieldError message={errors.bank_account_number} />}
            </div>
          </div>

          <div className={selectedBank && branches.length > 0 ? '' : 'sm:col-span-2'}>
            <FieldLabel required>Branch</FieldLabel>
            {selectedBank && branches.length > 0 ? (
              <>
                <SearchableSelect
                  placeholder="Select branch"
                  searchPlaceholder="Search branches..."
                  value={branchIsOther ? OTHER_OPTION : form.bank_branch}
                  onChange={(value) => {
                    if (value === OTHER_OPTION) {
                      setBranchOther(true);
                      setForm((f) => ({ ...f, bank_branch: '' }));
                    } else {
                      setBranchOther(false);
                      setForm((f) => ({ ...f, bank_branch: value }));
                    }
                    setShowErrors(false);
                  }}
                  options={branchOptions}
                  emptyOption={{ value: '', label: 'Select branch' }}
                  otherOption={{ value: OTHER_OPTION, label: 'Other branch…' }}
                  maxVisibleOptions={5}
                />
                {branchIsOther && (
                  <input
                    type="text"
                    value={form.bank_branch}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, bank_branch: e.target.value }));
                      setShowErrors(false);
                    }}
                    placeholder="Type your branch"
                    className={cn(inputCls, 'mt-2')}
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                value={form.bank_branch}
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_branch: e.target.value }));
                  setShowErrors(false);
                }}
                placeholder="Branch name"
                className={inputCls}
              />
            )}
            {showErrors && errors.bank_branch && <FieldError message={errors.bank_branch} />}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        {hasSavedData && (
          <button
            type="button"
            onClick={onCancel}
            disabled={updatePaymentInfo.isPending}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={updatePaymentInfo.isPending}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          {updatePaymentInfo.isPending ? 'Saving...' : 'Save Payment Info'}
        </button>
      </div>
    </form>
  );
}
