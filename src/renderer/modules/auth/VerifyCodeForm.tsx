import { useState } from 'react';
import { useSendVerificationCode, useVerifyCode } from '../../shared/api/account/SecurityQueries';
import { Button } from '../../shared/components/buttons/Button';
import { useResendCooldown } from '../../shared/hooks/useResendCooldown';
import { ShieldCheck, Mail, RefreshCw, Loader2 } from 'lucide-react';
import type { VerificationPurpose } from '../../shared/api/account/AccountTypes';

interface VerifyCodeFormProps {
  email: string;
  purpose: VerificationPurpose;
  title: string;
  description: string;
}

export default function VerifyCodeForm({ email, purpose, title, description }: VerifyCodeFormProps) {
  const [code, setCode] = useState('');
  const verifyMutation = useVerifyCode();
  const sendMutation = useSendVerificationCode();
  const { isOnCooldown, startCooldown, cooldownLabel } = useResendCooldown(`${purpose}:${email}`, {
    storageKey: 'custosell:resend-verify-code',
  });

  const handleResend = () => {
    sendMutation.mutate(
      { email, purpose },
      {
        onSuccess: () => {
          startCooldown();
          setCode('');
        },
      },
    );
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm tracking-widest';

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().length === 6) {
            verifyMutation.mutate({ email, purpose, code: code.trim() });
          }
        }}
        className="space-y-5"
      >
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            placeholder="6-digit code"
            className={inputCls}
            aria-label="Security code"
          />
        </div>
        <p className="text-xs text-gray-500 -mt-3">
          Sent to <span className="font-medium text-gray-700">{email}</span>. The code expires in 10 minutes.
        </p>

        <Button type="submit" className="w-full gap-2 py-3.5" loading={verifyMutation.isPending}>
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Verify and continue
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={sendMutation.isPending || isOnCooldown}
          className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
        >
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {isOnCooldown ? `Resend available in ${cooldownLabel}` : 'Resend code'}
        </button>
      </form>
    </div>
  );
}