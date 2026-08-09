import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

interface CartSummaryBarProps {
  count: number;
  subtotal: number;
  onNext: () => void;
  /** Secondary actions (invoice/orders/hold/take) — shown in place of the item-count line on large screens. */
  actions?: ReactNode;
}

/**
 * Sticky bottom bar for the cart (Items step). Shows the item count and the
 * running subtotal so the seller never has to scroll the cart table
 * horizontally to find the total, with the Continue action to the right.
 * On large screens the secondary toolbar renders here instead of the
 * item-count line to free vertical space for cart content.
 */
export function CartSummaryBar({ count, subtotal, onNext, actions }: CartSummaryBarProps) {
  return (
    <div className="sticky bottom-0 z-10 shrink-0 bg-white pt-3 pb-2 border-t border-gray-200 mt-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-between">
          {actions ? (
            <>
              <span className="text-sm font-medium text-gray-600 lg:hidden shrink-0">
                <span className="font-bold text-gray-900 tabular-nums">{count}</span> {count === 1 ? 'item' : 'items'} in cart
              </span>
              <div className="hidden lg:flex flex-wrap items-center gap-2 min-w-0">
                {actions}
              </div>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-600 shrink-0">
              <span className="font-bold text-gray-900 tabular-nums">{count}</span> {count === 1 ? 'item' : 'items'} in cart
            </span>
          )}
          {count > 0 && actions && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0 lg:hidden">
              <span>Total</span>
              <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
          {count > 0 && (
            <span className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500">
              <span>Total</span>
              <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
            </span>
          )}
          <Button
            title="Proceed to customer and payment"
            className="w-full sm:w-auto px-6 h-12 text-base font-semibold"
            disabled={count === 0}
            onClick={onNext}
          >
            Continue to Payment <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CartSummaryBar;