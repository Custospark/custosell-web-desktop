import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { SaleItemsStep } from './ui/SaleItemsStep';
import { BillingControls } from './ui/BillingControls';

type CheckoutStep = 'items' | 'payment';

function StepChip({ index, label, state }: { index: number; label: string; state: 'active' | 'done' | 'todo' }) {
  const palette = {
    active: 'bg-blue-600 text-white ring-2 ring-blue-200',
    done: 'bg-green-100 text-green-700',
    todo: 'bg-gray-100 text-gray-500',
  }[state];
  const circlePalette = {
    active: 'bg-white/20 text-white',
    done: 'bg-green-600 text-white',
    todo: 'bg-gray-200 text-gray-500',
  }[state];
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${palette}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none ${circlePalette}`}>
        {state === 'done' ? <Check className="w-2.5 h-2.5" /> : index}
      </span>
      {label}
    </div>
  );
}

export default function NewSale() {
  const [step, setStep] = useState<CheckoutStep>('items');

  const goBack = () => {
    setStep((s) => (s === 'payment' ? 'items' : s));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header + stepper */}
      <div className="mb-4 pb-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            {step === 'items' ? 'Search and add products to the sale' : 'Add customer details and complete payment'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === 'payment' && (
            <button
              type="button"
              title="Back to items"
              onClick={goBack}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Items
            </button>
          )}
          <StepChip index={1} label="Items" state={step === 'items' ? 'active' : 'done'} />
          <div className="w-6 h-px bg-gray-300" aria-hidden />
          <StepChip index={2} label="Customer & Payment" state={step === 'payment' ? 'active' : 'todo'} />
        </div>
      </div>

      {/* Active step */}
      <div className="flex-1 min-h-0 flex flex-col">
        {step === 'items' ? (
          <SaleItemsStep onNext={() => setStep('payment')} />
        ) : (
          <BillingControls
            onBack={goBack}
            onSaleCompleted={() => setStep('items')}
          />
        )}
      </div>
    </div>
  );
}
