import type { ReactNode } from 'react';
import { ShoppingCart, ReceiptText, History } from 'lucide-react';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Badge } from '../../shared/components/badges/Badge';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftTime, formatShiftDate } from '../../shared/utils/formatDateTime';
import { grossSaleAmount, netSaleAmount, netSaleTaxAmount, refundedAmount, toAmount } from '../sales/utils/saleAmounts';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';
import type { ShiftWithSyncMeta } from '../../app/store/offline/sales/localShiftsStore';

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
};

export type StatCardDef = {
  label: string;
  value: string;
  badge: string;
  icon: typeof ShoppingCart;
  color: keyof typeof cardStyles;
  secondary?: ReactNode;
};

export function StatCard({ label, value, badge, icon: Icon, color, secondary }: StatCardDef) {
  const s = cardStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-white ${s.border} ${s.shadow} hover:-translate-y-0.5 group min-h-[130px] flex flex-col justify-center`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
      <div className="flex items-center justify-between mb-4 relative">
        <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
          <Icon className={`w-6 h-6 ${s.iconColor}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>{badge}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-0.5 relative tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-500 relative">{label}</p>
      {secondary && <p className="text-xs text-gray-500 mt-1 relative">{secondary}</p>}
    </div>
  );
}

export function ShiftTransactionsTable({
  shiftSales,
  filteredSales,
  paginated,
  search,
  setSearch,
  onSelectSale,
  showVat = false,
}: {
  shiftSales: SaleWithSyncMeta[] | undefined;
  filteredSales: SaleWithSyncMeta[];
  paginated: ReturnType<typeof usePagination<SaleWithSyncMeta>>;
  search: string;
  setSearch: (v: string) => void;
  onSelectSale: (sale: SaleWithSyncMeta) => void;
  showVat?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Shift Receipts</h3>
      <p className="text-xs text-gray-500 mb-4">Tap a receipt to preview · amounts after refunds</p>
      <div className="mb-4">
        <SearchInput placeholder="Search by receipt number..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
      </div>
      {!shiftSales?.length ? (
        <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No transactions yet" description="Sales made during this shift will appear here." />
      ) : filteredSales.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No matching transactions" description="Try a different receipt number." />
      ) : (
        <>
          <Table
            rowKey={(sale) => sale.id}
            data={paginated.data}
            columns={[
              { key: 'receipt_number', header: 'Receipt', render: (sale) => (
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => onSelectSale(sale)} className="text-blue-600 hover:underline font-medium">
                    {sale.receipt_number}
                  </button>
                  {sale._pendingSync && <Badge variant="warning">Pending sync</Badge>}
                  {sale._pendingRefundSync && <Badge variant="warning">Refund pending</Badge>}
                </div>
              )},
              { key: 'created_at', header: 'Time', render: (sale) => formatShiftTime(sale.sale_date || sale.created_at) },
              { key: 'items', header: 'Items', render: (sale) => sale.sale_items?.length || 0 },
              { key: 'payment_method', header: 'Payment', render: (sale) => {
                const method = sale.payment_method ?? 'other';
                return (
                  <Badge variant={method === 'cash' ? 'success' : method === 'mobile_money' ? 'primary' : 'warning'}>
                    {method.replace(/_/g, ' ')}
                  </Badge>
                );
              }},
              ...(showVat ? [{
                key: 'vat',
                header: 'VAT',
                align: 'right' as const,
                render: (sale: SaleWithSyncMeta) => (
                  <span className="tabular-nums text-gray-700">{formatCurrency(netSaleTaxAmount(sale))}</span>
                ),
              }] : []),
              { key: 'total_amount', header: 'Net Total', align: 'right', render: (sale) => (
                <div className="text-right">
                  <span className="font-semibold">{formatCurrency(netSaleAmount(sale))}</span>
                  {refundedAmount(sale) > 0 && (
                    <p className="text-xs text-gray-400">Gross {formatCurrency(grossSaleAmount(sale))}</p>
                  )}
                </div>
              )},
            ]}
          />
          <Pagination
            currentPage={paginated.page}
            totalPages={paginated.totalPages}
            totalItems={paginated.totalItems}
            pageSize={paginated.pageSize}
            onPageChange={paginated.setPage}
            onPageSizeChange={paginated.setPageSize}
          />
        </>
      )}
    </div>
  );
}

export function ShiftExpensesPanel({ expenses, total }: { expenses: ExpenseWithSyncMeta[]; total: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-amber-500 shrink-0" />
            Shift Expenses
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Paid from cash drawer · reduces cash at handover</p>
        </div>
        {total > 0 && (
          <span className="text-sm font-bold text-red-600 tabular-nums">-{formatCurrency(total)}</span>
        )}
      </div>
      {expenses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No shift expenses recorded yet</p>
      ) : (
        <div className="space-y-2">
          {expenses.filter(Boolean).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{expense.description}</p>
                <p className="text-xs text-gray-500">
                  {expense.expense_category?.name ?? 'Uncategorized'}
                  {expense._pendingSync && <Badge variant="warning" className="ml-2">Pending sync</Badge>}
                </p>
              </div>
              <span className="font-bold tabular-nums shrink-0 ml-2">{formatCurrency(toAmount(expense.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShiftHistoryTable({ shifts }: { shifts: ShiftWithSyncMeta[] }) {
  const paginated = usePagination(shifts, 5);
  if (shifts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500 shrink-0" />
        Shift History
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs uppercase">Date</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs uppercase">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            {paginated.data.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 text-gray-800">{formatShiftDate(s.clock_in)}</td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    {formatCurrency(s.total_sales)}
                    {s._pendingSync && <Badge variant="warning">Pending sync</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={paginated.page}
        totalPages={paginated.totalPages}
        totalItems={paginated.totalItems}
        pageSize={paginated.pageSize}
        onPageChange={paginated.setPage}
        onPageSizeChange={paginated.setPageSize}
      />
    </div>
  );
}
