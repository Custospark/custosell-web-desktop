import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../shared/utils/cn';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { matchesProductSearch, findProductByBarcode } from '../../shared/utils/productSearch';
import type { Product } from '../inventory/api/products/ProductTypes';

export interface InvoiceProductPick {
  id: number;
  name: string;
  unit_price: string | number;
  unit?: string | null;
  tax_percentage?: string | null;
  tax_class?: string | null;
}

interface InvoiceProductSearchProps {
  products?: Product[];
  /** Focus the input on mount (create/page layouts). */
  autoFocus?: boolean;
  onAdd: (product: InvoiceProductPick) => void;
}

/** Animated gradient product search with instant results — New Sale style. */
export function InvoiceProductSearch({ products, autoFocus, onAdd }: InvoiceProductSearchProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    return products.filter((p) => p.is_active && matchesProductSearch(p, search)).slice(0, 8);
  }, [products, search]);

  const pick = useCallback((p: Product) => {
    onAdd({
      id: p.id,
      name: p.name,
      unit_price: p.unit_price,
      unit: p.unit,
      tax_percentage: p.tax_percentage,
      tax_class: p.tax_class,
    });
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  }, [onAdd]);

  /** Scanner / typed barcode — add as soon as the code fully matches a product. */
  useEffect(() => {
    if (!products || !search.trim()) return;
    const match = findProductByBarcode(products, search);
    if (!match || !match.is_active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- barcode scanner adds product on scan
    pick(match);
  }, [search, products, pick]);

  useEffect(() => {
    if (autoFocus) searchRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnter = () => {
    if (!products) return;
    const q = search.trim().toLowerCase();
    const barcodeMatch = findProductByBarcode(products, search);
    const exact = barcodeMatch
      ?? products.find((p) =>
        p.is_active && (p.name.toLowerCase() === q || (p.sku && p.sku.toLowerCase() === q)),
      );
    if (exact) {
      pick(exact);
    } else if (results.length > 0) {
      pick(results[0]);
    }
  };

  return (
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
        <div className="relative rounded-[6px] overflow-hidden bg-white">
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
              if (e.key === 'Enter') handleEnter();
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
            className="absolute z-[5] w-full mt-1.5"
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
                        onMouseDown={() => pick(p)}
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
  );
}
