import { Check, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppContext } from '../../../app/contexts/AppContext';
import { CustosellBrandLockup } from '../../../shared/components/brand/CustosellBrandLockup';

interface CheckoutStepperProps {
  step: 'items' | 'payment';
  onBack?: () => void;
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

function StepMarker({ index, label, state, onClick }: { index: number; label: string; state: StepState; onClick?: () => void }) {
  const content = (
    <>
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors', MARKER_CLASS[state])}>
        {state === 'done' ? <Check className="w-4 h-4" /> : index}
      </div>
      <span className={cn('mt-2 text-xs font-semibold', LABEL_CLASS[state])}>{label}</span>
    </>
  );

  if (!onClick) {
    return <div className="flex flex-1 flex-col items-center">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Go back to ${label}`}
      className="group flex flex-1 flex-col items-center cursor-pointer hover:opacity-90 focus:outline-none focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-blue-100"
    >
      {content}
    </button>
  );
}

export function CheckoutStepper({ step, onBack }: CheckoutStepperProps) {
  const isPayment = step === 'payment';
  const { state, dispatch } = useAppContext();
  const isFullscreen = state.contentFullscreen;
  return (
    <div className="mb-4 pb-3 border-b border-gray-200 flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 min-w-0">
        {isFullscreen && (
          <CustosellBrandLockup
            stacked
            logoSize="sm"
            nameClassName="text-sm"
            className="shrink-0 -ml-1"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            {isPayment ? 'Update customer details and take payment' : 'Search and add products to the sale'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_CONTENT_FULLSCREEN', payload: !isFullscreen })}
        title={isFullscreen ? 'Exit full-screen cashier mode' : 'Full-screen cashier mode (hides navigation)'}
        className={
          isFullscreen
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border-2 border-amber-400 rounded-lg shadow-sm hover:bg-amber-100 hover:border-amber-500 transition-colors shrink-0'
            : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors shrink-0'
        }
      >
        {isFullscreen ? <RotateCcw className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        {isFullscreen ? 'Exit full screen' : 'Full screen'}
      </button>

      {/* Standard stepper */
  }
      <div className="flex items-start">
        <StepMarker index={1} label="Items" state={isPayment ? 'done' : 'active'} onClick={isPayment ? onBack : undefined} />
        <div className="flex items-center self-stretch w-8 sm:w-10">
          <div className={cn('h-0.5 w-full', isPayment ? 'bg-blue-600' : 'bg-gray-200')} />
        </div>
        <StepMarker index={2} label="Payment" state={isPayment ? 'active' : 'todo'} />
      </div>
    </div>
  );
}

export default CheckoutStepper;