import { Plus, Minus, Trash } from 'lucide-react';
import type { CartItem } from '../api/salesTypes';
import type { Product } from '../../inventory/api/products/ProductTypes';
import { tracksStock, SERVICE_QTY_SOFT_CAP } from '../../inventory/api/products/ProductTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { MoneyInput } from '../../../shared/components/inputs/MoneyInput';

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

/** Retail ↕ Wholesale picker for a single cart line (hidden when no wholesale price). */
function TierPicker({ item, onTierChange }: { item: CartItem; onTierChange: SaleCartTableProps['onTierChange'] }) {
  if (item._wholesale_price == null) return null;
  return (
    <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
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
  );
}

/** Per-line discount input, shared by the desktop table and mobile card. */
function LineDiscountInput({ item, onDiscountChange, fluid = false }: { item: CartItem; onDiscountChange: SaleCartTableProps['onDiscountChange']; fluid?: boolean }) {
  return (
    <div className={fluid ? 'flex-1 min-w-0' : 'w-24'}>
      <MoneyInput
        title={`Line discount for ${item.name}`}
        value={item.discount_amount}
        placeholder="0"
        min={0}
        onValueChange={(amount) => onDiscountChange(item, amount)}
      />
    </div>
  );
}

/** Quantity stepper: − qty +, tapping the count opens the edit modal. */
function QtyStepper(
  item: CartItem,
  product: Product | undefined,
  onEditQty: SaleCartTableProps['onEditQty'],
  onDecreaseQty: SaleCartTableProps['onDecreaseQty'],
  onIncreaseQty: SaleCartTableProps['onIncreaseQty'],
) {
  const maxStock = product && tracksStock(product) ? product.stock_quantity : SERVICE_QTY_SOFT_CAP;
  const atMax = item.quantity >= maxStock;
  return (
    <div className="flex items-center justify-center gap-2">
      <button title="Decrease quantity" type="button" onClick={() => onDecreaseQty(item)}
        className="w-8 h-8 rounded-full border-2 border-red-400 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center">
        <Minus className="w-4 h-4" />
      </button>
      <span title="Click to edit quantity"
        className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums cursor-pointer hover:text-blue-600 transition-colors"
        onClick={() => onEditQty(item, product)}>
        {item.quantity}
      </span>
      <button title={atMax ? `Only ${maxStock} in stock` : 'Increase quantity'} type="button"
        onClick={() => onIncreaseQty(item)}
        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${
          atMax ? 'border-gray-300 text-gray-400 cursor-not-allowed'
            : 'border-green-400 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700'
        }`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Desktop/tablet cart table — hidden on small screens (mobile cards take over). */
export function SaleCartDesktopTable({
  items, products, onEditQty, onTierChange, onDiscountChange, onRemove, onDecreaseQty, onIncreaseQty,
}: SaleCartTableProps) {
  const subtotal = items.reduce((s, c) => s + lineSubtotal(c), 0);
  return (
    <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Line discount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item, idx) => {
              const product = products?.find((p) => p.id === item.product_id);
              return (
                <tr key={`${item.product_id}-${item.price_tier}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800 truncate block max-w-[150px] sm:max-w-none">{item.name}</span>
                    <div className="mt-1"><TierPicker item={item} onTierChange={onTierChange} /></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-600 whitespace-nowrap">{formatCurrency(item.unit_price)}{item.unit ? ` / ${item.unit}` : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <LineDiscountInput item={item} onDiscountChange={onDiscountChange} />
                  </td>
                  <td className="px-4 py-3">
                    {QtyStepper(item, product, onEditQty, onDecreaseQty, onIncreaseQty)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(lineSubtotal(item))}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button title="Remove item" type="button" onClick={() => onRemove(item)}
                      className="w-8 h-8 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center">
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
              <td className="px-4 py-3 text-right"><span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/** Mobile-only cart cards — every control (incl. per-line discount) stays reachable on phones. */
function SaleCartMobileCards({
  items, products, onEditQty, onTierChange, onDiscountChange, onRemove, onDecreaseQty, onIncreaseQty,
}: SaleCartTableProps) {
  const subtotal = items.reduce((s, c) => s + lineSubtotal(c), 0);
  return (
    <div className="sm:hidden space-y-2">
      {items.map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        return (
          <div key={`${item.product_id}-${item.price_tier}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                <div className="mt-1"><TierPicker item={item} onTierChange={onTierChange} /></div>
              </div>
              <button title="Remove item" type="button" onClick={() => onRemove(item)}
                className="w-8 h-8 shrink-0 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 transition-all flex items-center justify-center">
                <Trash className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 truncate min-w-0">{formatCurrency(item.unit_price)}{item.unit ? ` / ${item.unit}` : ''}</span>
              <span className="shrink-0">{QtyStepper(item, product, onEditQty, onDecreaseQty, onIncreaseQty)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Subtotal</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(lineSubtotal(item))}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 shrink-0">Line discount</label>
              <LineDiscountInput fluid item={item} onDiscountChange={onDiscountChange} />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
        <span className="text-sm font-semibold text-gray-700">Subtotal</span>
        <span className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
    </div>
  );
}

export function SaleCartTable(props: SaleCartTableProps) {
  return (
    <>
      <SaleCartDesktopTable {...props} />
      <SaleCartMobileCards {...props} />
    </>
  );
}

export default SaleCartTable;