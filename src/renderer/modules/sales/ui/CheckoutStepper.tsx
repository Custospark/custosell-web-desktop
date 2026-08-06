import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface CheckoutStepperProps {
  step: 'items' | 'payment';
  onBack: () => void;
}

type StepState = 'active' | 'done' | 'todo';

const MARKER_CLASS: Record<StepState, string> = {
  active: 'bg-blue-600 text-white ring-4 ring-blue-100',
  done: 'bg-blue-600 text-white',
  todo: 'bg-white text-gray-400 border border-gray-300',
};

const LABEL_CLASS: Record<StepState, string> = {
  active: 'text-blue-700',
  done: 'text-gray-700',
  todo: 'text-gray-400',
};

function StepMarker({ index, label, state }: { index: number; label: string; state: StepState }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors', MARKER_CLASS[state])}>
        {state === 'done' ? <Check className="w-4 h-4" /> : index}
      </div>
      <span className={cn('mt-2 text-xs font-semibold', LABEL_CLASS[state])}>{label}</span>
    </div>
  );
}

export function CheckoutStepper({ step, onBack }: CheckoutStepperProps) {
  const isPayment = step === 'payment';
  return (
    <div className="mb-4 pb-3 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {isPayment ? 'Update customer details and take payment' : 'Search and add products to the sale'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Standard stepper */}
        <div className="flex items-start">
          <StepMarker index={1} label="Items" state={isPayment ? 'done' : 'active'} />
          <div className="flex items-center self-stretch w-8 sm:w-10">
            <div className={cn('h-0.5 w-full', isPayment ? 'bg-blue-600' : 'bg-gray-200')} />
          </div>
          <StepMarker index={2} label="Payment" state={isPayment ? 'active' : 'todo'} />
        </div>
      </div>
    </div>
  );
}

export default CheckoutStepper;