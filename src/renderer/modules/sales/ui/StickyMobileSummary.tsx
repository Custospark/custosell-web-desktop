import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';

interface StickyMobileSummaryProps {
  totalLabel?: string;
  itemCount?: number;
  canComplete: boolean;
  loading: boolean;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Mobile-only sticky bottom bar (hidden on lg+). The running total sits above
 * and the two end-of-flow actions - Back to Items (with the item count) and
 * Complete Sale - sit below in a full-width row, all within thumb reach while
 * the customer/payment form scrolls. It is the canonical summary/action control
 * on mobile; the in-layout Total card and Back/Complete row are desktop-only so
 * the amount is never shown twice on small screens.
 */
export function StickyMobileSummary({
  totalLabel,
  itemCount,
  canComplete,
  loading,
  onComplete,
  onBack,
}: StickyMobileSummaryProps) {
  return (
    <div className="lg:hidden sticky bottom-0 z-10 mt-3 w-full max-w-5xl bg-white/95 backdrop-blur border-t border-gray-200 pt-3 pb-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <span className="text-sm font-medium text-gray-500">Total</span>
        <span className="text-xl font-bold text-gray-900 tabular-nums">
          {totalLabel}
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        {onBack && (
          <button
            type="button"
            title="Back to Items"
            onClick={onBack}
            className="group flex flex-1 items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold text-blue-700 bg-white border-2 border-blue-300 shadow-sm hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Items
            {typeof itemCount === 'number' && itemCount > 0 && (
              <span className="text-xs font-bold text-blue-700 tabular-nums">({itemCount})</span>
            )}
          </button>
        )}
        <Button
          className="flex-1 h-12 text-base font-semibold"
          onClick={onComplete}
          loading={loading}
          disabled={!canComplete}
        >
          Complete Sale
        </Button>
      </div>
    </div>
  );
}

export default StickyMobileSummary;