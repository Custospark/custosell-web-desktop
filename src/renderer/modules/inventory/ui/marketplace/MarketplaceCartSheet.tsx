import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cn } from '../../../../shared/utils/cn';
import {
  effectiveSupplyPrice,
  type MarketplaceCartLine,
} from '../../api/marketplace/marketplaceTypes';

/** Soft cap for DOM rows — cart is not meant for millions of lines. */
const CART_RENDER_CHUNK = 80;

interface MarketplaceCartSheetProps {
  open: boolean;
  onClose: () => void;
  cart: MarketplaceCartLine[];
  notes: string;
  onNotesChange: (value: string) => void;
  onUpdateQty: (productId: number, quantity: number) => void;
  onRemoveLine?: (productId: number) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  busy?: boolean;
  offline?: boolean;
  creatingDraft?: boolean;
  /** Dock beside catalog (desktop). Overlay sheet on small screens. */
  variant?: 'dock' | 'sheet';
  className?: string;
}

export function MarketplaceCartSheet({
  open,
  onClose,
  cart,
  notes,
  onNotesChange,
  onUpdateQty,
  onRemoveLine,
  onSaveDraft,
  onSubmit,
  busy = false,
  offline = false,
  creatingDraft = false,
  variant = 'dock',
  className,
}: MarketplaceCartSheetProps) {
  const [lineQuery, setLineQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(CART_RENDER_CHUNK);

  const filtered = useMemo(() => {
    const q = lineQuery.trim().toLowerCase();
    if (!q) return cart;
    return cart.filter(
      (line) =>
        line.product.name.toLowerCase().includes(q)
        || (line.product.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [cart, lineQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const total = cart.reduce(
    (sum, line) => sum + effectiveSupplyPrice(line.product) * line.quantity,
    0,
  );
  const lineCount = cart.length;
  const unitCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  if (!open) return null;

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
      aria-label="Purchase order cart"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Purchase order cart</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {lineCount === 0
              ? 'Add products from the catalog — cart stays open while you shop.'
              : `${lineCount} line${lineCount === 1 ? '' : 's'} · ${unitCount} unit${unitCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close cart"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Your cart is empty</p>
          <p className="max-w-xs text-sm text-slate-600">
            Keep this panel open and tap Add to cart on products. One cart stays with one supplier.
          </p>
          <Button type="button" variant="secondary" className="mt-3" onClick={onClose}>
            Browse catalog
          </Button>
        </div>
      ) : (
        <>
          <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={lineQuery}
                onChange={(e) => {
                  setLineQuery(e.target.value);
                  setVisibleCount(CART_RENDER_CHUNK);
                }}
                placeholder="Find a line in this cart…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25"
              />
            </div>
            {filtered.length !== cart.length ? (
              <p className="text-[11px] font-medium text-slate-600">
                Showing {filtered.length} of {cart.length} lines
              </p>
            ) : null}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {visible.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-600">
                No lines match “{lineQuery.trim()}”.
              </li>
            ) : (
              visible.map((line) => {
                const unit = effectiveSupplyPrice(line.product);
                return (
                  <li
                    key={line.product.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{line.product.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {formatCurrency(unit)}
                          {line.product.sku ? ` · SKU ${line.product.sku}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        disabled={busy}
                        aria-label={`Remove ${line.product.name}`}
                        onClick={() =>
                          onRemoveLine
                            ? onRemoveLine(line.product.id)
                            : onUpdateQty(line.product.id, 0)
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-800 hover:bg-slate-100"
                          disabled={busy}
                          onClick={() => onUpdateQty(line.product.id, line.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-slate-900">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-800 hover:bg-slate-100"
                          disabled={busy}
                          onClick={() => onUpdateQty(line.product.id, line.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-800">
                        {formatCurrency(unit * line.quantity)}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
            {hasMore ? (
              <li className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setVisibleCount((n) => n + CART_RENDER_CHUNK)}
                >
                  Show more lines ({filtered.length - visibleCount} remaining)
                </Button>
              </li>
            ) : null}
          </ul>

          <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <textarea
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25"
              rows={2}
              placeholder="Notes for the seller (optional)"
              value={notes}
              disabled={offline || busy}
              onChange={(e) => onNotesChange(e.target.value)}
            />

            <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
              <span className="text-sm font-medium text-slate-200">Order total</span>
              <span className="text-base font-semibold tabular-nums text-white">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={offline || busy}
                loading={creatingDraft}
                onClick={onSaveDraft}
              >
                Save as draft
              </Button>
              <Button
                type="button"
                className="w-full"
                disabled={offline || busy}
                loading={busy && !creatingDraft}
                onClick={onSubmit}
              >
                Submit purchase order
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                className="text-sm font-semibold text-teal-800 hover:underline"
                onClick={onClose}
              >
                Keep shopping
              </button>
              <Link
                to={ROUTES.INVENTORY.PURCHASE_ORDERS}
                className="text-sm font-semibold text-blue-700 hover:underline"
                onClick={onClose}
              >
                View my orders
              </Link>
            </div>
          </div>
        </>
      )}
    </aside>
  );

  if (variant === 'sheet') {
    return (
      <div className="pointer-events-none fixed inset-0 z-[10000] flex justify-end sm:p-3 sm:pl-0">
        <div className="pointer-events-auto h-full w-full max-w-lg sm:h-[min(100%,920px)] sm:self-stretch">
          {panel}
        </div>
      </div>
    );
  }

  return panel;
}
