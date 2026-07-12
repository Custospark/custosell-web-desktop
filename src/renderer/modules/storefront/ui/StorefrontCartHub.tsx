import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Store, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/contexts/useToast';
import { store } from '../../../app/store/store';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { storefrontKeys, usePlaceStorefrontOrder } from '../api/storefrontQueries';
import { useStorefrontMultiCart } from '../cart/storefrontMultiCartContext';
import { StorefrontBagCheckout } from './StorefrontBagCheckout';
import { StorefrontLoginDialog } from './StorefrontLoginDialog';

interface StorefrontCartHubProps {
  open: boolean;
  onClose: () => void;
  variant?: 'dock' | 'sheet';
  className?: string;
}

/**
 * Multi-business cart hub — Marketplace dock/sheet; inline email/password for guests.
 * Sheet stops above the bottom strip so Shops / Products stay clickable.
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
  const user = useAppSelector((s) => s.auth.user);
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
    if (!open || !token || !user || bags.length === 0) return;
    for (const bag of bags) {
      const name = user.name?.trim() || bag.customer_name;
      const phone = (user.phone?.trim() || bag.customer_phone || '').trim();
      if (name !== bag.customer_name || phone !== bag.customer_phone) {
        setBagContact(bag.shop.slug, {
          customer_name: name,
          customer_phone: phone,
        });
      }
    }
  }, [open, token, user, bags, setBagContact]);

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
            <StorefrontBagCheckout
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
        <div className="pointer-events-none fixed inset-x-0 top-0 bottom-[4.75rem] z-[9000] flex justify-end sm:bottom-3 sm:p-3 sm:pl-0">
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            aria-label="Close cart"
            onClick={onClose}
          />
          <div className="pointer-events-auto relative z-10 h-full w-full max-w-lg sm:h-[min(100%,920px)] sm:self-stretch">
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
