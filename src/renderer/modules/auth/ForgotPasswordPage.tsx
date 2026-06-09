import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../shared/api/account/AccountQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout, AUTH_HERO_IMAGES } from './AuthLayout';
import { useForgotPasswordCooldown } from './useForgotPasswordCooldown';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const mutation = useForgotPassword();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { isOnCooldown, startCooldown, cooldownLabel } = useForgotPasswordCooldown(email);

  const requestResetLink = () => {
    if (!email.trim() || isOnCooldown || mutation.isPending) return;

    mutation.mutate(
      { email },
      {
        onSettled: () => {
          startCooldown();
          setSent(true);
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestResetLink();
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We've sent a password reset link if the account exists."
        heroImage={AUTH_HERO_IMAGES.forgotPasswordSent}
        heroDescription="Open your inbox and follow the reset link we sent. If you don't see it, check spam or request another link after the timer."
      >
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">
            Check your inbox and follow the link to reset your password. The link expires in 60 minutes.
          </p>
          {isOnCooldown ? (
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the email? You can request another link in{' '}
              <span className="font-medium tabular-nums text-gray-700">{cooldownLabel}</span>.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the email? You can request another link now.
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={requestResetLink}
            loading={mutation.isPending}
            disabled={isOnCooldown || mutation.isPending}
          >
            {isOnCooldown ? `Resend available in ${cooldownLabel}` : 'Resend Link'}
          </Button>
          <Link to={ROUTES.LOGIN} className="block text-sm text-blue-600 hover:underline font-medium">
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email and we'll send you a reset link."
      heroImage={AUTH_HERO_IMAGES.forgotPassword}
      heroDescription="Enter your email address and we'll send you a link to reset your password."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className={inputCls}
          />
        </div>
        {isOnCooldown && (
          <p className="text-sm text-gray-500 -mt-2">
            Please wait{' '}
            <span className="font-medium tabular-nums text-gray-700">{cooldownLabel}</span>{' '}
            before requesting another reset link.
          </p>
        )}
        <Button
          type="submit"
          className="w-full py-3.5"
          loading={mutation.isPending}
          disabled={!email.trim() || isOnCooldown || mutation.isPending}
        >
          {isOnCooldown ? `Send again in ${cooldownLabel}` : 'Send Reset Link'}
        </Button>
        <div className="text-center">
          <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
