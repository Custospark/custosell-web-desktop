import { useState } from 'react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useSendVerificationCode, useVerifyCode, useToggleTwoFactor } from '../../../shared/api/account/SecurityQueries';
import { Button } from '../../../shared/components/buttons/Button';
import { ProfileSectionCard } from '../ui/ProfileSectionCard';
import { BadgeCheck, ShieldCheck, Mail, Loader2 } from 'lucide-react';

export default function SecurityVerificationTab() {
  const user = useAppSelector((state) => state.auth.user);
  const isVerified = Boolean(user?.email_verified_at);
  const isTwoFactorOn = Boolean(user?.two_factor_enabled);

  const sendMutation = useSendVerificationCode();
  const verifyMutation = useVerifyCode();
  const toggleMutation = useToggleTwoFactor();

  const [code, setCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const email = user?.email ?? '';

  const handleSend = () => {
    if (!email) return;
    setVerifyingEmail(true);
    sendMutation.mutate({ email, purpose: 'email_verification' });
  };

  const handleVerify = () => {
    if (!email || code.trim().length !== 6) return;
    verifyMutation.mutate({ email, purpose: 'email_verification', code: code.trim() });
  };

  return (
    <div className="space-y-6">
      <ProfileSectionCard
        icon={BadgeCheck}
        title="Email verification"
        description={isVerified
          ? 'Your email address is verified.'
          : 'Verify your email address to secure your account.'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {isVerified ? 'Verified' : 'Not verified'}
            </span>
            <p className="text-sm text-gray-500">{email}</p>
          </div>

          {!isVerified && (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification code</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={handleVerify} loading={verifyMutation.isPending} disabled={code.trim().length !== 6}>
                  Verify
                </Button>
              </div>
              <Button type="button" variant="ghost" className="px-0" onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {verifyingEmail ? 'Send another code' : 'Send verification code'}
              </Button>
            </div>
          )}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        icon={ShieldCheck}
        title="Two-factor authentication"
        description="Require a security code sent to your email whenever you sign in."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isTwoFactorOn ? 'Enabled' : 'Disabled'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {isTwoFactorOn
                ? 'You\'ll enter a security code after your password at every sign-in.'
                : 'Add an extra layer of protection to your account.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isTwoFactorOn}
            onClick={() => toggleMutation.mutate({ enabled: !isTwoFactorOn })}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${isTwoFactorOn ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTwoFactorOn ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </ProfileSectionCard>
    </div>
  );
}