import { ArrowLeft, Check } from 'lucide-react';

interface CheckoutStepperProps {
  step: 'items' | 'payment';
  onBack: () => void;
}

function StepChip({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
      active ? 'bg-blue-600 text-white shadow-sm' : done ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
    }`}>
      <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] leading-none ${
        active ? 'bg-white/25 text-white' : done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {done ? <Check className="w-2.5 h-2.5" /> : n}
      </span>
      {label}
    </div>
  );
}

export function CheckoutStepper({ step, onBack }: CheckoutStepperProps) {
  const isPayment = step === 'payment';
  return (
    <div className="mb-4 pb-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {isPayment ? 'Update customer details and take payment' : 'Search and add products to the sale'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isPayment && (
          <button
            type="button"
            title="Back to items"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Items
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <StepChip n={1} label="Items" done={isPayment} active={!isPayment} />
          <span className="w-5 h-px bg-gray-300" aria-hidden />
          <StepChip n={2} label="Payment" done={false} active={isPayment} />
        </div>
      </div>
    </div>
  );
}

export default CheckoutStepper;