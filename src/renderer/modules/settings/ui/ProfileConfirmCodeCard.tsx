import { ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

interface ProfileConfirmCodeCardProps {
  code: string;
  onCodeChange: (value: string) => void;
  onResend: () => void;
  isResendPending: boolean;
  isResendDisabled: boolean;
  resendLabel: string;
  confirmError?: string | null;
}

export function ProfileConfirmCodeCard({
  code,
  onCodeChange,
  onResend,
  isResendPending,
  isResendDisabled,
  resendLabel,
  confirmError,
}: ProfileConfirmCodeCardProps) {
  return (
    <div className="rounded-xl border-2 border-green-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-green-100 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-green-50 p-2.5 text-green-600 shrink-0">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Confirm your profile changes</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            We sent a 6-digit security code to your email. Enter it to finish updating your profile.
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <label className={labelClass}>Security code</label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            className={`${inputClass} pr-10`}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          The code expires shortly. Your profile won't change until it's confirmed.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={onResend}
            disabled={isResendDisabled}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
          >
            {isResendPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            {resendLabel}
          </button>
        </div>
        {confirmError && (
          <p className="mt-2 text-xs font-medium text-red-600">{confirmError}</p>
        )}
      </div>
    </div>
  );
}
