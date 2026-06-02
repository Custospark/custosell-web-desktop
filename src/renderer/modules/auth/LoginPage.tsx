import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../shared/api/account/AccountQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back to Custosell">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        {loginMutation.isError && (
          <p className="text-red-600 text-sm">
            {(loginMutation.error as any)?.response?.data?.message || (loginMutation.error as any)?.message || 'Invalid credentials'}
            {(loginMutation.error as any)?.response?.status && <span className="ml-1 opacity-60">({(loginMutation.error as any)?.response?.status})</span>}
          </p>
        )}
        <Button type="submit" className="w-full" loading={loginMutation.isPending}>
          Sign In
        </Button>
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="text-blue-600 hover:underline font-medium">
            Register your business
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
