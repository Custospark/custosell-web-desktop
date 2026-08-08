import { Plus, Minus, Trash } from 'lucide-react';
import type { CartItem } from '../api/salesTypes';
import type { Product } from '../../inventory/api/products/ProductTypes';
import { tracksStock, SERVICE_QTY_SOFT_CAP } from '../../inventory/api/products/ProductTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

interface SaleCartTableProps {
  items: CartItem[];
  products?: Product[];
  onEditQty: (item: CartItem, product: Product | undefined) => void;
  onTierChange: (item: CartItem, tier: 'retail' | 'wholesale') => void;
  onDiscountChange: (item: CartItem, amount: number) => void;
  onRemove: (item: CartItem) => void;
  onDecreaseQty: (item: CartItem) => void;
  onIncreaseQty: (item: CartItem) => void;
}

function lineSubtotal(item: CartItem): number {
  return Math.max(0, item.unit_price * item.quantity - item.discount_amount);
}

export function SaleCartTable({
  items,
  products,
  onEditQty,
  onTierChange,
  onDiscountChange,
  onRemove,
  onDecreaseQty,
  onIncreaseQty,
}: SaleCartTableProps) {
  const subtotal = items.reduce((s, c) => s + lineSubtotal(c), 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Line discount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item, idx) => {
              const product = products?.find((p) => p.id === item.product_id);
              const maxStock = product && tracksStock(product) ? product.stock_quantity : SERVICE_QTY_SOFT_CAP;
              const atMax = item.quantity >= maxStock;
              const canWholesale = item._wholesale_price != null;
              return (
                <tr key={`${item.product_id}-${item.price_tier}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800 truncate block max-w-[150px] sm:max-w-none">{item.name}</span>
                    {canWholesale && (
                      <div className="mt-1 inline-flex rounded-md border border-gray-200 overflow-hidden">
                        {(['retail', 'wholesale'] as const).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            title={tier === 'wholesale' ? 'Charge this line at wholesale price' : 'Charge this line at retail price'}
                            onClick={() => onTierChange(item, tier)}
                            className={`px-2 py-0.5 text-[11px] font-semibold capitalize transition-colors ${
                              item.price_tier === tier ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="hidden sm:inline text-sm text-gray-600">{formatCurrency(item.unit_price)}{item.unit ? ` / ${item.unit}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <input
                      title={`Line discount for ${item.name}`}
                      type="number"
                      min={0}
                      step="any"
                      className="w-24 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums text-right py-1 px-2"
                      value={item.discount_amount || ''}
                      placeholder="0"
                      onChange={(e) => onDiscountChange(item, parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button title="Decrease quantity"
                        onClick={() => onDecreaseQty(item)}
                        className="w-8 h-8 rounded-full border-2 border-red-400 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span title="Click to edit quantity" className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => onEditQty(item, product)}>
                        {item.quantity}
                      </span>
                      <button title={atMax && product && tracksStock(product) ? `Only ${maxStock} in stock` : 'Increase quantity'}
                        onClick={() => onIncreaseQty(item)}
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${
                          atMax
                            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                            : 'border-green-400 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(lineSubtotal(item))}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button title="Remove item"
                      onClick={() => onRemove(item)}
                      className="w-8 h-8 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-900">Subtotal:</td>
              <td className="px-4 py-3 text-right">
                <span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default SaleCartTable;