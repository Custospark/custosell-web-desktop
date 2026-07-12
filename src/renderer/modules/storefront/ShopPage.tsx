import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Phone, Package } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useToast } from '../../app/contexts/useToast';
import { avatarUrl } from '../../shared/utils/avatarUrl';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import {
  usePlaceStorefrontOrder,
  useStorefrontShop,
  useStorefrontShopProducts,
} from './api/storefrontQueries';
import type { StorefrontCartItem, StorefrontProduct } from './api/storefrontTypes';
import { storefrontShareUrl, whatsappShareUrl } from './storefrontShare';
import { useDiscoverShell } from './ui/discoverShellContext';

function slugFromShopHandle(shopHandle: string | undefined): string | null {
  if (!shopHandle || !shopHandle.startsWith('@')) return null;
  const slug = shopHandle.slice(1).trim().toLowerCase();
  return slug.length > 0 ? slug : null;
}

/** Shop content inside DiscoverLayout sticky chrome. */
export default function ShopPage() {
  const { shopHandle } = useParams<{ shopHandle: string }>();
  const slug = slugFromShopHandle(shopHandle);
  const { showToast } = useToast();
  const shell = useDiscoverShell();
  const shopQuery = useStorefrontShop(slug ?? '');
  const productsQuery = useStorefrontShopProducts(slug ?? '');
  const placeOrder = usePlaceStorefrontOrder(slug ?? '');

  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState<{ order_number: string } | null>(null);

  const shop = shopQuery.data ?? productsQuery.data?.shop;
  const products = productsQuery.data?.products ?? [];
  const currency = shop?.currency || 'UGX';

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.product.unit_price) * line.quantity, 0),
    [cart],
  );

  useEffect(() => {
    if (!shop) {
      shell.setHeader({ title: 'Shop', subtitle: 'Loading…' });
      return;
    }
    const shareUrl = storefrontShareUrl(shop.slug);
    shell.setHeader({
      title: shop.name,
      subtitle: `@${shop.slug}${shop.city ? ` · ${shop.city}` : ''}`,
      actions: (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-50 sm:text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              showToast('success', 'Shop link copied');
            }}
          >
            Copy link
          </button>
          <a
            href={whatsappShareUrl(`Order from ${shop.name}: ${shareUrl}`)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-50 sm:text-xs"
          >
            WhatsApp
          </a>
          {shop.business_phone ? (
            <a href={`tel:${shop.business_phone}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 sm:text-xs">
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          ) : null}
        </div>
      ),
    });
  }, [shop, shell, showToast]);

  useEffect(() => {
    shell.setCartCount(cart.length);
    return () => {
      shell.setCartCount(0);
      shell.setHeader(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  if (!slug) {
    return <Navigate to={ROUTES.DISCOVER} replace />;
  }

  const addToCart = (product: StorefrontProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev
      .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l))
      .filter((l) => l.quantity > 0));
  };

  const submit = () => {
    if (!name.trim() || !phone.trim()) {
      showToast('error', 'Enter your name and phone so the shop can reach you');
      return;
    }
    if (cart.length === 0) {
      showToast('error', 'Add at least one product');
      return;
    }
    placeOrder.mutate(
      {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        notes: notes.trim() || undefined,
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      },
      {
        onSuccess: (res) => {
          setSubmitted({ order_number: res.order_number });
          setCart([]);
          showToast('success', res.message || 'Order sent');
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
            ?.response?.data;
          const first = msg?.errors ? Object.values(msg.errors).flat()[0] : msg?.message;
          showToast('error', first || 'Could not place order');
        },
      },
    );
  };

  if (shopQuery.isLoading || productsQuery.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <LoadingSkeleton variant="minimal" message="Loading shop…" />
      </div>
    );
  }

  if (shopQuery.isError || !shop) {
    return (
      <div className="px-4 py-16 text-center sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">Shop not found</h2>
        <p className="mt-2 text-sm text-slate-600">This shop may be closed or the link is incorrect.</p>
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 p-3 sm:gap-6 sm:p-4 lg:grid-cols-[1fr_300px]">
      {submitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 lg:col-span-2">
          Order <span className="font-semibold">{submitted.order_number}</span> received. The shop will contact you shortly.
        </div>
      ) : null}

      <section>
        {products.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No products listed"
            description="This shop has not listed products yet."
          />
        ) : (
          <ul className="space-y-1.5">
            {products.map((p) => (
              <li
                key={p.id}
                className={cn('flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5')}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {p.image_path ? (
                    <img src={avatarUrl(p.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm font-semibold tabular-nums text-teal-900">
                    {formatCurrency(Number(p.unit_price), currency)}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => addToCart(p)}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside
        id="storefront-cart"
        className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 font-semibold text-slate-900">Your order</h2>
        {cart.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add products to send an order request. No online payment — the shop will contact you.
          </p>
        ) : (
          <ul className="mb-4 space-y-3">
            {cart.map((line) => (
              <li key={line.product.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium text-slate-900">{line.product.name}</p>
                  <p className="tabular-nums text-slate-500">
                    {formatCurrency(Number(line.product.unit_price) * line.quantity, currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className="rounded border p-1" onClick={() => updateQty(line.product.id, -1)} aria-label="Decrease">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                  <button type="button" className="rounded border p-1" onClick={() => updateQty(line.product.id, 1)} aria-label="Increase">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mb-3 text-sm font-semibold tabular-nums">Total {formatCurrency(cartTotal, currency)}</p>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone / WhatsApp"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <Button type="button" className="w-full" disabled={placeOrder.isPending || cart.length === 0} loading={placeOrder.isPending} onClick={submit}>
            Place order request
          </Button>
        </div>
      </aside>
    </div>
  );
}
