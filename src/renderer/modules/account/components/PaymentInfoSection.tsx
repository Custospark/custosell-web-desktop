import { useMemo, useState } from 'react';
import { Landmark, Pencil, Plus, Smartphone, Wallet } from 'lucide-react';
import {
  formatPhoneDisplay,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';
import { usePaymentInfo } from '../api/useAccountQueries';
import { paymentInfoToForm } from '../data/paymentInfoFormShared';
import { PaymentInfoForm } from './PaymentInfoForm';

export function PaymentInfoSection() {
  const { data: paymentInfo, isLoading } = usePaymentInfo();
  const [editing, setEditing] = useState(false);

  const hasSavedData = Boolean(paymentInfo?.payment_method);

  const initialForm = useMemo(() => paymentInfoToForm(paymentInfo), [paymentInfo]);
  const initialCountry = useMemo(() => {
    if (!paymentInfo?.mobile_money_number) return getDefaultCountryCode();
    return parseInternationalPhone(paymentInfo.mobile_money_number).countryCode;
  }, [paymentInfo]);

  const savedSummary = useMemo(() => {
    if (!paymentInfo?.payment_method) return null;
    if (paymentInfo.payment_method === 'mobile_money') {
      return (
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700">
            <strong className="text-gray-900">{paymentInfo.mobile_money_provider || 'Mobile Money'}</strong>
            <span className="text-gray-400"> · </span>
            {formatPhoneDisplay(paymentInfo.mobile_money_number)}
          </span>
        </div>
      );
    }
    if (paymentInfo.payment_method === 'bank') {
      return (
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700">
            <strong className="text-gray-900">{paymentInfo.bank_name || 'Bank transfer'}</strong>
            {paymentInfo.bank_branch && (
              <>
                <span className="text-gray-400"> · </span>
                <span>{paymentInfo.bank_branch}</span>
              </>
            )}
            {paymentInfo.bank_account_name && (
              <>
                <span className="text-gray-400"> · </span>
                <span>{paymentInfo.bank_account_name}</span>
              </>
            )}
            {paymentInfo.bank_account_number && (
              <>
                <span className="text-gray-400"> · </span>
                <span className="font-mono">{paymentInfo.bank_account_number}</span>
              </>
            )}
          </span>
        </div>
      );
    }
    return null;
  }, [paymentInfo]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-400">Loading...</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
          {hasSavedData && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Add where your referral rewards should be paid — mobile money or bank transfer to any bank worldwide.
        </p>
      </div>

      {!editing ? (
        hasSavedData ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
            {savedSummary}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Wallet className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              You haven't added payment details yet. Add them so your referral rewards can be paid to you.
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add payment info
            </button>
          </div>
        )
      ) : (
        <PaymentInfoForm
          key={paymentInfo ? `${paymentInfo.payment_method}-${paymentInfo.bank_name}-${paymentInfo.mobile_money_number}` : 'empty'}
          initialForm={initialForm}
          initialCountry={initialCountry}
          hasSavedData={hasSavedData}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </section>
  );
}
