import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useResetPassword } from '../../shared/api/account/AccountQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout, AUTH_HERO_IMAGES } from './AuthLayout';
import { Mail, Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mutation = useResetPassword();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === passwordConfirmation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { email, token, password, password_confirmation: passwordConfirmation },
      { onSuccess: () => setSuccess(true) },
    );
  };

  if (success) {
    return (
      <AuthLayout
        title="Password Reset"
        subtitle="Your password has been reset successfully."
        heroImage={AUTH_HERO_IMAGES.resetPasswordSuccess}
        heroDescription="Your password has been updated. You can now sign in with your new password."
      >
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">Your password has been reset successfully.</p>
          <Button className="w-full py-3.5" onClick={() => navigate(ROUTES.LOGIN)}>Sign In</Button>
        </div>
      </AuthLayout>
    );
  }

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password."
      heroImage={AUTH_HERO_IMAGES.resetPassword}
      heroDescription="Choose a new password for your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" className={inputCls} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="New password (min 6 chars)" className={inputCls} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required placeholder="Confirm new password" className={inputCls} />
        </div>
        {passwordConfirmation && !passwordsMatch && (
          <p className="text-xs text-red-500 -mt-1">Passwords do not match</p>
        )}
        <Button type="submit" className="w-full py-3.5" loading={mutation.isPending} disabled={!passwordsMatch || !password || !email}>
          Reset Password
        </Button>
        <div className="text-center">
          <Link to={ROUTES.LOGIN} className="text-sm text-blue-600 hover:underline font-medium">Back to Sign In</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
