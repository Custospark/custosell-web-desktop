import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { bagTotal, type StorefrontCartBag } from '../cart/storefrontCartTypes';
import { StorefrontDeliveryContactField } from './StorefrontDeliveryContactField';

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
  /** Place order (opens account modal when guest). */
  onSubmit: () => void;
  onClose: () => void;
}

/** One shop bag: line items + compact delivery tap-row + place order. */
export function StorefrontBagCheckout({
  bag,
  busy,
  signedIn,
  onUpdateQty,
  onRemoveLine,
  onContactChange,
  onSubmit,
  onClose,
}: StorefrontBagCheckoutProps) {
  const currency = bag.shop.currency || 'UGX';
  const total = bagTotal(bag);
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
        <StorefrontDeliveryContactField
          value={{
            customer_name: bag.customer_name,
            customer_phone: bag.customer_phone,
            notes: bag.notes,
          }}
          disabled={busy}
          onChange={(next) => onContactChange(bag.shop.slug, next)}
        />

        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
          <span className="text-sm font-medium text-slate-200">Order total</span>
          <span className="text-base font-semibold tabular-nums text-white">
            {formatCurrency(total, currency)}
          </span>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={busy || !canPlace}
          loading={busy}
          onClick={onSubmit}
        >
          {signedIn ? `Place order with ${bag.shop.name}` : 'Place order'}
        </Button>
        {!canPlace && bag.items.length > 0 ? (
          <p className="text-center text-[11px] text-amber-800">
            Add delivery information above to place this order.
          </p>
        ) : null}

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
