import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Phone } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useToast } from '../../app/contexts/useToast';
import { avatarUrl } from '../../shared/utils/avatarUrl';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import {
  usePlaceStorefrontOrder,
  useStorefrontShop,
  useStorefrontShopProducts,
} from './api/storefrontQueries';
import type { StorefrontCartItem, StorefrontProduct } from './api/storefrontTypes';
import { storefrontShareUrl, whatsappShareUrl } from './storefrontShare';

export default function ShopPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { showToast } = useToast();
  const shopQuery = useStorefrontShop(slug);
  const productsQuery = useStorefrontShopProducts(slug);
  const placeOrder = usePlaceStorefrontOrder(slug);

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
      <div className="max-w-5xl mx-auto px-4 py-10">
        <LoadingSkeleton variant="minimal" message="Loading shop…" />
      </div>
    );
  }

  if (shopQuery.isError || !shop) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Shop not found</h1>
        <p className="mt-2 text-sm text-slate-600">This shop may be closed or the link is incorrect.</p>
        <Link to={ROUTES.DISCOVER} className="mt-6 inline-flex text-sm font-semibold text-blue-600">
          Browse Discover
        </Link>
      </div>
    );
  }

  const shareUrl = storefrontShareUrl(shop.slug);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <Link to={ROUTES.DISCOVER} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Discover
      </Link>

      <header className="flex flex-col sm:flex-row gap-4 sm:items-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
          {shop.logo_path ? (
            <img src={avatarUrl(shop.logo_path) ?? undefined} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">Shop</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{shop.name}</h1>
          <p className="text-sm text-slate-500">@{shop.slug}{shop.city ? ` · ${shop.city}` : ''}</p>
          {shop.description ? <p className="mt-2 text-sm text-slate-600">{shop.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
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
              className="text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
            >
              Share on WhatsApp
            </a>
            {shop.business_phone ? (
              <a href={`tel:${shop.business_phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                <Phone className="h-3.5 w-3.5" /> {shop.business_phone}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {submitted ? (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          Order <span className="font-semibold">{submitted.order_number}</span> received. The shop will contact you shortly.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section>
          {products.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="w-12 h-12" />} title="No products listed" description="This shop has not listed products yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((p) => (
                <article key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="aspect-[4/3] bg-slate-100">
                    {p.image_path ? (
                      <img src={avatarUrl(p.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{p.name}</h2>
                    {p.category ? <p className="text-xs text-slate-500 mt-0.5">{p.category.name}</p> : null}
                    <p className="text-sm font-medium text-blue-700 mt-2 tabular-nums">
                      {formatCurrency(Number(p.unit_price), currency)}
                    </p>
                    <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => addToCart(p)}>
                      Add to order
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold text-slate-900 mb-3">Your order</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-500">Add products to send an order request. No online payment — the shop will contact you.</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {cart.map((line) => (
                <li key={line.product.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 line-clamp-1">{line.product.name}</p>
                    <p className="text-slate-500 tabular-nums">
                      {formatCurrency(Number(line.product.unit_price) * line.quantity, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" className="p-1 rounded border" onClick={() => updateQty(line.product.id, -1)} aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                    <button type="button" className="p-1 rounded border" onClick={() => updateQty(line.product.id, 1)} aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm font-semibold tabular-nums mb-3">Total {formatCurrency(cartTotal, currency)}</p>
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
    </div>
  );
}
