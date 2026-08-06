import { useState } from 'react';
import { CheckoutStepper } from './ui/CheckoutStepper';
import { SaleItemsStep } from './ui/SaleItemsStep';
import { BillingControls } from './ui/BillingControls';
import { useAppSelector } from '../../app/store/hooks/useApp';

type CheckoutStep = 'items' | 'payment';

export default function NewSale() {
  const [step, setStep] = useState<CheckoutStep>('items');
  const itemCount = useAppSelector((s) => s.sales.cartItems.length);

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
          <BillingControls
            onBack={goBack}
            itemCount={itemCount}
            onSaleCompleted={() => setStep('items')}
          />
        )}
      </div>
    </div>
  );
}