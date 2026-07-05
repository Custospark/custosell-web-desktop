import { Link } from "react-router-dom";
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../inventory/api/products/ProductQueries';
import type { Product } from '../inventory/api/products/ProductTypes';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart, clearCart, setPaymentMethod, setCustomer, setAmountTendered, setDiscount, setDiscountType } from './api/salesSlice';
import { useCustomers, useCreateSale } from './api/salesQueries';
import CustomerContactField, { EMPTY_CUSTOMER_CONTACT } from '../../shared/components/customers/CustomerContactField';
import { contactFromValue, hasResolvableContact, useResolveCustomerContact } from '../../shared/hooks/useResolveCustomerContact';
import { customerToContact, type CustomerContactValue } from '../../shared/utils/customerContactUtils';
import type { Sale } from './api/salesTypes';
import { Search, Plus, Minus, Trash, ShoppingCart, X, Package, Banknote, Smartphone, CreditCard, Wallet, RotateCcw, PauseCircle, Pencil, ArrowDownToLine, WifiOff, RefreshCw, SlidersHorizontal, PackagePlus, CheckCircle2, CircleCheck, FileText } from 'lucide-react';
import { HiCheckCircle } from 'react-icons/hi2';
import HeldOrdersModal from './ui/HeldOrdersModal';
import HoldOrderModal from './ui/HoldOrderModal';
import QuantityEditModal from './ui/QuantityEditModal';
import InvoiceFromSaleModal from './ui/InvoiceFromSaleModal';
import SaleCompletedModal from './ui/SaleCompletedModal';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { computeSaleTax } from '../../shared/utils/taxEngine';
import { cn } from '../../shared/utils/cn';
import { findProductByBarcode, matchesProductSearch } from '../../shared/utils/productSearch';
import { Button } from '../../shared/components/buttons/Button';

const PAY_ICONS = { cash: Banknote, mobile_money: Smartphone, card: CreditCard, other: Wallet };
const RELOAD_SUCCESS_MS = 10_000;

type ReloadFeedback = 'idle' | 'updated' | 'upToDate';

function inventorySnapshot(products: Product[] | undefined): string {
  if (!products?.length) return '';
  return [...products]
    .sort((a, b) => a.id - b.id)
    .map((p) => `${p.id}:${p.stock_quantity}:${p.is_active ? 1 : 0}`)
    .join('|');
}

const PRODUCT_SEARCH_SUGGESTIONS = [
  {
    icon: SlidersHorizontal,
    title: 'Adjust your search',
    description: 'Try fewer characters or a different spelling',
  },
  {
    icon: PackagePlus,
    title: 'Consider adding the product to stock',
    description: 'Ask someone with inventory access if the item should be stocked',
  },
] as const;

function ProductSearchEmptyState({
  searchQuery,
  onReload,
  isReloading,
  reloadFeedback,
}: {
  searchQuery: string;
  onReload: () => void;
  isReloading: boolean;
  reloadFeedback: ReloadFeedback;
}) {
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" aria-hidden />
        <p className="text-sm font-medium text-gray-700">No products found</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate px-2" title={searchQuery}>
          Nothing matched &ldquo;{searchQuery}&rdquo;
        </p>
      </div>

      {reloadFeedback === 'updated' ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2 bg-green-600 hover:bg-green-600 active:bg-green-600 focus:ring-green-500 cursor-default"
          disabled
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          Stock updated — search again
        </Button>
      ) : reloadFeedback === 'upToDate' ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2 bg-green-600 hover:bg-green-600 active:bg-green-600 focus:ring-green-500 cursor-default"
          disabled
        >
          <CircleCheck className="w-4 h-4 shrink-0" aria-hidden />
          Products up to date — adjust your search
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2"
          disabled={isReloading}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void onReload()}
        >
          <RefreshCw className={cn('w-4 h-4 shrink-0', isReloading && 'animate-spin')} aria-hidden />
          {isReloading ? 'Reloading…' : 'Reload products'}
        </Button>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-4 mb-2 px-0.5">Suggestions</p>
      <ul className="space-y-1">
        {PRODUCT_SEARCH_SUGGESTIONS.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-lg p-2.5 text-left bg-gray-50/80"
          >
            <span className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 shrink-0">
              <Icon className="w-4 h-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-gray-700">{title}</span>
              <span className="block text-xs text-gray-500">{description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const resolveCustomer = useResolveCustomerContact();
  const currentShiftId = useAppSelector((s) => s.auth.user?.shift_id);
  const authUser = useAppSelector((s) => s.auth.user);
  const { taxSettings, business: taxBusinessRecord } = useBusinessTaxSettings();
  const currency = taxBusinessRecord?.currency || authUser?.business?.currency || 'UGX';
  const isOffline = useAppSelector((s) => s.network.systemStatus === 'offline');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceFromSale, setInvoiceFromSale] = useState<Sale | null>(null);
  const [lastPayment, setLastPayment] = useState<import('../../payments/paymentTypes').Payment | null>(null);
  const [installmentMode, setInstallmentMode] = useState(false);

  const [contact, setContact] = useState<CustomerContactValue>(EMPTY_CUSTOMER_CONTACT);
  const [prevSyncCustomerId, setPrevSyncCustomerId] = useState(customerId);

  if (customerId !== prevSyncCustomerId) {
    setPrevSyncCustomerId(customerId);
    if (customerId && customers?.length) {
      const match = customers.find((c) => c.id === customerId);
      if (match) setContact(customerToContact(match));
    } else if (!customerId) {
      setContact(EMPTY_CUSTOMER_CONTACT);
    }
  }

  useEffect(() => {
    if (contact.customerId && contact.customerId !== customerId) {
      dispatch(setCustomer(contact.customerId));
    } else if (!contact.customerId && !contact.name && !contact.email && !contact.phone && customerId) {
      dispatch(setCustomer(null));
    }
  }, [contact, customerId, dispatch]);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const discountValue = discountType === 'percentage'
    ? Math.min(subtotal * (discountAmount / 100), subtotal)
    : Math.min(discountAmount, subtotal);
  const taxBreakdown = useMemo(
    () => computeSaleTax(taxSettings, cartItems, discountValue),
    [taxSettings, cartItems, discountValue],
  );
  const total = taxBreakdown.total;
  const payNow = installmentMode
    ? Math.min(Math.max(0, amountTendered), total)
    : total;
  const isPartialPayment = payNow > 0 && payNow < total - 0.009;
  const changeDue = paymentMethod === 'cash' && !isPartialPayment
    ? Math.max(0, amountTendered - total)
    : 0;
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    const submitSale = (resolvedCustomerId: number | null) => {
      createSale.mutate(
        {
          items: cartItems.map((c) => ({
            product_id: c.product_id,
            quantity: c.quantity,
            unit_price: c.unit_price,
          })),
          subtotal: taxBreakdown.subtotalNet,
          tax_total: taxBreakdown.taxTotal,
          discount_amount: taxBreakdown.discountAmount,
          total_amount: taxBreakdown.total,
          payment_method: paymentMethod,
          customer_id: resolvedCustomerId,
          amount_paid: isPartialPayment ? payNow : undefined,
          amount_tendered: paymentMethod === 'cash'
            ? (isPartialPayment ? payNow : (amountTendered > 0 ? amountTendered : null))
            : (installmentMode ? payNow : null),
          change_given: paymentMethod === 'cash'
            ? (isPartialPayment
              ? (amountTendered > payNow ? amountTendered - payNow : null)
              : (amountTendered >= total ? changeDue : null))
            : null,
          shift_id: currentShiftId || null,
        },
        {
          onSuccess: (sale) => {
            dispatch(clearCart());
            dispatch(setAmountTendered(0));
            dispatch(setCustomer(null));
            dispatch(setDiscount(0));
            setContact(EMPTY_CUSTOMER_CONTACT);
            setInstallmentMode(false);
            setCompletedSale(sale);
            const payments = (sale as Sale & { payments?: import('../../payments/paymentTypes').Payment[] }).payments;
            setLastPayment(payments?.length ? payments[payments.length - 1] : null);
          },
        },
      );
    };

    const shouldResolve = hasResolvableContact(contact, contact.email)
      && (!customerId || contact.email.trim() || contact.name.trim() || contact.phone.trim());

    if (shouldResolve && !isOffline) {
      void resolveCustomer.mutateAsync(contactFromValue(contact))
        .then((customer) => submitSale(customer.id))
        .catch(() => submitSale(customerId));
      return;
    }

    submitSale(customerId);
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-0">
      <div className="space-y-5">
        <CustomerContactField
          value={contact}
          onChange={setContact}
          disabled={createSale.isPending || resolveCustomer.isPending}
        />

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

        {/* Installment mode */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-gray-700">Pay in installments</p>
            <p className="text-[11px] text-gray-500">Customer pays part now, rest later</p>
          </div>
          <button
            type="button"
            title="Toggle installment payments"
            onClick={() => setInstallmentMode((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${installmentMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${installmentMode ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Amount paying now */}
        {(installmentMode || paymentMethod === 'cash') && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              {installmentMode ? 'Amount paying now' : 'Amount Tendered'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currency}</span>
              <input title="Enter amount paying now" type="number" min={0} step="100"
                className="w-full pl-11 pr-28 py-2.5 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={amountTendered || ''}
                onChange={(e) => dispatch(setAmountTendered(parseFloat(e.target.value) || 0))}
                onFocus={(e) => e.target.select()} />
              <button title="Fill exact total" type="button"
                onClick={() => dispatch(setAmountTendered(total))}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Full amount
              </button>
            </div>
            {isPartialPayment && (
              <p className="text-xs text-amber-700 mt-1.5 font-medium">
                Balance after this: {formatCurrency(total - payNow)}
              </p>
            )}
            {!installmentMode && amountTendered > 0 && amountTendered < total && (
              <p className="text-xs text-amber-600 mt-1.5">Short by {formatCurrency(total - amountTendered)} — enable installments to accept partial pay</p>
            )}
          </div>
        )}

        {/* Discount */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Discount</label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              {discountType === 'fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currency}</span>
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
            {(discountValue > 0 || taxBreakdown.taxEnabled) && (
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>{taxBreakdown.taxEnabled ? 'Subtotal (excl. VAT)' : 'Subtotal'}</span>
                <span>{formatCurrency(taxBreakdown.taxEnabled ? taxBreakdown.subtotalNet + taxBreakdown.discountAmount : subtotal)}</span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between items-center text-sm text-green-600 mb-2">
                <span>Discount</span>
                <span>-{formatCurrency(discountValue)}</span>
              </div>
            )}
            {taxBreakdown.taxEnabled && taxBreakdown.taxTotal > 0 && (
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>VAT</span>
                <span>{formatCurrency(taxBreakdown.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            {paymentMethod === 'cash' && !isPartialPayment && amountTendered > 0 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm font-medium text-green-600">Change Due</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(changeDue)}</span>
              </div>
            )}
            {isPartialPayment && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm font-medium text-amber-700">Paying now</span>
                <span className="text-xl font-bold text-amber-700 tabular-nums">{formatCurrency(payNow)}</span>
              </div>
            )}
          </div>
        </div>

        {isOffline && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            <WifiOff className="w-4 h-4 shrink-0" />
            Offline. Sale saved. Auto-syncs when connected. No worries. Keep working.
          </div>
        )}
        {/* Complete Sale Button */}
        <Button title={isPartialPayment ? 'Record partial payment' : 'Finalize and complete the sale'}
          className="w-full h-12 text-base font-semibold" 
          onClick={handleCompleteSale} 
          loading={createSale.isPending}
          disabled={
            cartItems.length === 0
            || (isPartialPayment && payNow <= 0)
            || (!installmentMode && paymentMethod === 'cash' && amountTendered < total)
            || (installmentMode && payNow <= 0)
          }
        >
          <HiCheckCircle className="w-5 h-5 mr-2" />
          {isPartialPayment ? `Record ${formatCurrency(payNow)} payment` : 'Complete Sale'}
        </Button>
      </div>
    </div>
    <SaleCompletedModal
      sale={completedSale}
      lastPayment={lastPayment}
      onNewSale={() => { setCompletedSale(null); setLastPayment(null); setInvoiceFromSale(null); createSale.reset(); }}
      onGenerateInvoice={() => completedSale && setInvoiceFromSale(completedSale)}
    />
    {invoiceFromSale && (
      <InvoiceFromSaleModal
        open={!!invoiceFromSale}
        linkedSale={invoiceFromSale}
        onClose={() => setInvoiceFromSale(null)}
        onSuccess={() => {
          setInvoiceFromSale(null);
          setCompletedSale(null);
          setLastPayment(null);
          createSale.reset();
        }}
      />
    )}
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
  const { data: products, refetch: refetchProducts, isFetching: isProductsFetching } = useProducts();
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
  const [qtyEdit, setQtyEdit] = useState<{ productId: number; productName: string; currentQty: number; maxQty: number } | null>(null);
  const [reloadFeedback, setReloadFeedback] = useState<ReloadFeedback>('idle');
  const reloadFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReloadFeedback = useCallback(() => {
    if (reloadFeedbackTimerRef.current) {
      clearTimeout(reloadFeedbackTimerRef.current);
      reloadFeedbackTimerRef.current = null;
    }
    setReloadFeedback('idle');
  }, []);

  // Invoice generation state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSession, setInvoiceSession] = useState(0);

  const showReloadFeedback = useCallback((feedback: Exclude<ReloadFeedback, 'idle'>) => {
    setReloadFeedback(feedback);
    if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
    reloadFeedbackTimerRef.current = setTimeout(() => {
      setReloadFeedback('idle');
      reloadFeedbackTimerRef.current = null;
    }, RELOAD_SUCCESS_MS);
  }, []);

  const handleReloadProducts = useCallback(async () => {
    try {
      const snapshotBefore = inventorySnapshot(products);
      const result = await refetchProducts();
      if (result.isError) return;

      const snapshotAfter = inventorySnapshot(result.data);
      showReloadFeedback(snapshotBefore === snapshotAfter ? 'upToDate' : 'updated');
    } catch (err) {
      console.warn('[NewSale] Product reload failed:', err);
    }
  }, [products, refetchProducts, showReloadFeedback]);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  // Filter products
  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    return products
      .filter((p) => p.is_active && matchesProductSearch(p, search))
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

  const addItem = useCallback((
    id: number,
    name: string,
    price: number,
    unit?: string | null,
    taxPercentage?: string | null,
    taxClass?: string | null,
  ) => {
    dispatch(addToCart({
      product_id: id,
      name,
      unit_price: price,
      unit,
      tax_percentage: taxPercentage,
      tax_class: taxClass,
    }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  }, [dispatch]);

  /** Scanner / typed barcode — add as soon as the code fully matches a product. */
  useEffect(() => {
    if (!products || !search.trim()) return;
    const match = findProductByBarcode(products, search);
    if (!match || !match.is_active || match.stock_quantity <= 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- barcode scanner adds product on scan
    addItem(
      match.id,
      match.name,
      parseFloat(match.unit_price),
      match.unit,
      match.tax_percentage,
      match.tax_class,
    );
  }, [search, products, addItem]);

  // Click outside handlers
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => () => {
    if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset reload banner when search changes
    clearReloadFeedback();
  }, [search, clearReloadFeedback]);

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
                        const barcodeMatch = findProductByBarcode(products, search);
                        const exact = barcodeMatch
                          ?? products.find((p) =>
                            p.is_active && p.stock_quantity > 0
                            && (p.name.toLowerCase() === q || (p.sku && p.sku.toLowerCase() === q)),
                          );
                        if (exact) {
                          addItem(exact.id, exact.name, parseFloat(exact.unit_price), exact.unit, exact.tax_percentage, exact.tax_class);
                        } else if (results.length > 0 && results[0].stock_quantity > 0) {
                          addItem(results[0].id, results[0].name, parseFloat(results[0].unit_price), results[0].unit, results[0].tax_percentage, results[0].tax_class);
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
                                onMouseDown={() => p.stock_quantity > 0 && addItem(p.id, p.name, parseFloat(p.unit_price), p.unit, p.tax_percentage, p.tax_class)}>
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
                        <ProductSearchEmptyState
                          searchQuery={search.trim()}
                          isReloading={isProductsFetching}
                          reloadFeedback={reloadFeedback}
                          onReload={handleReloadProducts}
                        />
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
                              onClick={() => {
                                const p = products?.find(p => p.id === item.product_id);
                                setQtyEdit({ productId: item.product_id, productName: item.name, currentQty: item.quantity, maxQty: p?.stock_quantity ?? 0 });
                              }}>
                              {item.quantity}<Pencil className="w-3 h-3 text-blue-400" />
                            </span>
                            
                            {/* PLUS BUTTON - Circular with bright green ring + shadow */}
                            {(() => {
                              const product = products?.find(p => p.id === item.product_id);
                              const maxStock = product?.stock_quantity ?? 0;
                              const atMax = item.quantity >= maxStock;
                              return (
                                <button title={atMax ? `Only ${maxStock} in stock` : 'Increase quantity'}
                                  onClick={() => !atMax && dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))}
                                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${
                                    atMax
                                      ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                      : 'border-green-400 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700'
                                  }`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              );
                            })()}
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

          {/* Hold / Take Buttons — inner w-max row so justify-end overflow can scroll to hidden actions */}
          <div className="sticky bottom-0 z-10 shrink-0 bg-white pt-4 pb-2 border-t border-gray-200 mt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 max-w-full overflow-x-auto overscroll-x-contain">
            <div className="flex w-max min-w-full flex-nowrap items-center justify-end gap-3">
            {cartItems.length > 0 && (
              <button
                title="Create a draft invoice from the current cart — adjust items before saving"
                onClick={() => {
                  setInvoiceSession((s) => s + 1);
                  setInvoiceModalOpen(true);
                }}
                className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border-2 border-blue-300 rounded-xl hover:bg-blue-100 hover:border-blue-400 transition-all shadow-sm whitespace-nowrap"
              >
                <FileText className="w-4 h-4" /> Generate Invoice
              </button>
            )}
            <Link to="/invoices" title="View and manage all invoices"
              className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-400 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all shadow-sm whitespace-nowrap">
              <FileText className="w-4 h-4" /> Manage Invoices
            </Link>
            {cartItems.length > 0 && (
              <button title="Save current order and clear cart" onClick={() => setHoldModalOpen(true)}
                className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border-2 border-amber-400 rounded-xl hover:bg-amber-100 hover:border-amber-500 transition-all shadow-sm whitespace-nowrap">
                <PauseCircle className="w-4 h-4" /> Hold Order
              </button>
            )}
            <button title="View and resume held orders" onClick={() => setHeldModalOpen(true)}
              className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-400 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all shadow-sm relative whitespace-nowrap">
              <RotateCcw className="w-4 h-4" /> Take Order
              {heldOrders.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white">
                  {heldOrders.length}
                </span>
              )}
            </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Billing Controls */}
        <div className="w-full lg:w-96 shrink-0">
          <BillingControls />
        </div>
      </div>

      <HeldOrdersModal open={heldModalOpen} onClose={() => setHeldModalOpen(false)} />
      <HoldOrderModal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} />
      <InvoiceFromSaleModal
        key={invoiceSession}
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={() => {
          dispatch(clearCart());
          dispatch(setCustomer(null));
          dispatch(setDiscount(0));
        }}
      />
      {qtyEdit && (
        <QuantityEditModal
          open={!!qtyEdit}
          onClose={() => setQtyEdit(null)}
          productId={qtyEdit.productId}
          productName={qtyEdit.productName}
          currentQty={qtyEdit.currentQty}
          maxQty={qtyEdit.maxQty}
        />
    )}
    </>
  );
}