import { useState } from 'react';
import { CheckoutStepper } from './ui/CheckoutStepper';
import { SaleItemsStep } from './ui/SaleItemsStep';
import { BillingControls } from './ui/BillingControls';

type CheckoutStep = 'items' | 'payment';

export default function NewSale() {
  const [step, setStep] = useState<CheckoutStep>('items');

  const goBack = () => {
    setStep((s) => (s === 'payment' ? 'items' : s));
  };

  return (
    <div className="h-full flex flex-col">
      <CheckoutStepper step={step} onBack={goBack} />

      <div className="flex-1 min-h-0 flex flex-col">
        {step === 'items' ? (
          <SaleItemsStep onNext={() => setStep('payment')} />
        ) : (
          <BillingControls onSaleCompleted={() => setStep('items')} />
        )}
      </div>
    </div>
  );
}