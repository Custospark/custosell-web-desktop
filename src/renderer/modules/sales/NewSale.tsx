import { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart, clearCart, setPaymentMethod, setCustomer, setAmountTendered, setDiscount, setDiscountType } from './api/salesSlice';
import { useCustomers, useCreateSale } from './api/salesQueries';
import type { Sale } from './api/salesTypes';
import { Search, Plus, Minus, Trash, ShoppingCart, X, Package, User, Banknote, Smartphone, CreditCard, Wallet, RotateCcw, PauseCircle, Pencil, ArrowDownToLine } from 'lucide-react';
import HeldOrdersModal from './ui/HeldOrdersModal';
import HoldOrderModal from './ui/HoldOrderModal';
import QuantityEditModal from './ui/QuantityEditModal';
import SaleCompletedModal from './ui/SaleCompletedModal';
import PrintableReceipt from './ui/PrintableReceipt';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { Button } from '../../shared/components/buttons/Button';

const PAY_ICONS = { cash: Banknote, mobile_money: Smartphone, card: CreditCard, other: Wallet };
// ============================================================
// BILLING CONTROLS COMPONENT (Right Column)
// ============================================================
function BillingControls() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const amountTendered = useAppSelector((s) => s.sales.amountTendered);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();
  const currentShiftId = useAppSelector((s) => s.auth.user?.shift_id);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: completedSale?.receipt_number ?? 'receipt',
    pageStyle: `
      @page { margin: 8mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        .no-print { display: none !important; }
      }
    `,
    onBeforePrint: async () => setIsPrinting(true),
    onAfterPrint: async () => setIsPrinting(false),
  });

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const discountValue = discountType === 'percentage'
    ? Math.min(subtotal * (discountAmount / 100), subtotal)
    : Math.min(discountAmount, subtotal);
  const total = Math.max(0, subtotal - discountValue);
  const changeDue = paymentMethod === 'cash' ? Math.max(0, amountTendered - total) : 0;
  const selectedCustomer = customerId ? (customers || []).find((c: any) => c.id === customerId) : null;

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

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
        discount_amount: discountValue,
        total_amount: total,
        payment_method: paymentMethod,
        customer_id: customerId,
        amount_tendered: amountTendered > 0 ? amountTendered : null,
        change_given: paymentMethod === 'cash' && amountTendered >= total ? changeDue : null,
        shift_id: currentShiftId || null,
      },
      {
        onSuccess: (sale) => {
          dispatch(clearCart());
          dispatch(setAmountTendered(0));
          dispatch(setCustomer(null));
          dispatch(setDiscount(0));
          setCompletedSale(sale);
        },
      }
    );
  };

  const PayIcon = PAY_ICONS[paymentMethod];

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-0">
      <div className="space-y-5">
        {/* Customer */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Customer</label>
          <div className="relative">
            <button title="Select customer" className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors bg-white"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}>
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400 truncate'}>
                {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
              </span>
            </button>
            {showCustomerDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <input title="Search customers" className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none focus:bg-blue-50"
                  placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} autoFocus />
                <button title="Select walk-in customer" className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                  onClick={() => { dispatch(setCustomer(null)); setShowCustomerDropdown(false); setCustomerSearch(''); }}>
                  Walk-in customer
                </button>
                {filteredCustomers.map((c: any) => (
                  <button key={c.id} title={`Select ${c.name}`} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
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
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => {
              const Icon = PAY_ICONS[m];
              const isActive = paymentMethod === m;
              return (
                <button key={m} title={`Pay with ${m === 'mobile_money' ? 'Mobile Money' : m.charAt(0).toUpperCase() + m.slice(1)}`}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => dispatch(setPaymentMethod(m))}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m === 'mobile_money' ? 'Mobile' : m.charAt(0).toUpperCase() + m.slice(1)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Tendered (Cash Only) */}
        {paymentMethod === 'cash' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Amount Tendered</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">UGX</span>
              <input title="Enter amount tendered" type="number" min={0} step="100"
                className="w-full pl-11 pr-28 py-2.5 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={amountTendered || ''}
                onChange={(e) => dispatch(setAmountTendered(parseFloat(e.target.value) || 0))}
                onFocus={(e) => e.target.select()} />
              <button title="Fill exact total" type="button"
                onClick={() => dispatch(setAmountTendered(total))}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Auto Fill Amount
              </button>
            </div>
            {amountTendered > 0 && amountTendered < total && (
              <p className="text-xs text-amber-600 mt-1.5">Short by {formatCurrency(total - amountTendered)}</p>
            )}
          </div>
        )}

        {/* Discount */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Discount</label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              {discountType === 'fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">UGX</span>
              )}
              <input title="Enter discount amount" type="number" min={0}
                className={`border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums w-full py-2.5 ${discountType === 'fixed' ? 'pl-11 pr-3' : 'pl-3 pr-3'}`}
                placeholder={discountType === 'percentage' ? '0%' : '0'}
                value={discountAmount || ''}
                onChange={(e) => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
                onFocus={(e) => e.target.select()} />
              {discountType === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">%</span>
              )}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
              <button title="Switch to percentage discount" onClick={() => dispatch(setDiscountType('percentage'))}
                className={`px-4 py-2.5 text-xs font-medium transition-colors ${discountType === 'percentage' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>%</button>
              <button title="Switch to fixed discount" onClick={() => dispatch(setDiscountType('fixed'))}
                className={`px-4 py-2.5 text-xs font-medium transition-colors ${discountType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Fix</button>
            </div>
          </div>
          {discountValue > 0 && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">-{formatCurrency(discountValue)} off</p>
          )}
        </div>

        {/* Total */}
        <div className="pt-2">
          <div className="bg-gray-50 rounded-xl p-4">
            {discountValue > 0 && (
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            {paymentMethod === 'cash' && amountTendered > 0 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm font-medium text-green-600">Change Due</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(changeDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Complete Sale Button */}
        <Button title="Finalize and complete the sale"
          className="w-full h-12 text-base font-semibold" 
          onClick={handleCompleteSale} 
          loading={createSale.isPending}
          disabled={cartItems.length === 0 || (paymentMethod === 'cash' && amountTendered < total)}
        >
          <PayIcon className="w-5 h-5 mr-2" />
          Complete Sale
        </Button>
      </div>
    </div>
    <SaleCompletedModal
      sale={completedSale}
      onClose={() => { setCompletedSale(null); createSale.reset(); }}
      onPrint={handlePrint}
      onNewSale={() => { setCompletedSale(null); createSale.reset(); }}
    />
    {completedSale && <PrintableReceipt ref={receiptRef} sale={completedSale} isPrinting={isPrinting} />}
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function NewSale() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const heldOrders = useAppSelector((s) => s.sales.heldOrders);
  const { data: products } = useProducts();
  const { confirm } = useConfirm();

  // Search State
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Refs
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [qtyEdit, setQtyEdit] = useState<{ productId: number; productName: string; currentQty: number } | null>(null);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

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

  const addItem = (id: number, name: string, price: number, unit?: string | null) => {
    dispatch(addToCart({ product_id: id, name, unit_price: price, unit }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
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

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN: Header + Search + Cart Table + Hold/Take Buttons */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - ONLY on left column */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-xs sm:text-sm text-gray-500">Search products and complete sale</p>
          </div>

          {/* Animated Search Bar */}
            <div ref={wrapRef} className="relative mb-4">
              <div className="relative rounded-lg p-[2px]">
                <motion.div
                  className="absolute inset-0 rounded-lg z-0"
                  style={{
                    background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)',
                    backgroundSize: '300% 100%',
                  }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: isFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative z-10 rounded-[6px] overflow-hidden bg-white">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
                  <input ref={searchRef} type="text" placeholder="Search by name, SKU, or barcode..." title="Search products"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                    onFocus={() => { setIsFocused(true); if (search.trim()) setShowResults(true); }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && products) {
                        const q = search.trim().toLowerCase();
                        const exact = products.find((p) =>
                          p.is_active && p.stock_quantity > 0 &&
                          (p.name.toLowerCase() === q || (p.sku && p.sku.toLowerCase() === q) || (p.barcode && p.barcode === q))
                        );
                        if (exact) {
                          addItem(exact.id, exact.name, parseFloat(exact.unit_price), exact.unit);
                        } else if (results.length > 0 && results[0].stock_quantity > 0) {
                          addItem(results[0].id, results[0].name, parseFloat(results[0].unit_price), results[0].unit);
                        }
                      }
                    }}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]" />
                  {search && (
                    <button title="Clear search" onClick={() => { setSearch(''); setShowResults(false); searchRef.current?.focus(); }}
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
                      style={{ background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)', backgroundSize: '300% 100%' }}
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
                              <tr key={p.id} title={`Add ${p.name} to cart`} className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onMouseDown={() => p.stock_quantity > 0 && addItem(p.id, p.name, parseFloat(p.unit_price), p.unit)}>
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
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cart ({cartItems.length} {cartItems.length > 1 ? 'items' : 'item'})
              </span>
              <button title="Remove all items from cart" onClick={handleClearAll} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors">
                <RotateCcw className="w-4 h-4" /> Clear All
              </button>
            </div>
          )}

          {/* Cart Items Table - LARGER +/- BUTTONS */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <ShoppingCart className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No items added</p>
                <p className="text-xs mt-1">Search and select products above</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cartItems.map((item, idx) => (
                      <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-800 truncate block max-w-[150px] sm:max-w-none">{item.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-sm text-gray-600">{formatCurrency(item.unit_price)}{item.unit ? ` / ${item.unit}` : ''}</span>
                        </td>
                       <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* MINUS BUTTON - Circular with bright red ring */}
                            <button title="Decrease quantity"
                              onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))}
                              className="w-8 h-8 rounded-full border-2 border-red-400 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            
                            {/* QUANTITY DISPLAY */}
                            <span title="Click to edit quantity" className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center justify-center gap-0.5"
                              onClick={() => setQtyEdit({ productId: item.product_id, productName: item.name, currentQty: item.quantity })}>
                              {item.quantity}<Pencil className="w-3 h-3 text-blue-400" />
                            </span>
                            
                            {/* PLUS BUTTON - Circular with bright green ring + shadow */}
                            <button title="Increase quantity"
                              onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))}
                              className="w-8 h-8 rounded-full border-2 border-green-400 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700 transition-all flex items-center justify-center shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {/* LARGER DELETE BUTTON */}
                         <button title="Remove item"
                          onClick={() => dispatch(removeFromCart(item.product_id))}
                          className="w-8 h-8 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">Subtotal:</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Hold / Take Buttons */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-200 mt-4 flex items-center justify-end gap-3">
            {cartItems.length > 0 && (
              <button title="Save current order and clear cart" onClick={() => setHoldModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border-2 border-amber-400 rounded-xl hover:bg-amber-100 hover:border-amber-500 transition-all shadow-sm">
                <PauseCircle className="w-4 h-4" /> Hold Order
              </button>
            )}
            <button title="View and resume held orders" onClick={() => setHeldModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-400 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all shadow-sm relative">
              <RotateCcw className="w-4 h-4" /> Take Order
              {heldOrders.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white">
                  {heldOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Billing Controls */}
        <div className="w-full lg:w-96 shrink-0">
          <BillingControls />
        </div>
      </div>

      <HeldOrdersModal open={heldModalOpen} onClose={() => setHeldModalOpen(false)} />
      <HoldOrderModal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} />
      {qtyEdit && (
        <QuantityEditModal
          open={!!qtyEdit}
          onClose={() => setQtyEdit(null)}
          productId={qtyEdit.productId}
          productName={qtyEdit.productName}
          currentQty={qtyEdit.currentQty}
        />
    )}
    </>
  );
}