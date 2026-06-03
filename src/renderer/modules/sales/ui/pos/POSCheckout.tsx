import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { clearCart } from '../../api/salesSlice';
import { useCreateSale } from '../../api/salesQueries';
import ChargeEntry from './ChargeEntry';
import CheckoutSummary from './CheckoutSummary';

export default function POSCheckout() {
  const [atCheckout, setAtCheckout] = useState(false);
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const dispatch = useAppDispatch();
  const createSale = useCreateSale();

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  if (atCheckout) {
    return (
      <CheckoutSummary
        onBack={() => setAtCheckout(false)}
        onComplete={() => {
          createSale.mutate(
            {
              items: cartItems.map((c) => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
              subtotal, total_amount: subtotal, payment_method: paymentMethod, customer_id: customerId,
            },
            { onSuccess: () => { dispatch(clearCart()); setAtCheckout(false); } },
          );
        }}
        isProcessing={createSale.isPending}
      />
    );
  }

  return <ChargeEntry onProceed={() => setAtCheckout(true)} cartCount={cartItems.length} subtotal={subtotal} />;
}
