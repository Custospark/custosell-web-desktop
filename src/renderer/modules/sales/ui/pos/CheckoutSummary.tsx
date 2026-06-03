import { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../app/store/hooks/useApp';
import { setPaymentMethod, setAmountTendered, setCustomer } from '../../api/salesSlice';
import { useCustomers } from '../../api/salesQueries';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { ArrowLeft, User, Banknote, Smartphone, CreditCard, Wallet } from 'lucide-react';

const PAY_ICONS = { cash: Banknote, mobile_money: Smartphone, card: CreditCard, other: Wallet };

interface Props {
  onBack: () => void;
  onComplete: () => void;
  isProcessing: boolean;
}

export default function CheckoutSummary({ onBack, onComplete, isProcessing }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const amountTendered = useAppSelector((s) => s.sales.amountTendered);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const { data: customers } = useCustomers();
  const [showDropdown, setShowDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const totalQty = cartItems.reduce((s, c) => s + c.quantity, 0);
  const changeDue = paymentMethod === 'cash' ? Math.max(0, amountTendered - subtotal) : 0;
  const selectedCustomer = customerId ? (customers || []).find((c: any) => c.id === customerId) : null;

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const PayIcon = PAY_ICONS[paymentMethod];

  return (
    <div className="flex gap-8 h-full">
      {/* Left: Receipt */}
      <div className="flex-1 flex items-start justify-center pt-4">
        <div className="bg-white p-6 border border-gray-200 rounded-xl w-full max-w-sm shadow-sm">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">Custosell</h2>
            <p className="text-xs text-gray-500">Point of Sale</p>
          </div>

          <div className="space-y-2.5 text-sm min-h-[120px]">
            {cartItems.map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-gray-800 font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-semibold text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span><span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>

      {/* Right: Payment Controls */}
      <div className="w-80 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
            <p className="text-sm text-gray-500">{totalQty} item{totalQty > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          {/* Customer */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Customer</label>
            <div className="relative">
              <button className="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
                onClick={() => setShowDropdown(!showDropdown)}>
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400'}>{selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}</span>
              </button>
              {showDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <input className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none" placeholder="Search customers..."
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => {
                const Icon = PAY_ICONS[m];
                const isActive = paymentMethod === m;
                return (
                  <button key={m}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => dispatch(setPaymentMethod(m))}>
                    <Icon className="w-4 h-4" />
                    {m === 'mobile_money' ? 'Mobile' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Tendered (cash only) */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Amount Tendered</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">UGX</span>
                <input type="number" min={0} step="100"
                  className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-lg text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  value={amountTendered || ''}
                  onChange={(e) => dispatch(setAmountTendered(parseFloat(e.target.value) || 0))}
                  onFocus={(e) => e.target.select()} />
              </div>
              {amountTendered > 0 && amountTendered < subtotal && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  Insufficient — short by {formatCurrency(subtotal - amountTendered)}
                </p>
              )}
            </div>
          )}

          {/* Totals + Change */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {paymentMethod === 'cash' && amountTendered > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tendered</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(amountTendered)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="font-medium text-green-600">Change</span>
                  <span className="font-bold text-green-600 tabular-nums">{formatCurrency(changeDue)}</span>
                </div>
              </>
            )}
          </div>

          <Button className="w-full h-11 text-base" onClick={onComplete} loading={isProcessing}
            disabled={cartItems.length === 0 || (paymentMethod === 'cash' && amountTendered < subtotal)}>
            <PayIcon className="w-4 h-4 mr-2" />
            Complete Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
