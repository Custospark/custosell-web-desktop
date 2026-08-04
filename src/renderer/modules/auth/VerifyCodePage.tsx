import { useLocation, Link } from 'react-router-dom';
import VerifyCodeForm from './VerifyCodeForm';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { ArrowLeft } from 'lucide-react';
import type { VerificationPurpose } from '../../shared/api/account/AccountTypes';

interface VerifyCodeLocationState {
  email?: string;
  purpose?: VerificationPurpose;
}

export default function VerifyCodePage() {
  const location = useLocation();
  const state = (location.state ?? {}) as VerifyCodeLocationState;
  const email = state.email ?? '';
  const purpose: VerificationPurpose = state.purpose ?? 'email_verification';

  const isTwoFactor = purpose === 'two_factor';

  return (
    <AuthLayout
      title={isTwoFactor ? 'Two-Factor Authentication' : 'Verify Your Email'}
      subtitle={isTwoFactor
        ? 'Enter the security code sent to your email to finish signing in.'
        : 'We emailed you a security code to confirm your email address.'}
      heroImage={AUTH_HERO_IMAGES.forgotPassword}
      heroDescription="A security code has been sent to your email. Enter it below to continue securely."
    >
      <VerifyCodeForm
        email={email}
        purpose={purpose}
        title={isTwoFactor ? 'Enter your security code' : 'Enter your verification code'}
        description="A 6-digit code was sent to your inbox. It expires in 10 minutes."
      />
      <div className="mt-6 text-center">
        <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
