import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';

interface StickyMobileSummaryProps {
  totalLabel: string;
  canComplete: boolean;
  loading: boolean;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Mobile-only sticky bottom bar (hidden on lg+) that keeps the running total
 * and the Complete action within thumb reach while the customer/payment form
 * scrolls on small screens.
 */
export function StickyMobileSummary({
  totalLabel,
  canComplete,
  loading,
  onComplete,
  onBack,
}: StickyMobileSummaryProps) {
  return (
    <div className="lg:hidden sticky bottom-0 z-10 mt-3 w-full max-w-5xl bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pt-3 pb-2 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          title="Back to items"
          aria-label="Back to items"
          onClick={onBack}
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-blue-300 text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-500 leading-tight">Total</p>
        <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{totalLabel}</p>
      </div>
      <Button
        className="h-12 px-6 text-base font-semibold shrink-0"
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
