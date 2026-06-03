import { useAppSelector, useAppDispatch } from '../../../../app/store/hooks/useApp';
import { setPaymentMethod, setCustomer } from '../../api/salesSlice';
import { useCustomers } from '../../api/salesQueries';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { ArrowLeft, User } from 'lucide-react';
import { useRef, useState, useMemo } from 'react';

interface Props {
  onBack: () => void;
  onComplete: () => void;
  isProcessing: boolean;
}

export default function CheckoutSummary({ onBack, onComplete, isProcessing }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const { data: customers } = useCustomers();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const selectedCustomer = customerId ? (customers || []).find((c: any) => c.id === customerId) : null;

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const btnCls = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeBtn = "bg-blue-600 text-white shadow-sm";
  const inactiveBtn = "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Receipt preview */}
      <div className="flex-1 flex items-start justify-center pt-8">
        <div ref={receiptRef} className="bg-white p-6 border border-gray-200 rounded-xl w-full max-w-sm">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Custosell</h2>
            <p className="text-xs text-gray-500">Point of Sale</p>
          </div>

          <div className="space-y-2 text-sm">
            {cartItems.map((item, i) => (
              <div key={i} className="flex justify-between">
                <div className="flex-1">
                  <p className="text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
              <span>Total</span><span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>

      {/* Right: Payment + Actions */}
      <div className="w-80 flex flex-col bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to items
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
            <div className="relative">
              <button className="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                onClick={() => setShowDropdown(!showDropdown)}>
                <User className="w-4 h-4 text-gray-400" />
                <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                </span>
              </button>
              {showDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <input className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none" placeholder="Search..."
                    value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                  <button className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                    onClick={() => { dispatch(setCustomer(null)); setShowDropdown(false); }}>Walk-in customer</button>
                  {filteredCustomers.map((c: any) => (
                    <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      onClick={() => { dispatch(setCustomer(c.id)); setCustomerSearch(c.name); setShowDropdown(false); }}>
                      <span className="font-medium text-gray-800">{c.name}</span>
                      <span className="text-gray-400 ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => (
                <button key={m} className={`${btnCls} ${paymentMethod === m ? activeBtn : inactiveBtn}`}
                  onClick={() => dispatch(setPaymentMethod(m))}>
                  {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'Mobile Money' : m === 'card' ? 'Card' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Items</span><span>{cartItems.reduce((s, c) => s + c.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
              <span>Total Due</span><span>{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <Button className="w-full h-11 text-base" onClick={onComplete} loading={isProcessing}>
            Complete Sale
          </Button>
          <button onClick={onBack} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
