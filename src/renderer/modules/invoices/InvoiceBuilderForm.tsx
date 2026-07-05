import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useCustomers } from '../sales/api/salesQueries';
import { useCreateInvoice, useUpdateInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { computeSaleTax } from '../../shared/utils/taxEngine';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { matchesProductSearch, findProductByBarcode } from '../../shared/utils/productSearch';
import { Button } from '../../shared/components/buttons/Button';
import { Input } from '../../shared/components/inputs/Input';
import CustomerContactField, { EMPTY_CUSTOMER_CONTACT } from '../../shared/components/customers/CustomerContactField';
import { contactFromValue, useResolveCustomerContact } from '../../shared/hooks/useResolveCustomerContact';
import {
  customerToContact,
  type CustomerContactValue,
} from '../../shared/utils/customerContactUtils';
import type { Customer } from '../customers/api/customers/CustomerTypes';
import { useAppSelector } from '../../app/store/hooks/useApp';
import QuantityEditModal from '../sales/ui/QuantityEditModal';
import {
  defaultDueDate,
  invoiceItemsToLineItems,
  lineItemsToPayload,
  newLineKey,
  type InvoiceLineItem,
} from './invoiceLineItems';
import {
  Search, Plus, Minus, Trash, ShoppingCart, Package, X, FileText,
  MessageSquare, Calendar, RotateCcw, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../shared/utils/cn';

interface InvoiceBuilderSeed {
  lineItems: InvoiceLineItem[];
  customerId?: number | null;
  saleId?: number | null;
  /** When billing a completed sale, reuse sale tax so invoice total matches collections. */
  saleTaxTotal?: number;
  /** Sale-level discount already applied at checkout — keeps invoice total aligned. */
  saleDiscountAmount?: number;
  /** Amount already collected on the linked sale (carries to invoice). */
  saleAmountPaid?: number;
  /** Net sale total after refunds — for balance messaging. */
  saleNetTotal?: number;
  notes?: string;
}

interface InvoiceBuilderFormProps {
  mode: 'create' | 'edit';
  invoice?: Invoice;
  seed?: InvoiceBuilderSeed;
  layout?: 'page' | 'modal';
  onComplete: (invoice?: Invoice) => void;
  onCancel?: () => void;
}

export default function InvoiceBuilderForm({
  mode,
  invoice,
  seed,
  layout = 'page',
  onComplete,
  onCancel,
}: InvoiceBuilderFormProps) {
  const isEdit = mode === 'edit';
  const isModal = layout === 'modal';
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { taxSettings } = useBusinessTaxSettings();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const resolveCustomer = useResolveCustomerContact();
  const isOffline = useAppSelector((s) => s.network.systemStatus === 'offline');

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    () => seed?.lineItems?.map((item) => ({ ...item })) ?? [],
  );
  const [formInitialized, setFormInitialized] = useState(() => !isEdit);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [contact, setContact] = useState<CustomerContactValue>(() => {
    if (seed?.customerId) {
      return { customerId: seed.customerId, name: '', email: '', phone: '' };
    }
    return EMPTY_CUSTOMER_CONTACT;
  });
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [notes, setNotes] = useState(() => seed?.notes ?? '');
  const [qtyEdit, setQtyEdit] = useState<{
    lineKey: string;
    productId: number;
    productName: string;
    currentQty: number;
  } | null>(null);
  const [prevSeedCustomerId, setPrevSeedCustomerId] = useState(seed?.customerId ?? null);

  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEdit || !invoice || !products || formInitialized) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate edit form when products load
    setLineItems(invoiceItemsToLineItems(invoice, products));
    if (invoice.customer_id && invoice.customer) {
      setContact(customerToContact(invoice.customer as Customer));
    } else if (invoice.customer_id) {
      setContact({ customerId: invoice.customer_id, name: '', email: '', phone: '' });
    } else {
      setContact(EMPTY_CUSTOMER_CONTACT);
    }
    setIssueDate(invoice.issue_date.slice(0, 10));
    setDueDate(invoice.due_date.slice(0, 10));
    setNotes(invoice.notes ?? '');
    setFormInitialized(true);
  }, [isEdit, invoice, products, formInitialized]);

  const seedCustomerId = seed?.customerId ?? null;
  if (seedCustomerId && seedCustomerId !== prevSeedCustomerId && customers?.length) {
    const match = customers.find((c) => c.id === seedCustomerId);
    if (match) {
      setPrevSeedCustomerId(seedCustomerId);
      setContact(customerToContact(match));
    }
  }

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    return products.filter((p) => p.is_active && matchesProductSearch(p, search)).slice(0, 8);
  }, [products, search]);

  const taxBreakdown = useMemo(() => {
    const discount = seed?.saleDiscountAmount ?? 0;
    const computed = computeSaleTax(taxSettings, lineItems, discount);
    if (seed?.saleId != null && seed.saleTaxTotal != null) {
      return {
        ...computed,
        taxTotal: seed.saleTaxTotal,
        total: computed.subtotalNet + seed.saleTaxTotal,
      };
    }
    return computed;
  }, [taxSettings, lineItems, seed]);

  const addItem = useCallback((
    id: number,
    name: string,
    price: number,
    unit?: string | null,
    taxPercentage?: string | null,
    taxClass?: string | null,
  ) => {
    setLineItems((prev) => {
      const existing = prev.find((i) => i.product_id === id);
      if (existing) {
        return prev.map((i) =>
          i.lineKey === existing.lineKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, {
        lineKey: newLineKey(id),
        product_id: id,
        name,
        unit_price: price,
        quantity: 1,
        unit,
        tax_percentage: taxPercentage,
        tax_class: taxClass,
      }];
    });
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!products || !search.trim()) return;
    const match = findProductByBarcode(products, search);
    if (!match || !match.is_active) return;
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

  useEffect(() => {
    if (isEdit || isModal) return;
    searchRef.current?.focus();
  }, [isEdit, isModal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function updateQuantity(lineKey: string, quantity: number) {
    if (quantity <= 0) {
      setLineItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
      return;
    }
    setLineItems((prev) =>
      prev.map((i) => (i.lineKey === lineKey ? { ...i, quantity } : i)),
    );
  }

  function removeItem(lineKey: string) {
    setLineItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }

  function clearAll() {
    setLineItems([]);
  }

  function resetForm() {
    setLineItems([]);
    setContact(EMPTY_CUSTOMER_CONTACT);
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(defaultDueDate());
    setNotes('');
  }

  const buildPayload = useCallback((resolvedCustomerId: number | null) => ({
    customer_id: resolvedCustomerId,
    sale_id: seed?.saleId ?? undefined,
    issue_date: issueDate,
    due_date: dueDate,
    tax_total: taxBreakdown.taxTotal,
    notes: notes || undefined,
    items: lineItemsToPayload(lineItems),
  }), [seed?.saleId, issueDate, dueDate, taxBreakdown.taxTotal, notes, lineItems]);

  async function resolveCustomerId(): Promise<number | null> {
    if (contact.customerId) return contact.customerId;

    const hasDraft = contact.name.trim() || contact.email.trim() || contact.phone.trim();
    if (!hasDraft || isOffline) return null;

    try {
      const customer = await resolveCustomer.mutateAsync(contactFromValue(contact));
      setContact(customerToContact(customer));
      return customer.id;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    if (lineItems.length === 0 || !dueDate) return;

    const resolvedCustomerId = await resolveCustomerId();
    const payload = buildPayload(resolvedCustomerId);

    if (isEdit && invoice) {
      updateInvoice.mutate(
        { id: invoice.id, payload },
        { onSuccess: (updated) => onComplete(updated) },
      );
      return;
    }

    createInvoice.mutate(payload, {
      onSuccess: (created) => {
        if (!seed) resetForm();
        onComplete(created);
      },
    });
  }

  const isPending = createInvoice.isPending || updateInvoice.isPending || resolveCustomer.isPending;
  const showLoading = isEdit && !formInitialized;

  return (
    <>
      <div className={cn(
        'h-full flex gap-6',
        isModal ? 'flex-col xl:flex-row max-h-[calc(90vh-7rem)]' : 'flex-col lg:flex-row',
      )}>
        <div className={cn('flex-1 flex flex-col min-w-0', isModal && 'min-h-0')}>
          <div className={cn('mb-4 pb-3 border-b border-gray-200', isModal && 'mb-3 pb-2')}>
            <h2 className={cn('font-bold text-gray-900', isModal ? 'text-base' : 'text-lg')}>
              {isEdit
                ? `Edit draft ${invoice?.invoice_number ?? ''}`
                : seed
                  ? 'Invoice from cart'
                  : 'New Invoice'}
            </h2>
            <p className="text-sm text-gray-500">
              {isEdit
                ? 'Adjust items, quantities, customer, and dates — then save'
                : seed
                  ? 'Review cart items, adjust quantities, add products, then create a draft'
                  : 'Search products and add them to the invoice'}
            </p>
          </div>

          {showLoading ? (
            <div className="flex flex-col items-center justify-center text-gray-400 py-16 border border-dashed border-gray-200 rounded-lg">
              <ShoppingCart className="w-12 h-12 mb-3 animate-pulse" />
              <p className="text-sm font-medium">Loading invoice items…</p>
            </div>
          ) : (
            <>
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
                    <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors', isFocused ? 'text-blue-500' : 'text-gray-400')} />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search by name, SKU, or barcode..."
                      title="Search products"
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
                              p.is_active && (p.name.toLowerCase() === q || (p.sku && p.sku.toLowerCase() === q)),
                            );
                          if (exact) {
                            addItem(exact.id, exact.name, parseFloat(exact.unit_price), exact.unit, exact.tax_percentage, exact.tax_class);
                          } else if (results.length > 0) {
                            const p = results[0];
                            addItem(p.id, p.name, parseFloat(p.unit_price), p.unit, p.tax_percentage, p.tax_class);
                          }
                        }
                      }}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]"
                    />
                    {search && (
                      <button
                        type="button"
                        title="Clear search"
                        onClick={() => { setSearch(''); setShowResults(false); searchRef.current?.focus(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {showResults && search && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-30 w-full mt-1.5"
                    >
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                        {results.length > 0 ? (
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-10">+</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {results.map((p) => (
                                <tr
                                  key={p.id}
                                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                                  onMouseDown={() => addItem(p.id, p.name, parseFloat(p.unit_price), p.unit, p.tax_percentage, p.tax_class)}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500 shrink-0">
                                        <Package className="w-4 h-4" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(p.unit_price)}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="p-1.5 rounded-full bg-green-50 text-green-600 inline-flex">
                                      <Plus className="w-4 h-4" />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="px-4 py-6 text-sm text-gray-400 text-center">No products found</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {lineItems.length > 0 && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items ({lineItems.length})
                  </span>
                  <button
                    type="button"
                    title="Remove all items"
                    onClick={clearAll}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Clear All
                  </button>
                </div>
              )}

              <div className={cn('flex-1 overflow-y-auto', isModal && 'min-h-0')}>
                {lineItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-400 py-16 border border-dashed border-gray-200 rounded-lg">
                    <ShoppingCart className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">No items added</p>
                    <p className="text-xs mt-1">Search and select products above</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Price</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lineItems.map((item) => (
                          <tr key={item.lineKey} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-800">{item.name}</span>
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-sm text-gray-600">{formatCurrency(item.unit_price)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  title="Decrease quantity"
                                  onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full border-2 border-red-400 hover:bg-red-50 text-red-500 flex items-center justify-center"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Edit quantity"
                                  onClick={() => setQtyEdit({
                                    lineKey: item.lineKey,
                                    productId: item.product_id ?? 0,
                                    productName: item.name,
                                    currentQty: item.quantity,
                                  })}
                                  className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums hover:text-blue-600"
                                >
                                  {item.quantity}
                                </button>
                                <button
                                  type="button"
                                  title="Increase quantity"
                                  onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                                  className="w-8 h-8 rounded-full border-2 border-green-400 hover:bg-green-50 text-green-600 flex items-center justify-center"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                title="Remove item"
                                onClick={() => removeItem(item.lineKey)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={cn('w-full shrink-0', isModal ? 'xl:w-80' : 'lg:w-96')}>
          <div className={cn(
            'bg-white rounded-xl border border-gray-200 p-5 h-fit space-y-5',
            !isModal && 'sticky top-0',
          )}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isEdit
                  ? 'Changes apply to this draft only. Send the invoice when ready to post to accounting.'
                  : seed?.saleId
                    ? (seed.saleAmountPaid ?? 0) > 0.009
                      ? `Payments on the linked sale carry over to this invoice (${formatCurrency(seed.saleAmountPaid ?? 0)} collected${
                          Math.max(0, (seed.saleNetTotal ?? taxBreakdown.total) - (seed.saleAmountPaid ?? 0)) > 0.009
                            ? ` · ${formatCurrency(Math.max(0, (seed.saleNetTotal ?? taxBreakdown.total) - (seed.saleAmountPaid ?? 0)))} will remain due`
                            : ' · paid in full on the sale'
                        }).`
                      : 'Linked to a completed sale with no payment collected yet — balance settles on the invoice.'
                    : 'No payment is recorded — the customer pays when the invoice is settled.'}
              </span>
            </div>

            <CustomerContactField
              value={contact}
              onChange={setContact}
              disabled={isPending || showLoading}
              surface="invoice"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  <Calendar className="w-3 h-3 inline mr-1" />Issue Date
                </label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  <Calendar className="w-3 h-3 inline mr-1" />Due Date
                </label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                <MessageSquare className="w-3 h-3 inline mr-1" />Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment terms, delivery instructions..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {taxBreakdown.taxEnabled && taxBreakdown.taxTotal > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal (excl. VAT)</span>
                    <span>{formatCurrency(taxBreakdown.subtotalNet)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>VAT</span>
                    <span>{formatCurrency(taxBreakdown.taxTotal)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-base font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(taxBreakdown.total)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => void handleSave()}
                loading={isPending}
                disabled={lineItems.length === 0 || !dueDate || showLoading}
              >
                {isEdit ? (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save changes
                  </>
                ) : seed ? (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Create draft invoice
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
              {(isEdit || isModal) && onCancel && (
                <Button variant="outline" className="w-full" onClick={onCancel} disabled={isPending}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {qtyEdit && (
        <QuantityEditModal
          open={!!qtyEdit}
          onClose={() => setQtyEdit(null)}
          productId={qtyEdit.productId}
          productName={qtyEdit.productName}
          currentQty={qtyEdit.currentQty}
          maxQty={9999}
          onConfirm={(qty) => {
            updateQuantity(qtyEdit.lineKey, qty);
            setQtyEdit(null);
          }}
        />
      )}
    </>
  );
}
