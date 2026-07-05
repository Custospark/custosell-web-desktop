import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useCustomers } from '../sales/api/salesQueries';
import { useCreateInvoice } from './api/InvoiceQueries';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { computeSaleTax } from '../../shared/utils/taxEngine';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { matchesProductSearch, findProductByBarcode } from '../../shared/utils/productSearch';
import { Button } from '../../shared/components/buttons/Button';
import { Input } from '../../shared/components/inputs/Input';
import QuantityEditModal from '../sales/ui/QuantityEditModal';
import {
  Search, Plus, Minus, Trash, ShoppingCart, Package, X, User, FileText,
  MessageSquare, Calendar, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../shared/utils/cn';

interface InvoiceLineItem {
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  unit?: string | null;
  tax_percentage?: string | null;
  tax_class?: string | null;
}

interface NewInvoiceBuilderProps {
  onCreated: () => void;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewInvoiceBuilder({ onCreated }: NewInvoiceBuilderProps) {
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { taxSettings } = useBusinessTaxSettings();
  const createInvoice = useCreateInvoice();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [qtyEdit, setQtyEdit] = useState<{ productId: number; productName: string; currentQty: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    return products.filter((p) => p.is_active && matchesProductSearch(p, search)).slice(0, 8);
  }, [products, search]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      const name = c.name?.toLowerCase() ?? '';
      const phone = c.phone ?? '';
      return name.includes(q) || phone.includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = customerId ? (customers ?? []).find((c) => c.id === Number(customerId)) : null;

  const taxBreakdown = useMemo(
    () => computeSaleTax(taxSettings, lineItems, 0),
    [taxSettings, lineItems],
  );

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
          i.product_id === id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, {
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

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      setLineItems((prev) => prev.filter((i) => i.product_id !== productId));
      return;
    }
    setLineItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)),
    );
  }

  function removeItem(productId: number) {
    setLineItems((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function clearAll() {
    setLineItems([]);
  }

  function resetForm() {
    setLineItems([]);
    setCustomerId('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(defaultDueDate());
    setNotes('');
    setCustomerSearch('');
  }

  function handleCreate() {
    if (lineItems.length === 0 || !dueDate) return;

    createInvoice.mutate(
      {
        customer_id: customerId ? Number(customerId) : null,
        issue_date: issueDate,
        due_date: dueDate,
        tax_total: taxBreakdown.taxTotal,
        notes: notes || undefined,
        items: lineItems.map((item) => ({
          product_id: item.product_id,
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        })),
      },
      {
        onSuccess: () => {
          resetForm();
          onCreated();
        },
      },
    );
  }

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        {/* Left: search + line items */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">New Invoice</h2>
            <p className="text-sm text-gray-500">Search products and add them to the invoice</p>
          </div>

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

          <div className="flex-1 overflow-y-auto">
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
                      <tr key={item.product_id} className="hover:bg-gray-50">
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
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border-2 border-red-400 hover:bg-red-50 text-red-500 flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Edit quantity"
                              onClick={() => setQtyEdit({ productId: item.product_id, productName: item.name, currentQty: item.quantity })}
                              className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums hover:text-blue-600"
                            >
                              {item.quantity}
                            </button>
                            <button
                              type="button"
                              title="Increase quantity"
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
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
                            onClick={() => removeItem(item.product_id)}
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
        </div>

        {/* Right: invoice details */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-0 space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No payment is recorded — the customer pays when the invoice is settled.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Customer</label>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:border-gray-300 bg-white text-left"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                >
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400 truncate'}>
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                  </span>
                </button>
                {showCustomerDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none focus:bg-blue-50"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                      onClick={() => { setCustomerId(''); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                    >
                      Walk-in customer
                    </button>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                        onClick={() => { setCustomerId(String(c.id)); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                      >
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

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

            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleCreate}
              loading={createInvoice.isPending}
              disabled={lineItems.length === 0 || !dueDate}
            >
              <FileText className="w-5 h-5 mr-2" />
              Create Invoice
            </Button>
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
            updateQuantity(qtyEdit.productId, qty);
            setQtyEdit(null);
          }}
        />
      )}
    </>
  );
}
