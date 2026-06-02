import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../shared/api/account/AccountQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { useToast } from '../../app/contexts/ToastContext';
import { Store, Mail, Lock, Phone } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loginMutation = useLogin();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axiosInstance.post('/businesses/register', {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      loginMutation.mutate(
        { email: form.email, password: form.password },
        {
          onSuccess: () => {
            showToast('success', 'Business registered successfully');
            navigate(ROUTES.DASHBOARD);
          },
          onError: () => {
            showToast('success', 'Account created. Please sign in.');
            navigate(ROUTES.LOGIN);
          },
        },
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.name?.[0] || 'Registration failed';
      showToast('error', msg);
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const isSubmitting = loading || loginMutation.isPending;

  return (
    <AuthLayout title="Create Account" subtitle="Register your business to get started">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input placeholder="Business / Shop name" value={form.name} onChange={handleChange('name')} required className={inputClass} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="email" placeholder="Email address" value={form.email} onChange={handleChange('email')} required className={inputClass} />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={handleChange('phone')} className={inputClass} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange('password')} required className={inputClass} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="password" placeholder="Confirm password" value={form.password_confirmation} onChange={handleChange('password_confirmation')} required className={inputClass} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Register Business
        </Button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
