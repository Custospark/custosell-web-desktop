import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Minus, Plus, Trash2 } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useLogin } from '../../../shared/api/account/AccountQueries';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import {
  isNetworkFailure,
  sanitizeErrorMessage,
} from '../../../app/store/offline/core/offlineQueryUtils';
import { bagTotal, type StorefrontCartBag } from '../cart/storefrontCartTypes';

export interface StorefrontBagCheckoutProps {
  bag: StorefrontCartBag;
  busy: boolean;
  signedIn: boolean;
  onUpdateQty: (slug: string, productId: number, quantity: number) => void;
  onRemoveLine: (slug: string, productId: number) => void;
  onContactChange: (
    slug: string,
    patch: Partial<Pick<StorefrontCartBag, 'customer_name' | 'customer_phone' | 'notes'>>,
  ) => void;
  onSubmit: () => void;
  onSignedIn: () => void;
  onClose: () => void;
}

/** One shop bag: line items + required contact fields + place order. */
export function StorefrontBagCheckout({
  bag,
  busy,
  signedIn,
  onUpdateQty,
  onRemoveLine,
  onContactChange,
  onSubmit,
  onSignedIn,
  onClose,
}: StorefrontBagCheckoutProps) {
  const currency = bag.shop.currency || 'UGX';
  const total = bagTotal(bag);
  const login = useLogin({ redirect: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inputCls =
    'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25';

  const signInThenPlace = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          setPassword('');
          queueMicrotask(() => onSignedIn());
        },
      },
    );
  };

  const canPlace = bag.items.length > 0 && Boolean(bag.customer_name.trim()) && Boolean(bag.customer_phone.trim());

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{bag.shop.name}</p>
          <Link
            to={ROUTES.SHOP(bag.shop.slug)}
            className="text-xs font-semibold text-teal-800 hover:underline"
            onClick={onClose}
          >
            @{bag.shop.slug} · View shop
          </Link>
        </div>
        <ul className="space-y-3">
          {bag.items.map((line) => (
            <li key={line.product.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="line-clamp-2 font-medium text-slate-900">{line.product.name}</p>
                <p className="tabular-nums text-slate-500">
                  {formatCurrency(Number(line.product.unit_price) * line.quantity, currency)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 active:scale-95"
                  onClick={() => onUpdateQty(bag.shop.slug, line.product.id, line.quantity - 1)}
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center tabular-nums font-medium">{line.quantity}</span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 active:scale-95"
                  onClick={() => onUpdateQty(bag.shop.slug, line.product.id, line.quantity + 1)}
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:text-red-600"
                  onClick={() => onRemoveLine(bag.shop.slug, line.product.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Delivery contact
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">
              Full name <span className="text-red-600">*</span>
            </span>
            <input
              value={bag.customer_name}
              onChange={(e) => onContactChange(bag.shop.slug, { customer_name: e.target.value })}
              placeholder="Your full name"
              autoComplete="name"
              required
              className={inputCls}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">
              Phone / WhatsApp <span className="text-red-600">*</span>
            </span>
            <input
              value={bag.customer_phone}
              onChange={(e) => onContactChange(bag.shop.slug, { customer_phone: e.target.value })}
              placeholder="+256…"
              autoComplete="tel"
              inputMode="tel"
              required
              className={inputCls}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Notes for the shop</span>
            <textarea
              value={bag.notes}
              onChange={(e) => onContactChange(bag.shop.slug, { notes: e.target.value })}
              placeholder="Delivery notes, preferred time, extras (optional)"
              rows={2}
              className={inputCls}
            />
          </label>
          {signedIn ? (
            <p className="text-[11px] text-teal-800">
              Prefills from your account when available — edit anytime before placing the order.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Name and phone are required so the shop can confirm your order.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
          <span className="text-sm font-medium text-slate-200">Order total</span>
          <span className="text-base font-semibold tabular-nums text-white">
            {formatCurrency(total, currency)}
          </span>
        </div>

        {!signedIn ? (
          <form onSubmit={signInThenPlace} className="space-y-2.5 rounded-xl border-2 border-teal-200 bg-teal-50/60 p-3">
            <p className="text-xs font-semibold text-teal-950">Sign in to place this order</p>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={cn(inputCls, 'border-teal-200 bg-white pl-10')}
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={cn(inputCls, 'border-teal-200 bg-white pl-10 pr-10')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {login.isError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {isNetworkFailure(login.error)
                  ? 'Could not reach the server.'
                  : sanitizeErrorMessage(login.error, 'Invalid email or password')}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !canPlace}
              loading={login.isPending || busy}
            >
              Sign in & place order
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={busy || !canPlace}
            loading={busy}
            onClick={onSubmit}
          >
            Place order with {bag.shop.name}
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            className="text-sm font-semibold text-teal-800 hover:underline"
            onClick={onClose}
          >
            Keep shopping
          </button>
          <Link
            to={ROUTES.DISCOVER_MY_ORDERS}
            className="text-sm font-semibold text-blue-700 hover:underline"
            onClick={onClose}
          >
            View my orders
          </Link>
        </div>
      </div>
    </>
  );
}
