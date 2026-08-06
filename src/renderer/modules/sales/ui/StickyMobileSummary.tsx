import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';

interface StickyMobileSummaryProps {
  totalLabel: string;
  itemCount?: number;
  canComplete: boolean;
  loading: boolean;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Mobile-only sticky bottom bar (hidden on lg+) that keeps "Back to Items", the
 * running total and Complete Sale within thumb reach while the customer/payment
 * form scrolls on small screens. It is the canonical end-of-flow control on
 * mobile — the in-layout Complete/Back row is desktop-only to avoid duplication.
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
    <div className="lg:hidden sticky bottom-0 z-10 mt-3 w-full max-w-5xl bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-[0_-4px_12px_rgba(0,0,0,0.06)] p-3 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          title="Go back to review and change the items in this sale"
          onClick={onBack}
          className="group flex shrink-0 items-center gap-1.5 pl-2.5 pr-3 h-12 rounded-lg text-sm font-semibold text-blue-700 bg-white border-2 border-blue-300 shadow-sm hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </span>
          <span className="whitespace-nowrap">Back to Items</span>
          {typeof itemCount === 'number' && itemCount > 0 && (
            <span className="text-xs font-bold text-blue-700 tabular-nums">({itemCount})</span>
          )}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-500 leading-tight">Total</p>
        <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight truncate">{totalLabel}</p>
      </div>
      <Button
        className="h-12 px-5 sm:px-6 text-base font-semibold shrink-0"
        onClick={onComplete}
        loading={loading}
        disabled={!canComplete}
      >
        Complete Sale
      </Button>
    </div>
  );
}

export default StickyMobileSummary;