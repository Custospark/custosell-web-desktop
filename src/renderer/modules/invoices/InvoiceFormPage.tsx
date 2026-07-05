import { useState, useMemo } from 'react';
import { useCustomers } from '../customers/api/customers/CustomerQueries';
import { useProducts } from '../inventory/api/products/ProductQueries';
import { useCreateInvoice } from './api/InvoiceQueries';
import { Button } from '../../shared/components/buttons/Button';
import { Input } from '../../shared/components/inputs/Input';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';

interface InvoiceFormPageProps {
  onClose: () => void;
}

interface InvoiceItemEntry {
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function InvoiceFormPage({ onClose }: InvoiceFormPageProps) {
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const createInvoice = useCreateInvoice();

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItemEntry[]>([
    { product_id: null, description: '', quantity: 1, unit_price: 0, subtotal: 0 },
  ]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [showProductDropdown, setShowProductDropdown] = useState<Record<number, boolean>>({});

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => {
      const name = (c.name ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = customerId ? (customers ?? []).find((c: any) => c.id === customerId) : null;

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);

  function updateItem(index: number, field: keyof InvoiceItemEntry, value: unknown) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const product = products.find((p: any) => p.id === value);
          if (product) {
            updated.description = product.name;
            updated.unit_price = parseFloat(product.unit_price) || 0;
          }
        }
        if (field === 'quantity' || field === 'unit_price') {
          updated.subtotal = updated.quantity * updated.unit_price;
        }
        return updated;
      }),
    );
  }

  function addItem() {
    setItems([...items, { product_id: null, description: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || items.every((item) => !item.description)) return;

    createInvoice.mutate(
      {
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        items: items.map((item) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        })),
        notes: notes || undefined,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Customer</label>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors bg-white text-left"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              >
                <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedCustomer ? (selectedCustomer as any).name : 'Select a customer (optional)'}
                </span>
              </button>
              {showCustomerDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
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
                    onClick={() => { setCustomerId(null); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                  >
                    No customer (walk-in)
                  </button>
                  {filteredCustomers.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                    >
                      <span className="font-medium text-gray-800">{c.name}</span>
                      <span className="text-gray-400 ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Invoice Items</label>
              <Button size="sm" variant="outline" type="button" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" />Add Item
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {items.map((item, idx) => {
                const filteredProducts = products.filter((p: any) => {
                  if (!productSearch[idx]) return true;
                  const q = productSearch[idx].toLowerCase();
                  return p.name.toLowerCase().includes(q);
                });

                return (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                      {/* Product selector */}
                      <div className="sm:col-span-5 relative">
                        <label className="text-xs text-gray-500 mb-1 block">Product</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search product..."
                            value={productSearch[idx] ?? ''}
                            onChange={(e) => setProductSearch((prev) => ({ ...prev, [idx]: e.target.value }))}
                            onFocus={() => setShowProductDropdown((prev) => ({ ...prev, [idx]: true }))}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {showProductDropdown[idx] && (
                            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.slice(0, 10).map((p: any) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
                                    onClick={() => {
                                      updateItem(idx, 'product_id', p.id);
                                      setProductSearch((prev) => ({ ...prev, [idx]: p.name }));
                                      setShowProductDropdown((prev) => ({ ...prev, [idx]: false }));
                                    }}
                                  >
                                    <span className="font-medium text-gray-800 truncate">{p.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{formatCurrency(p.unit_price)}</span>
                                  </button>
                                ))
                              ) : (
                                <p className="px-3 py-2 text-sm text-gray-400">No products found</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-1">
                        <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Unit Price</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="sm:col-span-1 text-right">
                        <label className="text-xs text-gray-500 mb-1 block">Total</label>
                        <p className="py-2 text-sm font-semibold text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</p>
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end text-sm font-semibold text-gray-900 pt-2">
              Subtotal: {formatCurrency(subtotal)}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes for the customer..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={items.length === 0 || !dueDate || items.every((i) => !i.description)} loading={createInvoice.isPending}>
              Create Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
