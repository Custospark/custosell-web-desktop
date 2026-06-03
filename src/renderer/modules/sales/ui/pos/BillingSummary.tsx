import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { updateQuantity, removeFromCart, clearCart, setPaymentMethod, setCustomer } from '../../api/salesSlice';
import { useCustomers, useCreateSale } from '../../api/salesQueries';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { ShoppingCart, Plus, Minus, Trash, User } from 'lucide-react';
import ReceiptPreview from '../receipt/ReceiptPreview';

export default function BillingSummary() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();

  const [showReceipt, setShowReceipt] = useState<{ receiptNumber: string; items: any[]; total: number; paymentMethod: string } | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const subtotal = useMemo(() => cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0), [cartItems]);
  const totalItems = useMemo(() => cartItems.reduce((s, c) => s + c.quantity, 0), [cartItems]);
  const selectedCustomer = customerId ? (customers || []).find((c: any) => c.id === customerId) : null;

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    const payload = {
      items: cartItems.map((c) => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
      subtotal,
      total_amount: subtotal,
      payment_method: paymentMethod,
      customer_id: customerId,
    };
    createSale.mutate(payload, {
      onSuccess: (sale) => {
        setShowReceipt({
          receiptNumber: sale.receipt_number,
          items: [...cartItems],
          total: subtotal,
          paymentMethod,
        });
        dispatch(clearCart());
      },
    });
  };

  if (showReceipt) {
    return (
      <ReceiptPreview
        receiptNumber={showReceipt.receiptNumber}
        items={showReceipt.items}
        total={showReceipt.total}
        paymentMethod={showReceipt.paymentMethod}
        onNewSale={() => { setShowReceipt(null); dispatch(clearCart()); }}
      />
    );
  }

  const btnCls = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeBtn = "bg-blue-600 text-white shadow-sm";
  const inactiveBtn = "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";

  return (
    <div className="w-96 flex flex-col bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Sale</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{totalItems}</span>
        </div>
        {cartItems.length > 0 && (
          <button onClick={() => dispatch(clearCart())} className="text-xs text-red-500 hover:text-red-700">Clear</button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {cartItems.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} ea</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"><Minus className="w-3.5 h-3.5" /></button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-sm font-semibold text-gray-900 w-20 text-right">{formatCurrency(item.unit_price * item.quantity)}</p>
            <button onClick={() => dispatch(removeFromCart(item.product_id))} className="p-1 text-gray-300 hover:text-red-500">
              <Trash className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {cartItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <ShoppingCart className="w-10 h-10 mb-2" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Search and select products</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-3">
        {/* Customer */}
        <div className="relative">
          <button className="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}>
            <User className="w-4 h-4 text-gray-400" />
            <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400'}>
              {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
            </span>
          </button>
          {showCustomerDropdown && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              <input className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none" placeholder="Search..."
                value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              <button className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                onClick={() => { dispatch(setCustomer(null)); setShowCustomerDropdown(false); }}>Walk-in customer</button>
              {filteredCustomers.map((c: any) => (
                <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                  onClick={() => { dispatch(setCustomer(c.id)); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}>
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="text-gray-400 ml-2">{c.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="flex gap-1.5">
          {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => (
            <button key={m} className={`${btnCls} flex-1 text-xs ${paymentMethod === m ? activeBtn : inactiveBtn}`}
              onClick={() => dispatch(setPaymentMethod(m))}>
              {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'Mobile' : m === 'card' ? 'Card' : 'Other'}
            </button>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2">
            <span>Total</span><span>{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <Button className="w-full h-11 text-base" onClick={handleCheckout} loading={createSale.isPending} disabled={cartItems.length === 0}>
          Complete Sale
        </Button>
      </div>
    </div>
  );
}
