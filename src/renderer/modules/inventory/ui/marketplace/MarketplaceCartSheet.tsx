import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import {
  effectiveSupplyPrice,
  type MarketplaceCartLine,
} from '../../api/marketplace/marketplaceTypes';

interface MarketplaceCartSheetProps {
  open: boolean;
  onClose: () => void;
  cart: MarketplaceCartLine[];
  notes: string;
  onNotesChange: (value: string) => void;
  onUpdateQty: (productId: number, quantity: number) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  busy?: boolean;
  offline?: boolean;
  creatingDraft?: boolean;
}

export function MarketplaceCartSheet({
  open,
  onClose,
  cart,
  notes,
  onNotesChange,
  onUpdateQty,
  onSaveDraft,
  onSubmit,
  busy = false,
  offline = false,
  creatingDraft = false,
}: MarketplaceCartSheetProps) {
  const total = cart.reduce(
    (sum, line) => sum + effectiveSupplyPrice(line.product) * line.quantity,
    0,
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Purchase order cart"
      size="md"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4"
    >
      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Your cart is empty</p>
          <p className="max-w-xs text-sm text-slate-600">
            Open a supplier catalog and add listed products. One cart stays with one supplier at a time.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
            {cart.map((line) => (
              <li
                key={line.product.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <p className="truncate text-sm font-semibold text-slate-900">{line.product.name}</p>
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
                    {formatCurrency(effectiveSupplyPrice(line.product) * line.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="shrink-0 space-y-3 border-t border-slate-200 pt-3">
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

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={offline || busy}
                loading={creatingDraft}
                onClick={onSaveDraft}
              >
                Save as draft
              </Button>
              <Button type="button" disabled={offline || busy} loading={busy} onClick={onSubmit}>
                Submit purchase order
              </Button>
              <Link
                to={ROUTES.INVENTORY.PURCHASE_ORDERS}
                className="text-center text-sm font-semibold text-blue-700 hover:underline"
                onClick={onClose}
              >
                View my purchase orders
              </Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
