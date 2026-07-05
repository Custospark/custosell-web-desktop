import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { useInventoryReconciliation, usePostOpeningInventory } from '../api/AccountingQueries';
import { AlertTriangle, CheckCircle2, Package, RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InventoryReconciliationCard() {
  const { data, isLoading, refetch, isFetching } = useInventoryReconciliation();
  const postOpening = usePostOpeningInventory();

  const handlePost = (force = false) => {
    if (!data) return;
    if (data.requires_force && !force) {
      const ok = window.confirm(
        `This adjustment (${fmt(data.adjustment_needed)}) exceeds the safe limit. ` +
          'Review excluded products below, then confirm to post anyway.',
      );
      if (!ok) return;
      postOpening.mutate({ force: true });
      return;
    }
    postOpening.mutate({ force });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Inventory &amp; General Ledger</h2>
            <p className="text-xs text-gray-500">
              Align account 1104 (Inventory) with stock on hand (qty × cost). Sales reduce this balance via COGS.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading reconciliation…</p>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Stock book value</p>
              <p className="text-lg font-semibold text-gray-900">{fmt(data.stock_book_value)}</p>
              <p className="text-[11px] text-gray-400">{data.included_sku_count} SKUs included</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">GL inventory (1104)</p>
              <p className="text-lg font-semibold text-gray-900">{fmt(data.gl_inventory_balance)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Adjustment needed</p>
              <p className={cn('text-lg font-semibold', data.is_aligned ? 'text-green-600' : 'text-amber-600')}>
                {data.is_aligned ? 'Aligned' : fmt(data.adjustment_needed)}
              </p>
            </div>
          </div>

          {data.is_aligned ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Inventory ledger matches your product stock valuation.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => handlePost(false)}
                disabled={!data.can_post_opening || postOpening.isPending || data.included_sku_count === 0}
              >
                Establish opening inventory
              </Button>
              {data.included_sku_count === 0 && (
                <span className="text-xs text-amber-700">Add stock and cost to products in Inventory first.</span>
              )}
            </div>
          )}

          {(data.warnings.length > 0 || data.excluded_sku_count > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                Data quality notes
              </div>
              <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">
                {data.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {data.raw_stock_book_value > data.stock_book_value * 1.01 && (
                  <li>
                    Raw unfiltered total was {fmt(data.raw_stock_book_value)} — unrealistic rows were excluded.
                  </li>
                )}
              </ul>
              {data.excluded_samples.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-800">
                        <th className="py-1 pr-2">Product</th>
                        <th className="py-1 pr-2">Stock</th>
                        <th className="py-1 pr-2">Cost</th>
                        <th className="py-1">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.excluded_samples.map((row) => (
                        <tr key={row.id} className="border-t border-amber-100">
                          <td className="py-1 pr-2 font-medium">{row.name}</td>
                          <td className="py-1 pr-2">{row.stock_quantity}</td>
                          <td className="py-1 pr-2">{fmt(row.cost_price)}</td>
                          <td className="py-1 text-amber-800">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Unable to load inventory reconciliation.</p>
      )}
    </Card>
  );
}
