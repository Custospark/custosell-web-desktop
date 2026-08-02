import { useState, useMemo, useEffect, useCallback } from 'react';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useCustomers } from '../sales/api/salesQueries';
import { useCreateInvoice, useUpdateInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { computeSaleTax } from '../../shared/utils/taxEngine';
import { formatCurrency } from '../../shared/utils/formatCurrency';
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
import { InvoiceProductSearch, type InvoiceProductPick } from './InvoiceProductSearch';
import { InvoiceLineItemsTable } from './InvoiceLineItemsTable';
import {
  defaultDueDate,
  invoiceItemsToLineItems,
  lineItemsToPayload,
  newLineKey,
  type InvoiceLineItem,
} from './invoiceLineItems';
import { FileText, MessageSquare, Calendar, ShoppingCart, Save } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

interface InvoiceBuilderSeed {
  lineItems: InvoiceLineItem[];
  customerId?: number | null;
  saleId?: number | null;
  /** Source branch of the linked sale — carries to the invoice so filtering/printing show it. */
  locationId?: number | null;
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
  }, []);

  const handleProductPick = useCallback((pick: InvoiceProductPick) => {
    addItem(
      pick.id,
      pick.name,
      parseFloat(String(pick.unit_price)),
      pick.unit,
      pick.tax_percentage,
      pick.tax_class,
    );
  }, [addItem]);

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
    location_id: seed?.locationId ?? undefined,
    issue_date: issueDate,
    due_date: dueDate,
    tax_total: taxBreakdown.taxTotal,
    notes: notes || undefined,
    items: lineItemsToPayload(lineItems),
  }), [seed?.saleId, seed?.locationId, issueDate, dueDate, taxBreakdown.taxTotal, notes, lineItems]);

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
              <InvoiceProductSearch
                products={products}
                autoFocus={!isEdit && !isModal}
                onAdd={handleProductPick}
              />

              <InvoiceLineItemsTable
                lineItems={lineItems}
                isModal={isModal}
                onUpdateQuantity={updateQuantity}
                onEditQuantity={setQtyEdit}
                onRemoveItem={removeItem}
                onClearAll={clearAll}
              />
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
