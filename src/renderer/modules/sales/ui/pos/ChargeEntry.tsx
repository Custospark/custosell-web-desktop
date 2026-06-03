import { useState, useMemo, useRef, useEffect } from 'react';
import { useProducts } from '../../../inventory/api/products/ProductQueries';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart } from '../../api/salesSlice';
import { Search, Plus, Minus, Trash, ShoppingCart, ArrowRight, X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) && p.is_active).slice(0, 8);
  }, [products, search]);

  const addItem = (id: number, name: string, price: number) => {
    dispatch(addToCart({ product_id: id, name, unit_price: price }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Search + Cart Items */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Animated Search Bar */}
        <div ref={wrapRef} className="relative mb-4">
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
              <input ref={searchRef}
                type="text"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                onFocus={() => { setIsFocused(true); if (search.trim()) setShowResults(true); }}
                onBlur={() => setIsFocused(false)}
                className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]" />
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
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute z-20 w-full mt-1.5">
                <div className="relative rounded-xl p-[2px]">
                  <motion.div className="absolute inset-0 rounded-xl z-0"
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1, #3b82f6)', backgroundSize: '300% 100%' }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                  <div className="relative z-10 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-72 overflow-y-auto">
                    {results.length > 0 ? results.map((p) => (
                      <button key={p.id} type="button" onMouseDown={() => addItem(p.id, p.name, parseFloat(p.unit_price))}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0">
                        <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">
                            {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(p.unit_price)}</p>
                        <div className="p-1.5 rounded-full bg-blue-50 text-blue-600">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    )) : (
                      <div className="p-6 text-center text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No items added</p>
              <p className="text-xs mt-1">Search and select products above</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
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

      {/* Right: Summary */}
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
