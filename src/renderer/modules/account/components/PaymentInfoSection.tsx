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

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className={`min-w-0 break-words text-right text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function PaymentInfoSection() {
  const { data: paymentInfo, isLoading } = usePaymentInfo();
  const [editing, setEditing] = useState(false);

  const hasSavedData = Boolean(paymentInfo?.payment_method);

  const initialForm = useMemo(() => paymentInfoToForm(paymentInfo), [paymentInfo]);
  const initialCountry = useMemo(() => {
    if (!paymentInfo?.mobile_money_number) return getDefaultCountryCode();
    return parseInternationalPhone(paymentInfo.mobile_money_number).countryCode;
  }, [paymentInfo]);

  const methodIcon = paymentInfo?.payment_method === 'bank' ? Landmark : Smartphone;
  const methodTitle =
    paymentInfo?.payment_method === 'bank' ? 'Bank Transfer' : paymentInfo?.payment_method === 'mobile_money' ? 'Mobile Money' : '';

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-400">Loading...</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Where your referral rewards are paid — mobile money or bank transfer to any bank worldwide.
          </p>
        </div>
        {hasSavedData && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        hasSavedData ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              {(() => {
                const Icon = methodIcon;
                return <Icon className="h-4 w-4 text-indigo-600" />;
              })()}
              <span className="text-sm font-semibold text-gray-900">{methodTitle}</span>
            </div>
            <div className="pt-2">
              {paymentInfo?.payment_method === 'mobile_money' && (
                <>
                  <DetailRow label="Number" value={formatPhoneDisplay(paymentInfo.mobile_money_number)} />
                  <DetailRow label="Provider" value={paymentInfo.mobile_money_provider} />
                </>
              )}
              {paymentInfo?.payment_method === 'bank' && (
                <>
                  <DetailRow label="Bank" value={paymentInfo.bank_name} />
                  <DetailRow label="Branch" value={paymentInfo.bank_branch} />
                  <DetailRow label="Account name" value={paymentInfo.bank_account_name} />
                  <DetailRow label="Account number" value={paymentInfo.bank_account_number} mono />
                </>
              )}
            </div>
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
