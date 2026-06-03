import { useState, useMemo, useRef, useEffect } from 'react';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart, clearCart, setPaymentMethod, setCustomer, setAmountTendered } from './api/salesSlice';
import { useCustomers, useCreateSale } from './api/salesQueries';
import { Search, Plus, Minus, Trash, ShoppingCart, X, Package, User, Banknote, Smartphone, CreditCard, Wallet, RotateCcw, PauseCircle } from 'lucide-react';
import HeldOrdersModal from './ui/HeldOrdersModal';
import HoldOrderModal from './ui/HoldOrderModal';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { Button } from '../../shared/components/buttons/Button';

const PAY_ICONS = { cash: Banknote, mobile_money: Smartphone, card: CreditCard, other: Wallet };

export default function NewSale() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const amountTendered = useAppSelector((s) => s.sales.amountTendered);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const heldOrders = useAppSelector((s) => s.sales.heldOrders);
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { confirm } = useConfirm();
  const createSale = useCreateSale();

  // Search State
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Customer Dropdown State
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Refs
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const cartCount = cartItems.length;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, amountTendered - subtotal) : 0;
  const selectedCustomer = customerId ? (customers || []).find((c: any) => c.id === customerId) : null;

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  // Filter products
  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) && p.is_active)
      .slice(0, 8);
  }, [products, search]);

  // Handlers
  const handleClearAll = async () => {
    if (cartItems.length === 0) return;
    const ok = await confirm({
      title: 'Clear all items?',
      message: `This will remove all ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} from the cart.`,
      confirmText: 'Clear all',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (ok) {
      cartItems.forEach((item) => dispatch(removeFromCart(item.product_id)));
    }
  };

  const addItem = (id: number, name: string, price: number) => {
    dispatch(addToCart({ product_id: id, name, unit_price: price }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  };

  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    createSale.mutate(
      {
        items: cartItems.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          unit_price: c.unit_price
        })),
        subtotal,
        total_amount: subtotal,
        payment_method: paymentMethod,
        customer_id: customerId,
      },
      {
        onSuccess: () => {
          dispatch(clearCart());
          dispatch(setAmountTendered(0));
          dispatch(setCustomer(null));
          // Optional: Show success notification
        },
      }
    );
  };

  // Click outside handlers
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PayIcon = PAY_ICONS[paymentMethod];

  return (
    <>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200 px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-xs sm:text-sm text-gray-500">Search products and complete sale</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 overflow-hidden px-1">
        {/* LEFT COLUMN: Search + Cart Table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Animated Search Bar */}
          <div ref={wrapRef} className="relative mb-3 sm:mb-4">
            <div className="relative rounded-lg p-[2px]">
              <motion.div
                className="absolute inset-0 rounded-lg z-0"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1, #3b82f6)',
                  backgroundSize: '300% 100%',
                }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: isFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10 rounded-[6px] overflow-hidden bg-white">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
                <input ref={searchRef} type="text" placeholder="Search products..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                  onFocus={() => { setIsFocused(true); if (search.trim()) setShowResults(true); }}
                  onBlur={() => setIsFocused(false)}
                  className="w-full pl-9 pr-10 py-2 sm:py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]" />
                {search && (
                  <button onClick={() => { setSearch(''); setShowResults(false); searchRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && search && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute z-30 w-full mt-1.5">
                  <div className="relative rounded-xl p-[2px]">
                    <motion.div className="absolute inset-0 rounded-xl z-0"
                      style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1, #3b82f6)', backgroundSize: '300% 100%' }}
                      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                    <div className="relative z-10 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-72 overflow-y-auto">
                      {results.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                              <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Stock</th>
                              <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                              <th className="px-3 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">+</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {results.map((p) => (
                              <tr key={p.id} className="hover:bg-blue-50 cursor-pointer transition-colors" onMouseDown={() => addItem(p.id, p.name, parseFloat(p.unit_price))}>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1 sm:p-1.5 rounded-lg bg-gray-100 text-gray-500 shrink-0"><Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
                                    <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 hidden sm:table-cell">
                                  <span className={`text-xs ${p.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                                  <span className="text-sm font-semibold text-blue-600">{formatCurrency(p.unit_price)}</span>
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                                  <div className="p-1 sm:p-1.5 rounded-full bg-green-50 text-green-600 inline-flex hover:bg-green-100 transition-colors">
                                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center text-sm text-gray-400">No products found</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart Items Header */}
          {cartItems.length > 0 && (
            <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cart ({cartItems.length} {cartItems.length > 1 ? 'items' : 'item'})
              </span>
              <button onClick={handleClearAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
          )}

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto -mx-1 sm:mx-0">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 sm:py-16">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mb-3" />
                <p className="text-sm font-medium">No items added</p>
                <p className="text-xs mt-1">Search and select products above</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cartItems.map((item, idx) => (
                      <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-400">{idx + 1}</td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <span className="text-sm font-medium text-gray-800 truncate block max-w-[120px] sm:max-w-none">{item.name}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right hidden sm:table-cell">
                          <span className="text-sm text-gray-600">{formatCurrency(item.unit_price)}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))}
                              className="p-0.5 sm:p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <span className="w-7 sm:w-10 text-center text-sm font-semibold text-gray-900 tabular-nums">{item.quantity}</span>
                            <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))}
                              className="p-0.5 sm:p-1 rounded hover:bg-green-50 text-green-600 transition-colors">
                              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                          <button onClick={() => dispatch(removeFromCart(item.product_id))}
                            className="p-0.5 sm:p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                            <Trash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">Total:</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                        <span className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Sticky Hold / Take Buttons */}
          <div className="sticky bottom-0 bg-white pt-3 pb-2 border-t border-gray-200 mt-3 flex items-center justify-end gap-3">
            {cartItems.length > 0 && (
              <button onClick={() => setHoldModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm">
                <PauseCircle className="w-4 h-4" /> Hold Order
              </button>
            )}
            <button onClick={() => setHeldModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm relative overflow-visible">
              <RotateCcw className="w-4 h-4" /> Take Order
              {heldOrders.length > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-amber-500 text-white text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1 shadow-md ring-2 ring-white">
                  {heldOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Billing Controls */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-600 shrink-0" />
              <span className="font-semibold text-gray-900">Complete Sale</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cartCount}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto">
            {/* Customer */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2 block">Customer</label>
              <div className="relative">
                <button className="flex items-center gap-2 w-full px-3 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors bg-white"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}>
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400 truncate'}>
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                  </span>
                </button>
                {showCustomerDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <input className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none focus:bg-blue-50"
                      placeholder="Search..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} autoFocus />
                    <button className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                      onClick={() => { dispatch(setCustomer(null)); setShowCustomerDropdown(false); setCustomerSearch(''); }}>
                      Walk-in customer
                    </button>
                    {filteredCustomers.map((c: any) => (
                      <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                        onClick={() => { dispatch(setCustomer(c.id)); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}>
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => {
                  const Icon = PAY_ICONS[m];
                  const isActive = paymentMethod === m;
                  return (
                    <button key={m}
                      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        isActive ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => dispatch(setPaymentMethod(m))}>
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{m === 'mobile_money' ? 'Mobile' : m.charAt(0).toUpperCase() + m.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Tendered (Cash) */}
            {paymentMethod === 'cash' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2 block">Amount Tendered</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-medium text-gray-500">UGX</span>
                  <input type="number" min={0} step="100"
                    className="w-full pl-11 sm:pl-12 pr-3 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-base sm:text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0" value={amountTendered || ''}
                    onChange={(e) => dispatch(setAmountTendered(parseFloat(e.target.value) || 0))}
                    onFocus={(e) => e.target.select()} />
                </div>
                {amountTendered > 0 && amountTendered < subtotal && (
                  <p className="text-xs text-amber-600 mt-1.5 sm:mt-2">Short by {formatCurrency(subtotal - amountTendered)}</p>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-xl space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Total</span>
                <span className="font-bold text-gray-900 text-base sm:text-lg tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {paymentMethod === 'cash' && amountTendered > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Tendered</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base tabular-nums">{formatCurrency(amountTendered)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 sm:pt-2">
                    <span className="font-medium text-green-600 text-xs sm:text-sm">Change</span>
                    <span className="font-bold text-green-600 text-base sm:text-lg tabular-nums">{formatCurrency(changeDue)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Complete Sale Button */}
            <Button className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold" onClick={handleCompleteSale} loading={createSale.isPending}
              disabled={cartItems.length === 0 || (paymentMethod === 'cash' && amountTendered < subtotal)}>
              <PayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </div>

      <HeldOrdersModal open={heldModalOpen} onClose={() => setHeldModalOpen(false)} />
      <HoldOrderModal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} />
    </>
  );
}