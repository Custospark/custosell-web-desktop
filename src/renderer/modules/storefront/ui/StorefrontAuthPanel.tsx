import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useLogin, useRegister } from '../../../shared/api/account/AccountQueries';
import { Button } from '../../../shared/components/buttons/Button';
import {
  isNetworkFailure,
  sanitizeErrorMessage,
} from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';

export type StorefrontAuthMode = 'create' | 'signin';

interface StorefrontAuthPanelProps {
  onSuccess: () => void;
  /** Compact cart bag: primary CTA continues into place-order. */
  placeOrderMode?: boolean;
  defaultMode?: StorefrontAuthMode;
  className?: string;
  inputClassName?: string;
}

/**
 * Discover shopper auth — create account (default) or sign in.
 * No business registration; stays in-shell via redirect:false.
 */
export function StorefrontAuthPanel({
  onSuccess,
  placeOrderMode = false,
  defaultMode = 'create',
  className,
  inputClassName,
}: StorefrontAuthPanelProps) {
  const [mode, setMode] = useState<StorefrontAuthMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin({ redirect: false });
  const register = useRegister({ redirect: false });
  const pending = login.isPending || register.isPending;
  const error = mode === 'create' ? register.error : login.error;
  const isError = mode === 'create' ? register.isError : login.isError;

  const inputCls = cn(
    'w-full rounded-xl border border-slate-300 py-3 pl-11 pr-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/25',
    inputClassName,
  );

  const finish = () => {
    setPassword('');
    setPasswordConfirm('');
    onSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      register.mutate(
        {
          name: name.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirm,
          account_type: 'storefront_buyer',
        },
        { onSuccess: finish },
      );
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      { onSuccess: finish },
    );
  };

  const createLabel = placeOrderMode ? 'Create account & place order' : 'Create account';
  const signInLabel = placeOrderMode ? 'Sign in & place order' : 'Sign in';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex rounded-xl border border-teal-200 bg-teal-50/50 p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={cn(
            'flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
            mode === 'create'
              ? 'bg-white text-teal-950 shadow-sm'
              : 'text-teal-800/80 hover:text-teal-950',
          )}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={cn(
            'flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
            mode === 'signin'
              ? 'bg-white text-teal-950 shadow-sm'
              : 'text-teal-800/80 hover:text-teal-950',
          )}
        >
          Sign in
        </button>
      </div>

      {mode === 'create' ? (
        <p className="text-[11px] leading-snug text-slate-600">
          Shop as a customer — no business setup. You&apos;ll appear on each shop&apos;s customer list when you order.
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-slate-600">
          Already have an account? Sign in to continue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {mode === 'create' ? (
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
          </div>
        ) : null}
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            required
            autoComplete="email"
            autoFocus={mode === 'signin'}
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
            minLength={6}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
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
        {mode === 'create' ? (
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Confirm password"
              className={inputCls}
            />
          </div>
        ) : null}
        {isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {isNetworkFailure(error)
              ? 'Could not reach the server. Check your connection and try again.'
              : sanitizeErrorMessage(
                error,
                mode === 'create' ? 'Could not create account' : 'Invalid email or password',
              )}
          </p>
        ) : null}
        <Button type="submit" className="w-full py-3" loading={pending}>
          {mode === 'create' ? createLabel : signInLabel}
        </Button>
      </form>
    </div>
  );
}
