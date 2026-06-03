import { useState, useMemo, useRef, useEffect } from 'react';
import { useProducts } from '../../../inventory/api/products/ProductQueries';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart } from '../../api/salesSlice';
import { Search, Plus, Minus, Trash, ShoppingCart, ArrowRight, X, Package, RotateCcw } from 'lucide-react';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Button } from '../../../../shared/components/buttons/Button';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Props {
  onProceed: () => void;
  cartCount: number;
  subtotal: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChargeEntry({ onProceed, cartCount, subtotal }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const { data: products } = useProducts();
  const { confirm } = useConfirm();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // ==========================================================================
  // REFS
  // ==========================================================================

  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

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

  const addItem = (id: number, name: string, price: number) => {
    dispatch(addToCart({ product_id: id, name, unit_price: price }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  };

  // ==========================================================================
  // MEMOIZED VALUES
  // ==========================================================================

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];

    const q = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) && p.is_active)
      .slice(0, 8);
  }, [products, search]);

  // ==========================================================================
  // SIDE EFFECTS
  // ==========================================================================

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

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex gap-6 h-full">
      {/* --------------------------------------------------------------------
        LEFT COLUMN: Search + Cart Table
      -------------------------------------------------------------------- */}
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
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  isFocused ? 'text-blue-500' : 'text-gray-400'
                }`}
              />

              <input
                ref={searchRef}
                type="text"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  if (search.trim()) setShowResults(true);
                }}
                onBlur={() => setIsFocused(false)}
                className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]"
              />

              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setShowResults(false);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && search && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute z-20 w-full mt-1.5"
              >
                <div className="relative rounded-xl p-[2px]">
                  <motion.div
                    className="absolute inset-0 rounded-xl z-0"
                    style={{
                      background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1, #3b82f6)',
                      backgroundSize: '300% 100%',
                    }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />

                  <div className="relative z-10 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-72 overflow-y-auto">
                    {results.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {results.map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onMouseDown={() => addItem(p.id, p.name, parseFloat(p.unit_price))}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                                </div>
                               </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs ${p.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                                </span>
                               </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-semibold text-blue-600">
                                  {formatCurrency(p.unit_price)}
                                </span>
                               </td>
                              <td className="px-4 py-3 text-center">
                                <div className="p-1.5 rounded-full bg-green-50 text-green-600 inline-flex hover:bg-green-100 transition-colors">
                                  <Plus className="w-4 h-4" />
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

        {/* Cart Items Header with Clear Button */}
        {cartItems.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cart Items ({cartItems.length} {cartItems.length > 1 ? 'items' : 'item'})
            </span>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}

        {/* Cart Items Table */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No items added</p>
              <p className="text-xs mt-1">Search and select products above</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                {/* Cart Table Header */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      Action
                    </th>
                  </tr>
                </thead>

                {/* Cart Table Body */}
                <tbody className="bg-white divide-y divide-gray-100">
                  {cartItems.map((item, idx) => (
                    <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                      {/* Index */}
                      <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>

                      {/* Product Name */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600">{formatCurrency(item.unit_price)}</span>
                      </td>

                      {/* Quantity Controls */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))
                            }
                            className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-gray-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              dispatch(updateQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))
                            }
                            className="p-1 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </td>

                      {/* Remove Button */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => dispatch(removeFromCart(item.product_id))}
                          className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer with Total */}
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
        RIGHT COLUMN: Summary / Cart Total
      -------------------------------------------------------------------- */}
      <div className="w-80 flex flex-col bg-white rounded-xl border border-gray-200 self-start sticky top-0">
        {/* Summary Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Order Summary</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cartCount}</span>
          </div>
        </div>

        {/* Summary Content */}
        <div className="p-5 space-y-4">
          {/* Items List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate mr-2">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-gray-900 whitespace-nowrap">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          {cartItems.length > 0 && <div className="border-t border-gray-100" />}

          {/* Total */}
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total Amount</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Proceed Button */}
          <Button className="w-full" onClick={onProceed} disabled={cartItems.length === 0}>
            Proceed to Checkout <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}