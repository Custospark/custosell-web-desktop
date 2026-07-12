import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Minus, Plus, ShoppingCart, Store, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useToast } from '../../../app/contexts/useToast';
import { store } from '../../../app/store/store';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useLogin } from '../../../shared/api/account/AccountQueries';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import {
  isNetworkFailure,
  sanitizeErrorMessage,
} from '../../../app/store/offline/core/offlineQueryUtils';
import { storefrontKeys, usePlaceStorefrontOrder } from '../api/storefrontQueries';
import { bagTotal, type StorefrontCartBag } from '../cart/storefrontCartTypes';
import { useStorefrontMultiCart } from '../cart/storefrontMultiCartContext';
import { StorefrontLoginDialog } from './StorefrontLoginDialog';

interface StorefrontCartHubProps {
  open: boolean;
  onClose: () => void;
  variant?: 'dock' | 'sheet';
  className?: string;
}

/**
 * Multi-business cart hub — Marketplace dock/sheet; inline email/password for guests.
 */
export function StorefrontCartHub({
  open,
  onClose,
  variant = 'sheet',
  className,
}: StorefrontCartHubProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const token = useAppSelector((s) => s.auth.token);
  const {
    bags,
    activeSlug,
    setActiveSlug,
    updateQty,
    removeLine,
    setBagContact,
    clearBag,
    getBag,
  } = useStorefrontMultiCart();

  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (bags.length === 0) return null;
    return bags.find((b) => b.shop.slug === activeSlug) ?? bags[0];
  }, [bags, activeSlug]);

  const placeOrder = usePlaceStorefrontOrder();

  const placeBag = (slug: string) => {
    const auth = store.getState().auth;
    let bag = getBag(slug);
    if (!bag || bag.items.length === 0) {
      showToast('error', 'Add at least one product');
      return;
    }

    if (auth.user) {
      const name = bag.customer_name.trim() || auth.user.name || '';
      const phone = bag.customer_phone.trim() || auth.user.phone || '';
      if (name !== bag.customer_name || phone !== bag.customer_phone) {
        setBagContact(slug, { customer_name: name, customer_phone: phone });
        bag = { ...bag, customer_name: name, customer_phone: phone };
      }
    }

    if (!bag.customer_name.trim() || !bag.customer_phone.trim()) {
      showToast('error', 'Enter your name and phone so the shop can reach you');
      return;
    }

    if (!auth.token) {
      setPendingSlug(slug);
      setLoginOpen(true);
      return;
    }

    placeOrder.mutate(
      {
        slug,
        customer_name: bag.customer_name.trim(),
        customer_phone: bag.customer_phone.trim(),
        notes: bag.notes.trim() || undefined,
        items: bag.items.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      },
      {
        onSuccess: (res) => {
          clearBag(slug);
          void queryClient.invalidateQueries({ queryKey: storefrontKeys.all });
          showToast('success', res.message || `Order ${res.order_number} sent`);
          setPendingSlug(null);
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 429) {
            showToast('error', 'Too many orders — try again in a minute');
            return;
          }
          if (status === 401) {
            setPendingSlug(slug);
            setLoginOpen(true);
            return;
          }
          const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
            ?.response?.data;
          const first = msg?.errors ? Object.values(msg.errors).flat()[0] : msg?.message;
          showToast('error', first || 'Could not place order');
        },
      },
    );
  };

  useEffect(() => {
    if (!selected || !open) return;
    const auth = store.getState().auth;
    if (!auth.token || !auth.user) return;
    if (!selected.customer_name.trim() && auth.user.name) {
      setBagContact(selected.shop.slug, {
        customer_name: auth.user.name,
        customer_phone: selected.customer_phone || auth.user.phone || '',
      });
    }
  }, [selected, open, setBagContact]);

  const loginDialog = (
    <StorefrontLoginDialog
      isOpen={loginOpen}
      onClose={() => {
        setLoginOpen(false);
        setPendingSlug(null);
      }}
      onSuccess={() => {
        setLoginOpen(false);
        const slug = pendingSlug ?? selected?.shop.slug;
        if (slug) queueMicrotask(() => placeBag(slug));
      }}
    />
  );

  if (!open) return loginDialog;

  const panel = (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col bg-white',
        variant === 'dock' && 'border-l border-slate-200 shadow-[-8px_0_24px_rgba(15,23,42,0.06)]',
        variant === 'sheet' && 'rounded-none shadow-2xl ring-1 ring-black/10 sm:rounded-l-2xl',
        className,
      )}
      role="dialog"
      aria-modal={variant === 'sheet'}
      aria-label="Your carts"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Your carts</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {bags.length === 0
              ? 'Add products from any shop — each business keeps its own bag.'
              : `${bags.length} shop${bags.length === 1 ? '' : 's'} · submit one bag at a time`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close cart"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {bags.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Your cart is empty</p>
          <p className="max-w-xs text-sm text-slate-600">
            Keep this panel open and tap Add on products. Each shop gets its own bag.
          </p>
          <Button type="button" variant="secondary" className="mt-3" onClick={onClose}>
            Keep browsing
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2 sm:px-4">
            {bags.map((bag) => {
              const active = bag.shop.slug === selected?.shop.slug;
              return (
                <button
                  key={bag.shop.slug}
                  type="button"
                  onClick={() => setActiveSlug(bag.shop.slug)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-2.5 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5',
                    active
                      ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-300/40 shadow-md'
                      : 'border-teal-300/90 bg-gradient-to-r from-teal-50 via-white to-cyan-50 text-teal-900 hover:border-teal-400 hover:shadow-md',
                  )}
                >
                  <Store className="h-3.5 w-3.5 text-teal-600" />
                  <span className="max-w-[8rem] truncate">{bag.shop.name}</span>
                  <span className="tabular-nums text-slate-500">({bag.items.length})</span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <BagCheckout
              bag={selected}
              busy={placeOrder.isPending}
              signedIn={Boolean(token)}
              onUpdateQty={updateQty}
              onRemoveLine={removeLine}
              onContactChange={setBagContact}
              onSubmit={() => placeBag(selected.shop.slug)}
              onSignedIn={() => placeBag(selected.shop.slug)}
              onClose={onClose}
            />
          ) : null}
        </div>
      )}
    </aside>
  );

  return (
    <>
      {variant === 'sheet' ? (
        <div className="pointer-events-none fixed inset-0 z-[10000] flex justify-end sm:p-3 sm:pl-0">
          <div className="pointer-events-auto h-full w-full max-w-lg sm:h-[min(100%,920px)] sm:self-stretch">
            {panel}
          </div>
        </div>
      ) : (
        panel
      )}
      {loginDialog}
    </>
  );
}

function BagCheckout({
  bag,
  busy,
  signedIn,
  onUpdateQty,
  onRemoveLine,
  onContactChange,
  onSubmit,
  onSignedIn,
  onClose,
}: {
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
}) {
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
        <input
          value={bag.customer_name}
          onChange={(e) => onContactChange(bag.shop.slug, { customer_name: e.target.value })}
          placeholder="Your name"
          className={inputCls}
        />
        <input
          value={bag.customer_phone}
          onChange={(e) => onContactChange(bag.shop.slug, { customer_phone: e.target.value })}
          placeholder="Phone / WhatsApp"
          className={inputCls}
        />
        <textarea
          value={bag.notes}
          onChange={(e) => onContactChange(bag.shop.slug, { notes: e.target.value })}
          placeholder="Notes for the shop (optional)"
          rows={2}
          className={inputCls}
        />

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
              disabled={busy || bag.items.length === 0}
              loading={login.isPending || busy}
            >
              Sign in & place order
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={busy || bag.items.length === 0}
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
