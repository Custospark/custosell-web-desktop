import { ArrowLeft } from 'lucide-react';

interface CheckoutStepperProps {
  step: 'items' | 'payment';
  onBack: () => void;
}

export function CheckoutStepper({ step, onBack }: CheckoutStepperProps) {
  const isPayment = step === 'payment';
  return (
    <div className="relative overflow-hidden rounded-2xl mb-4 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-600" />
      <div className="relative px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Point of Sale · Step {isPayment ? 2 : 1} of 2
          </p>
          {isPayment && (
            <button
              type="button"
              title="Back to items"
              onClick={onBack}
              className="flex shrink-0 items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Items
            </button>
          )}
        </div>

        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white leading-tight">
          {isPayment ? 'Customer & Payment' : 'Add items'}
        </h1>
        <p className="mt-1 text-sm text-white/75">
          {isPayment
            ? 'Finalise customer details and take payment'
            : 'Search, scan, and build the sale'}
        </p>

        {/* Progress track */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-1.5 rounded-full bg-white" />
          <div className={`h-1.5 rounded-full transition-colors ${isPayment ? 'bg-white' : 'bg-white/30'}`} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <span className="text-[11px] font-medium text-white/80">1 · Items</span>
          <span className={`text-[11px] font-medium ${isPayment ? 'text-white' : 'text-white/50'}`}>2 · Customer &amp; Payment</span>
        </div>
      </div>
    </div>
  );
}

export default CheckoutStepper;