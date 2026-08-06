import { useState, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  clearCart,
  setPaymentMethod,
  setCustomer,
  setAmountTendered,
  setDiscount,
  setDiscountType,
  setActiveOrderId,
} from '../api/salesSlice';
import { useCustomers, useCreateSale } from '../api/salesQueries';
import CustomerContactField, { EMPTY_CUSTOMER_CONTACT } from '../../../shared/components/customers/CustomerContactField';
import { contactFromValue, hasResolvableContact, useResolveCustomerContact } from '../../../shared/hooks/useResolveCustomerContact';
import { customerToContact, type CustomerContactValue } from '../../../shared/utils/customerContactUtils';
import type { Sale } from '../api/salesTypes';
import type { Payment } from '../../payments/paymentTypes';
import { Banknote, Smartphone, CreditCard, Wallet, ArrowDownToLine, ArrowLeft, WifiOff } from 'lucide-react';
import { HiCheckCircle } from 'react-icons/hi2';
import InvoiceFromSaleModal from './InvoiceFromSaleModal';
import SaleCompletedModal from './SaleCompletedModal';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { computeSaleTax } from '../../../shared/utils/taxEngine';
import { Button } from '../../../shared/components/buttons/Button';

const PAY_ICONS = { cash: Banknote, mobile_money: Smartphone, card: CreditCard, other: Wallet };

function formatTendered(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
  }
  const [int = '', dec] = cleaned.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
}

interface BillingControlsProps {
  onBack?: () => void;
  itemCount?: number;
  onSaleCompleted?: () => void;
}

export function BillingControls({ onBack, itemCount, onSaleCompleted }: BillingControlsProps) {
  const dispatch = useAppDispatch();
  const [tenderedText, setTenderedText] = useState<string | null>(null);
  const [discountText, setDiscountText] = useState<string | null>(null);
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const paymentMethod = useAppSelector((s) => s.sales.paymentMethod);
  const amountTendered = useAppSelector((s) => s.sales.amountTendered);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const activeOrderId = useAppSelector((s) => s.sales.activeOrderId);
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();
  const resolveCustomer = useResolveCustomerContact();
  const currentShiftId = useAppSelector((s) => s.auth.user?.shift_id);
  const activeLocationId = useAppSelector((s) => s.auth.activeLocationId);
  const authUser = useAppSelector((s) => s.auth.user);
  const { taxSettings, business: taxBusinessRecord } = useBusinessTaxSettings();
  const currency = taxBusinessRecord?.currency || authUser?.business?.currency || 'UGX';
  const isOffline = useAppSelector((s) => s.network.systemStatus === 'offline');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceFromSale, setInvoiceFromSale] = useState<Sale | null>(null);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
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
          order_id: activeOrderId || null,
          location_id: activeLocationId || null,
        },
        {
          onSuccess: (sale) => {
            dispatch(clearCart());
            dispatch(setAmountTendered(0));
            setTenderedText(null);
            dispatch(setCustomer(null));
            dispatch(setDiscount(0));
            setContact(EMPTY_CUSTOMER_CONTACT);
            setInstallmentMode(false);
            setCompletedSale(sale);
            const payments = (sale as Sale & { payments?: Payment[] }).payments;
            setLastPayment(payments?.length ? payments[payments.length - 1] : null);
          },
          onError: (err) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? '';
            if (status === 422 && activeOrderId && /order/i.test(message)) {
              dispatch(setActiveOrderId(null));
            }
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
    <div className="flex-1 min-h-0 w-full flex flex-col items-center pb-8">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* LEFT: customer + payment inputs */}
        <div className="w-full lg:flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer</p>
                <p className="text-[11px] text-gray-400">Added for receipts &amp; invoices</p>
              </div>
            </div>
            <CustomerContactField
            value={contact}
            onChange={setContact}
            disabled={createSale.isPending || resolveCustomer.isPending}
          />

          {/* Payment Method */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">2</div>
              <p className="text-sm font-semibold text-gray-900">Payment</p>
            </div>
            <p className="text-xs font-medium text-gray-500 mt-1 mb-3">Choose how the customer pays</p>
            <div className="grid grid-cols-2 gap-2">
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
          </div>
        </div>

        {/* RIGHT: payment entry + discount + totals + complete */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Amount paying now */}
          {(installmentMode || paymentMethod === 'cash') && (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">3</div>
                <p className="text-sm font-semibold text-gray-900">{installmentMode ? 'Amount paying now' : 'Amount received'}</p>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currency}</span>
                <input title="Enter amount paying now" type="text" inputMode="decimal" min={0}
                  className="w-full pl-11 pr-28 py-2.5 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0" value={tenderedText ?? (amountTendered > 0 ? formatTendered(String(amountTendered)) : '')}
                  onChange={(e) => {
                    const formatted = formatTendered(e.target.value);
                    setTenderedText(formatted);
                    const num = Math.round((parseFloat(formatted.replace(/,/g, '')) || 0) * 100) / 100;
                    dispatch(setAmountTendered(num));
                  }}
                  onFocus={(e) => {
                    setTenderedText(amountTendered > 0 ? formatTendered(String(amountTendered)) : '');
                    e.target.select();
                  }}
                  onBlur={() => setTenderedText(null)} />
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
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">4</div>
              <p className="text-sm font-semibold text-gray-900">Discount</p>
            </div>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                {discountType === 'fixed' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currency}</span>
                )}
                {discountType === 'percentage' ? (
                  <input title="Enter discount percentage" type="number" min={0} max={100}
className="border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums w-full py-2.5 pl-3 pr-3"
                  placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
                    onFocus={(e) => e.target.select()} />
                ) : (
                  <input title="Enter discount amount" type="text" inputMode="decimal" min={0}
                    className="border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums w-full py-2.5 pl-11 pr-3"
                    placeholder="0"
                    value={discountText ?? (discountAmount > 0 ? formatTendered(String(discountAmount)) : '')}
                    onChange={(e) => {
                      const formatted = formatTendered(e.target.value);
                      setDiscountText(formatted);
                      const num = Math.round((parseFloat(formatted.replace(/,/g, '')) || 0) * 100) / 100;
                      dispatch(setDiscount(num));
                    }}
                    onFocus={(e) => {
                      setDiscountText(discountAmount > 0 ? formatTendered(String(discountAmount)) : '');
                      e.target.select();
                    }}
                    onBlur={() => setDiscountText(null)} />
                )}
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
          {/* Complete Sale Button */}
          <div className="flex items-stretch gap-2">
            {onBack && (
              <button
                type="button"
                title="Go back to review and change the items in this sale"
                onClick={onBack}
                className="group flex shrink-0 items-center gap-1.5 pl-2.5 pr-3 rounded-lg text-sm font-semibold text-blue-700 bg-white border-2 border-blue-300 shadow-sm hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </span>
                <span className="whitespace-nowrap">Back to Items</span>
                {typeof itemCount === 'number' && itemCount > 0 && (
                  <span className="min-w-[22px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold text-center tabular-nums">
                    {itemCount}
                  </span>
                )}
              </button>
            )}
            <Button title={isPartialPayment ? 'Record partial payment' : 'Finalize and complete the sale'}
              className="flex-1 h-12 text-base font-semibold"
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
      </div>
    </div>
    <SaleCompletedModal
      sale={completedSale}
      lastPayment={lastPayment}
      onNewSale={() => {
        setCompletedSale(null);
        setLastPayment(null);
        setInvoiceFromSale(null);
        createSale.reset();
        onSaleCompleted?.();
      }}
      onClose={() => {
        setCompletedSale(null);
        setLastPayment(null);
        setInvoiceFromSale(null);
        createSale.reset();
        onSaleCompleted?.();
      }}
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
          onSaleCompleted?.();
        }}
      />
    )}
    </>
  );
}