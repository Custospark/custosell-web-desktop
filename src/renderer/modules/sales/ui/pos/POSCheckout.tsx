import { useState, useMemo, useRef, useEffect } from 'react';
import { useProducts } from '../../../inventory/api/products/ProductQueries';
import { useCustomers, useCreateSale } from '../../api/salesQueries';
import type { CartItem } from '../../api/salesTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Search, Plus, Minus, Trash, ShoppingCart, User } from 'lucide-react';
import ReceiptPreview from '../receipt/ReceiptPreview';

export default function POSCheckout() {
  const { data: products } = useProducts();
  const createSale = useCreateSale();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'other'>('cash');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState<{ receiptNumber: string; items: CartItem[]; total: number; paymentMethod: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customers } = useCustomers();

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) && p.is_active).slice(0, 20);
  }, [products, search]);

  const addToCart = (productId: number, name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === productId);
      if (existing) return prev.map((c) => c.product_id === productId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product_id: productId, name, unit_price: price, quantity: 1, discount_amount: 0 }];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) { setCart((prev) => prev.filter((c) => c.product_id !== productId)); return; }
    setCart((prev) => prev.map((c) => c.product_id === productId ? { ...c, quantity: qty } : c));
  };

  const { subtotal, total } = useMemo(() => {
    const s = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
    return { subtotal: s, total: s };
  }, [cart]);

  const selectedCustomer = customers?.find((c: any) => c.id === customerId);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const items = cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price }));
    createSale.mutate(
      { items, subtotal, total_amount: total, payment_method: paymentMethod, customer_id: customerId || null },
      {
        onSuccess: (sale) => {
          setShowReceipt({
            receiptNumber: sale.receipt_number,
            items: [...cart],
            total,
            paymentMethod,
          });
          setCart([]);
          setCustomerId(null);
        },
      },
    );
  };

  if (showReceipt) {
    return (
      <ReceiptPreview
        receiptNumber={showReceipt.receiptNumber}
        items={showReceipt.items}
        total={showReceipt.total}
        paymentMethod={showReceipt.paymentMethod}
        onClose={() => setShowReceipt(null)}
        onNewSale={() => { setShowReceipt(null); searchRef.current?.focus(); }}
      />
    );
  }

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const btnCls = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeBtn = "bg-blue-600 text-white";
  const inactiveBtn = "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input ref={searchRef} className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
            placeholder="Search products by name..." value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredProducts.length > 0) {
                addToCart(filteredProducts[0].id, filteredProducts[0].name, parseFloat(filteredProducts[0].unit_price));
                setSearch('');
              }
            }} />
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          {filteredProducts.map((p) => (
            <button key={p.id} type="button" onClick={() => { addToCart(p.id, p.name, parseFloat(p.unit_price)); setSearch(''); }}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group">
              <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
              <p className="text-blue-600 font-bold mt-1">{formatCurrency(p.unit_price)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Stock: {p.stock_quantity}</p>
            </button>
          ))}
          {filteredProducts.length === 0 && search && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">No products found</div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 flex flex-col bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Cart</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cart.length}</span>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {cart.map((item) => (
            <div key={item.product_id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} ea</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product_id, item.quantity - 1)} className="p-1 rounded hover:bg-gray-200 text-gray-500"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => updateQty(item.product_id, item.quantity + 1)} className="p-1 rounded hover:bg-gray-200 text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-sm font-semibold text-gray-900 w-20 text-right">{formatCurrency(item.unit_price * item.quantity)}</p>
              <button onClick={() => setCart((prev) => prev.filter((c) => c.product_id !== item.product_id))} className="p-1 text-gray-300 hover:text-red-500"><Trash className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <ShoppingCart className="w-10 h-10 mb-2" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Search and select products</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {/* Customer */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer text-sm"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}>
              <User className="w-4 h-4 text-gray-400" />
              <span className={selectedCustomer ? 'text-gray-800' : 'text-gray-400'}>
                {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
              </span>
            </div>
            {showCustomerDropdown && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                <input className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none" placeholder="Search..."
                  value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()} />
                <button className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                  onClick={() => { setCustomerId(null); setShowCustomerDropdown(false); }}>Walk-in customer</button>
                {filteredCustomers.map((c: any) => (
                  <button key={c.id} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}>
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="flex gap-1.5">
            {(['cash', 'mobile_money', 'card', 'other'] as const).map((m) => (
              <button key={m} className={`${btnCls} flex-1 text-xs ${paymentMethod === m ? activeBtn : inactiveBtn}`}
                onClick={() => setPaymentMethod(m)}>
                {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'Mobile' : m === 'card' ? 'Card' : 'Other'}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Button className="w-full h-11 text-base" onClick={handleCheckout} loading={createSale.isPending} disabled={cart.length === 0}>
            Complete Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
