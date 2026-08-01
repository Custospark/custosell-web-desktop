import { useMemo, useState } from 'react';
import { Landmark, Smartphone } from 'lucide-react';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
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
const selectCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors';

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

interface PaymentInfoFormProps {
  initialForm: PaymentFormState;
  initialCountry: CountryCode;
  hasSavedData: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

export function PaymentInfoForm({ initialForm, initialCountry, hasSavedData, onCancel, onSaved }: PaymentInfoFormProps) {
  const updatePaymentInfo = useUpdatePaymentInfo();

  const [form, setForm] = useState<PaymentFormState>(initialForm);
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [providerOther, setProviderOther] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const selectedBank = useMemo(() => findBankByName(form.bank_name), [form.bank_name]);
  const branches = selectedBank ? selectedBank.branches : [];
  const bankIsOther = form.bank_name !== '' && !selectedBank;
  const branchIsOther = form.bank_branch !== '' && !branches.includes(form.bank_branch);

  const providerOptions = useMemo(() => mobileMoneyProvidersFor(country.code), [country.code]);
  const providerIsOther = providerOther || (form.mobile_money_provider !== '' && !providerOptions.includes(form.mobile_money_provider));

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
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="payment_method"
            value="mobile_money"
            checked={form.payment_method === 'mobile_money'}
            onChange={() => handleMethodChange('mobile_money')}
            className="accent-indigo-600"
          />
          <Smartphone className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Mobile Money</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="payment_method"
            value="bank"
            checked={form.payment_method === 'bank'}
            onChange={() => handleMethodChange('bank')}
            className="accent-indigo-600"
          />
          <Landmark className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Bank Transfer</span>
        </label>
      </div>

      {!form.payment_method && (
        <p className="text-xs text-gray-400">Choose a payout method to continue.</p>
      )}

      {form.payment_method === 'mobile_money' && (
        <div className="space-y-4">
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
                  value={providerIsOther ? OTHER_OPTION : form.mobile_money_provider}
                  onChange={(e) => {
                    if (e.target.value === OTHER_OPTION) {
                      setProviderOther(true);
                      setForm((f) => ({ ...f, mobile_money_provider: '' }));
                    } else {
                      setProviderOther(false);
                      setForm((f) => ({ ...f, mobile_money_provider: e.target.value }));
                    }
                    setShowErrors(false);
                  }}
                  className={selectCls}
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
        </div>
      )}

      {form.payment_method === 'bank' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel required>Bank Name</FieldLabel>
            <select
              value={bankIsOther ? OTHER_OPTION : form.bank_name}
              onChange={(e) => {
                if (e.target.value === OTHER_OPTION) {
                  setForm((f) => ({ ...f, bank_name: '', bank_branch: '' }));
                } else {
                  setForm((f) => ({ ...f, bank_name: e.target.value, bank_branch: '' }));
                }
                setShowErrors(false);
              }}
              className={selectCls}
            >
              <option value="">Select bank</option>
              {BANK_GROUPS.map((group) => (
                <optgroup key={`${group.region}-${group.country}`} label={`${group.region} · ${group.country}`}>
                  {group.banks.map((bank) => (
                    <option key={bank.name} value={bank.name}>{bank.name}</option>
                  ))}
                </optgroup>
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

          <div className={selectedBank ? '' : 'sm:col-span-2'}>
            <FieldLabel required>Branch</FieldLabel>
            {selectedBank && branches.length > 0 ? (
              <>
                <select
                  value={branchIsOther ? OTHER_OPTION : form.bank_branch}
                  onChange={(e) => {
                    if (e.target.value === OTHER_OPTION) {
                      setForm((f) => ({ ...f, bank_branch: '' }));
                    } else {
                      setForm((f) => ({ ...f, bank_branch: e.target.value }));
                    }
                    setShowErrors(false);
                  }}
                  className={selectCls}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                  <option value={OTHER_OPTION}>Other branch…</option>
                </select>
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
        </div>
      )}

      <div className="flex justify-end gap-2">
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
