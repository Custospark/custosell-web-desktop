import { useState, useMemo, useRef, useEffect } from 'react';
import { useProducts } from '../../../inventory/api/products/ProductQueries';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart } from '../../api/salesSlice';
import { Search, Plus, Minus, Trash, ShoppingCart, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Button } from '../../../../shared/components/buttons/Button';

interface Props {
  onProceed: () => void;
  cartCount: number;
  subtotal: number;
}

export default function ChargeEntry({ onProceed, cartCount, subtotal }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const { data: products } = useProducts();
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) && p.is_active).slice(0, 10);
  }, [products, search]);

  const addItem = (id: number, name: string, price: number) => {
    dispatch(addToCart({ product_id: id, name, unit_price: price }));
    setSearch('');
    setShowResults(false);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Search + Cart Items */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input ref={searchRef}
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)} />
        </div>

        {/* Search Results Dropdown */}
        {showResults && search && results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg mb-4 overflow-hidden">
            {results.map((p) => (
              <button key={p.id} type="button"
                onMouseDown={() => addItem(p.id, p.name, parseFloat(p.unit_price))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">Stock: {p.stock_quantity}</p>
                </div>
                <p className="text-sm font-semibold text-blue-600">{formatCurrency(p.unit_price)}</p>
                <Plus className="w-4 h-4 text-blue-500" />
              </button>
            ))}
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No items added</p>
              <p className="text-xs mt-1">Search and select products</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1.5 py-1">
                  <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))}
                    className="p-0.5 rounded hover:bg-gray-200 text-gray-500"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))}
                    className="p-0.5 rounded hover:bg-gray-200 text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-sm font-bold text-gray-900 w-20 text-right">{formatCurrency(item.unit_price * item.quantity)}</p>
                <button onClick={() => dispatch(removeFromCart(item.product_id))} className="p-1 text-gray-300 hover:text-red-500">
                  <Trash className="w-3.5 h-3.5" /></button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Summary + Proceed */}
      <div className="w-72 flex flex-col bg-white rounded-xl border border-gray-200 self-start">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Cart</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cartCount}</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            {cartItems.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate mr-2">{item.name} × {item.quantity}</span>
                <span className="font-medium text-gray-900 whitespace-nowrap">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-100 pt-3">
            <span>Total</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <Button className="w-full" onClick={onProceed} disabled={cartItems.length === 0}>
            Proceed <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
