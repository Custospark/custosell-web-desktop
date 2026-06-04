import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../shared/api/account/AccountQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { useToast } from '../../app/contexts/ToastContext';
import { AuthLayout } from './AuthLayout';
import { Store, Mail, Lock, Phone, User } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loginMutation = useLogin();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ owner_name: '', name: '', email: '', phone: '', password: '', password_confirmation: '' });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordsMatch = form.password === form.password_confirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axiosInstance.post('/businesses/register', {
        owner_name: form.owner_name,
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
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.owner_name?.[0] || 'Registration failed';
      showToast('error', msg);
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";
  const isSubmitting = loading || loginMutation.isPending;

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register your business to get started"
      heroImage="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
      heroDescription="Monitor performance with dashboards, control stock with inventory, process sales seamlessly, understand your customers, manage expenses, and track shifts — all in one platform."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input placeholder="Your name" value={form.owner_name} onChange={handleChange('owner_name')} required className={inputCls} />
        </div>
        <div className="relative">
          <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input placeholder="Business name" value={form.name} onChange={handleChange('name')} required className={inputCls} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="email" placeholder="Email address" value={form.email} onChange={handleChange('email')} required className={inputCls} />
        </div>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={handleChange('phone')} className={inputCls} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange('password')} required className={inputCls} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="password" placeholder="Confirm password" value={form.password_confirmation} onChange={handleChange('password_confirmation')} required className={inputCls} />
        </div>
        {form.password_confirmation && !passwordsMatch && (
          <p className="text-xs text-red-500 -mt-1">Passwords do not match</p>
        )}
        <Button type="submit" className="w-full py-3.5" loading={isSubmitting} disabled={form.password_confirmation.length > 0 && !passwordsMatch}>
          Register Business
        </Button>
        <p className="text-center text-sm text-gray-500 pt-1">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
