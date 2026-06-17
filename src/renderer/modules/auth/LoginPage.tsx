import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../shared/api/account/AccountQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import {
  isNetworkFailure,
  sanitizeErrorMessage,
} from '../../app/store/offline/core/offlineQueryUtils';

export default function LoginPage() {
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Welcome back to Custosell"
      heroImage={AUTH_HERO_IMAGES.login}
      heroDescription="The faster way to run your business — sales, inventory, customers, and expenses, all in one place."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" className={inputCls} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className={`${inputCls} pr-12`} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-right -mt-3">
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</Link>
        </div>
        {loginMutation.isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {isNetworkFailure(loginMutation.error)
              ? 'Could not reach the server. Check your internet connection and try again.'
              : sanitizeErrorMessage(loginMutation.error, 'Invalid credentials')}
          </p>
        )}
        <Button type="submit" className="w-full py-3.5" loading={loginMutation.isPending}>
          Sign In
        </Button>
        <p className="text-center text-sm text-gray-500 pt-2">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="text-blue-600 hover:underline font-medium">
            Start for free
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
