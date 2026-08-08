import { Link } from "react-router-dom";
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../../inventory/api/products/ProductQueries';
import { isSellable, isServiceItem, SERVICE_QTY_SOFT_CAP, tracksStock } from '../../inventory/api/products/ProductTypes';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { addToCart, updateQuantity, removeFromCart, clearCart, setCustomer, setDiscount, setLineTier, setLineDiscount, setAllLinesWholesale, setAllLinesRetail } from '../api/salesSlice';
import { useOpenOrders } from '../api/orders/useOrderQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Search, Plus, ShoppingCart, X, RotateCcw, PauseCircle, FileText, Save, ListOrdered } from 'lucide-react';
import { ProductSearchThumb } from './ProductSearchThumb';
import HeldOrdersModal from './HeldOrdersModal';
import HoldOrderModal from './HoldOrderModal';
import UpdateOrderModal from './UpdateOrderModal';
import QuantityEditModal from './QuantityEditModal';
import InvoiceFromSaleModal from './InvoiceFromSaleModal';
import { ProductSearchEmptyState, inventorySnapshot, RELOAD_SUCCESS_MS, type ReloadFeedback } from './ProductSearchEmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { findProductByBarcode, matchesProductSearch } from '../../../shared/utils/productSearch';
import CartSummaryBar from './CartSummaryBar';
import { SaleCartTable } from './SaleCartTable';

interface SaleItemsStepProps {
  onNext: () => void;
}

export function SaleItemsStep({ onNext }: SaleItemsStepProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const activeOrderId = useAppSelector((s) => s.sales.activeOrderId);
  const activeOrderMode = useAppSelector((s) => s.sales.activeOrderMode);
  const { data: openOrders = [] } = useOpenOrders(true, { poll: true });
  const { data: products, refetch: refetchProducts, isFetching: isProductsFetching } = useProducts();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [qtyEdit, setQtyEdit] = useState<{ productId: number; productName: string; currentQty: number; maxQty: number; tier?: 'retail' | 'wholesale' } | null>(null);
  const [reloadFeedback, setReloadFeedback] = useState<ReloadFeedback>('idle');
  const reloadFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReloadFeedback = useCallback(() => {
    if (reloadFeedbackTimerRef.current) {
      clearTimeout(reloadFeedbackTimerRef.current);
      reloadFeedbackTimerRef.current = null;
    }
    setReloadFeedback('idle');
  }, []);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSession, setInvoiceSession] = useState(0);
  const showReloadFeedback = useCallback((feedback: Exclude<ReloadFeedback, 'idle'>) => {
    setReloadFeedback(feedback);
    if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
    reloadFeedbackTimerRef.current = setTimeout(() => {
      setReloadFeedback('idle');
      reloadFeedbackTimerRef.current = null;
    }, RELOAD_SUCCESS_MS);
  }, []);

  const handleReloadProducts = useCallback(async () => {
    try {
      const snapshotBefore = inventorySnapshot(products);
      const result = await refetchProducts();
      if (result.isError) return;

      const snapshotAfter = inventorySnapshot(result.data);
      showReloadFeedback(snapshotBefore === snapshotAfter ? 'upToDate' : 'updated');
    } catch (err) {
      console.warn('[NewSale] Product reload failed:', err);
    }
  }, [products, refetchProducts, showReloadFeedback]);

  const subtotal = cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  const results = useMemo(() => {
    if (!products || !search.trim()) return [];
    return products
      .filter((p) => p.is_active && matchesProductSearch(p, search))
      .slice(0, 8);
  }, [products, search]);

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

  const addItem = useCallback((
    id: number,
    name: string,
    price: number,
    unit?: string | null,
    taxPercentage?: string | null,
    taxClass?: string | null,
    wholesale?: number | null,
    tier?: 'retail' | 'wholesale',
  ) => {
    dispatch(addToCart({
      product_id: id,
      name,
      unit_price: price,
      wholesale_price: wholesale,
      unit,
      tax_percentage: taxPercentage,
      tax_class: taxClass,
      price_tier: tier,
    }));
    setSearch('');
    setShowResults(false);
    searchRef.current?.focus();
  }, [dispatch]);

  /** Scanner / typed barcode — add as soon as the code fully matches a product. */
  useEffect(() => {
    if (!products || !search.trim()) return;
    const match = findProductByBarcode(products, search);
    if (!match || !isSellable(match)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- barcode scanner adds product on scan
    addItem(
      match.id,
      match.name,
      parseFloat(match.unit_price),
      match.unit,
      match.tax_percentage,
      match.tax_class,
      match.wholesale_price != null ? parseFloat(match.wholesale_price) : null,
      undefined,
    );
  }, [search, products, addItem]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => () => {
    if (reloadFeedbackTimerRef.current) clearTimeout(reloadFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset reload banner when search changes
    clearReloadFeedback();
  }, [search, clearReloadFeedback]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Animated Search Bar */}
        <div ref={wrapRef} className="relative mb-3">
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
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
              <input ref={searchRef} type="text" placeholder="Search by name, SKU, or barcode..." title="Search products"
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
                        isSellable(p)
                        && (p.name.toLowerCase() === q || (p.sku && p.sku.toLowerCase() === q)),
                      );
                    if (exact) {
                      addItem(exact.id, exact.name, parseFloat(exact.unit_price), exact.unit, exact.tax_percentage, exact.tax_class, exact.wholesale_price != null ? parseFloat(exact.wholesale_price) : null, undefined);
                    } else if (results.length > 0 && isSellable(results[0])) {
                      addItem(results[0].id, results[0].name, parseFloat(results[0].unit_price), results[0].unit, results[0].tax_percentage, results[0].tax_class, results[0].wholesale_price != null ? parseFloat(results[0].wholesale_price) : null, undefined);
                    }
                  }
                }}
                className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]" />
              {search && (
                <button title="Clear search" onClick={() => { setSearch(''); setShowResults(false); searchRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && search && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute z-[5] w-full mt-1.5">
                <div className="relative rounded-xl p-[2px]">
                  <motion.div className="absolute inset-0 rounded-xl z-0"
                    style={{ background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)', backgroundSize: '300% 100%' }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                  <div className="relative z-10 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-72 overflow-y-auto">
                    {results.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Stock</th>
                            <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-3 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">+</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {results.map((p) => (
                            <tr key={p.id} title={`Add ${p.name} to cart`} className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onMouseDown={() => isSellable(p) && addItem(p.id, p.name, parseFloat(p.unit_price), p.unit, p.tax_percentage, p.tax_class, p.wholesale_price != null ? parseFloat(p.wholesale_price) : null, undefined)}>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                <ProductSearchThumb
                                  name={p.name}
                                  imagePath={p.image_path}
                                  isService={isServiceItem(p)}
                                />
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 hidden sm:table-cell">
                                {isServiceItem(p) ? (
                                  <span className="text-xs text-blue-600">Service</span>
                                ) : (
                                  <span className={`text-xs ${p.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                                <span className="text-sm font-semibold text-blue-600">{formatCurrency(p.unit_price)}</span>
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                                <div className="p-1 sm:p-1.5 rounded-full bg-green-50 text-green-600 inline-flex hover:bg-green-100 transition-colors">
                                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <ProductSearchEmptyState
                        searchQuery={search.trim()}
                        isReloading={isProductsFetching}
                        reloadFeedback={reloadFeedback}
                        onReload={handleReloadProducts}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {activeOrderMode === 'update' && activeOrderId ? (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span>
              Updating open order — use <strong>Update Order</strong> to save. Hold creates a new order instead.
            </span>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-blue-700 underline"
              onClick={() => dispatch(clearCart())}
            >
              Cancel update
            </button>
          </div>
        ) : null}

        {/* Cart Items Header */}
        {cartItems.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cart ({cartItems.length} {cartItems.length > 1 ? 'items' : 'item'})
              </span>
              <div className="hidden sm:flex rounded-md border border-gray-200 overflow-hidden shrink-0">
                <button title="Charge all lines at retail price" onClick={() => dispatch(setAllLinesRetail())}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors">Retail all</button>
                <button title="Charge all lines at wholesale price" onClick={() => dispatch(setAllLinesWholesale())}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors">Wholesale all</button>
              </div>
            </div>
            <button title="Remove all items from cart" onClick={handleClearAll} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors shrink-0">
              <RotateCcw className="w-4 h-4" /> Clear All
            </button>
          </div>
        )}

        {/* Cart Items Tablet */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No items added</p>
              <p className="text-xs mt-1">Search and select products above</p>
            </div>
          ) : (
            <SaleCartTable
              items={cartItems}
              products={products}
              onEditQty={(item) => {
                const p = products?.find((x) => x.id === item.product_id);
                setQtyEdit({ productId: item.product_id, productName: item.name, currentQty: item.quantity, maxQty: p && tracksStock(p) ? p.stock_quantity : SERVICE_QTY_SOFT_CAP, tier: item.price_tier });
              }}
              onTierChange={(item, tier) => dispatch(setLineTier({ product_id: item.product_id, tier }))}
              onDiscountChange={(item, amount) => dispatch(setLineDiscount({ product_id: item.product_id, discountAmount: amount }))}
              onDecreaseQty={(item) => dispatch(updateQuantity({ product_id: item.product_id, tier: item.price_tier, quantity: item.quantity - 1 }))}
              onIncreaseQty={(item) => {
                const p = products?.find((x) => x.id === item.product_id);
                const maxStock = p && tracksStock(p) ? p.stock_quantity : SERVICE_QTY_SOFT_CAP;
                if (item.quantity < maxStock) dispatch(updateQuantity({ product_id: item.product_id, tier: item.price_tier, quantity: item.quantity + 1 }));
              }}
              onRemove={(item) => dispatch(removeFromCart({ product_id: item.product_id, tier: item.price_tier }))}
            />
          )}
        </div>

        {/* Secondary action toolbar */}
        <div className="flex items-center gap-3 overflow-x-auto overscroll-x-contain -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2 pt-3 mt-auto w-max min-w-full">
          {cartItems.length > 0 && (
            <button
              title="Create a draft invoice from the current cart — adjust items before saving"
              onClick={() => {
                setInvoiceSession((s) => s + 1);
                setInvoiceModalOpen(true);
              }}
              className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 border-2 border-blue-300 rounded-xl hover:bg-blue-100 hover:border-blue-400 transition-all shadow-sm whitespace-nowrap"
            >
              <FileText className="w-4 h-4" /> Generate Invoice
            </button>
          )}
          <Link to="/invoices" title="View and manage all invoices"
            className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border-2 border-gray-400 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all shadow-sm whitespace-nowrap">
            <FileText className="w-4 h-4" /> Manage Invoices
          </Link>
          <Link to={ROUTES.SALES.ORDERS} title="View and manage all orders"
            className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-800 bg-indigo-50 border-2 border-indigo-300 rounded-xl hover:bg-indigo-100 hover:border-indigo-400 transition-all shadow-sm whitespace-nowrap">
            <ListOrdered className="w-4 h-4" /> Manage Orders
          </Link>
          {cartItems.length > 0 && activeOrderMode === 'update' && (
            <button
              title="Save changes to this open order"
              onClick={() => setUpdateModalOpen(true)}
              className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-blue-800 bg-blue-50 border-2 border-blue-400 rounded-xl hover:bg-blue-100 hover:border-blue-500 transition-all shadow-sm whitespace-nowrap"
            >
              <Save className="w-4 h-4" /> Update Order
            </button>
          )}
          {cartItems.length > 0 && (
            <button
              title="Hold this cart as a new open order"
              onClick={() => setHoldModalOpen(true)}
              className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-amber-700 bg-amber-50 border-2 border-amber-400 rounded-xl hover:bg-amber-100 hover:border-amber-500 transition-all shadow-sm whitespace-nowrap"
            >
              <PauseCircle className="w-4 h-4" /> Hold Order
            </button>
          )}
          <button title="View and resume held orders" onClick={() => setHeldModalOpen(true)}
            className="relative flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border-2 border-gray-400 rounded-xl hover:bg-gray-50 hover:border-gray-500 transition-all shadow-sm whitespace-nowrap">
            <RotateCcw className="w-4 h-4" /> Take Order
            {openOrders.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white">
                {openOrders.length > 99 ? '99+' : openOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Sticky bottom: running total + Continue */}
        <CartSummaryBar count={cartItems.length} subtotal={subtotal} onNext={onNext} />
      </div>

      <HeldOrdersModal open={heldModalOpen} onClose={() => setHeldModalOpen(false)} />
      <HoldOrderModal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} />
      <UpdateOrderModal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
      <InvoiceFromSaleModal
        key={invoiceSession}
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={() => {
          dispatch(clearCart());
          dispatch(setCustomer(null));
          dispatch(setDiscount(0));
        }}
      />
      {qtyEdit && (
        <QuantityEditModal
          open={!!qtyEdit}
          onClose={() => setQtyEdit(null)}
          productId={qtyEdit.productId}
          productName={qtyEdit.productName}
          currentQty={qtyEdit.currentQty}
          maxQty={qtyEdit.maxQty}
          tier={qtyEdit.tier}
        />
      )}
    </>
  );
}

export default SaleItemsStep;