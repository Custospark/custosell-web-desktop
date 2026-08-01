import { Plus, Minus, Trash, ShoppingCart, RotateCcw } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { InvoiceLineItem } from './invoiceLineItems';

interface InvoiceLineItemsTableProps {
  lineItems: InvoiceLineItem[];
  isModal?: boolean;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onEditQuantity: (item: {
    lineKey: string;
    productId: number;
    productName: string;
    currentQty: number;
  }) => void;
  onRemoveItem: (lineKey: string) => void;
  onClearAll: () => void;
}

export function InvoiceLineItemsTable({
  lineItems,
  isModal,
  onUpdateQuantity,
  onEditQuantity,
  onRemoveItem,
  onClearAll,
}: InvoiceLineItemsTableProps) {
  return (
    <>
      {lineItems.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Items ({lineItems.length})
          </span>
          <button
            type="button"
            title="Remove all items"
            onClick={onClearAll}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Clear All
          </button>
        </div>
      )}

      <div className={cn('flex-1 overflow-y-auto', isModal && 'min-h-0')}>
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
                  <tr key={item.lineKey} className="hover:bg-gray-50">
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
                          onClick={() => onUpdateQuantity(item.lineKey, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border-2 border-red-400 hover:bg-red-50 text-red-500 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit quantity"
                          onClick={() => onEditQuantity({
                            lineKey: item.lineKey,
                            productId: item.product_id ?? 0,
                            productName: item.name,
                            currentQty: item.quantity,
                          })}
                          className="w-12 text-center text-base font-semibold text-gray-900 tabular-nums hover:text-blue-600"
                        >
                          {item.quantity}
                        </button>
                        <button
                          type="button"
                          title="Increase quantity"
                          onClick={() => onUpdateQuantity(item.lineKey, item.quantity + 1)}
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
                        onClick={() => onRemoveItem(item.lineKey)}
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
    </>
  );
}
