import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, X } from 'lucide-react';
import { useLogin } from '../../../shared/api/account/AccountQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { CONFIRM_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';
import {
  isNetworkFailure,
  sanitizeErrorMessage,
} from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';

interface StorefrontLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

/**
 * Discover sign-in — dimmed backdrop above cart sheet, stays in shell (no POS redirect).
 */
export function StorefrontLoginDialog({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign in to place your order',
  subtitle = 'Enter your email and password. Browse stays open.',
}: StorefrontLoginDialogProps) {
  const login = useLogin({ redirect: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined' || !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          setPassword('');
          onSuccess();
        },
      },
    );
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 py-3 pl-11 pr-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/25';

  return createPortal(
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', CONFIRM_Z_INDEX_CLASS)}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        aria-label="Close sign in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="storefront-login-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="storefront-login-title" className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputCls}
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={cn(inputCls, 'pr-11')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {login.isError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {isNetworkFailure(login.error)
                ? 'Could not reach the server. Check your connection and try again.'
                : sanitizeErrorMessage(login.error, 'Invalid email or password')}
            </p>
          ) : null}
          <Button type="submit" className="w-full py-3" loading={login.isPending}>
            Sign in
          </Button>
          <p className="text-center text-xs text-slate-500">
            No account?{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-teal-700 hover:underline">
              Start for free
            </Link>
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
