import { useRef, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveShift, useClockIn, useClockOut, useShiftSales, useShifts, shiftKeys } from './ShiftQueries';
import type { ShiftWithSyncMeta } from '../../app/store/offline/localShiftsStore';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import type { SaleWithSyncMeta } from '../../app/store/offline/localSalesStore';
import { useLogout } from '../../shared/api/account/AccountQueries';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Modal } from '../../shared/components/modals/Modal';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftTime, formatShiftDate, formatShiftDateTime } from '../../shared/utils/formatDateTime';
import { cn } from '../../shared/utils/cn';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { useReactToPrint } from 'react-to-print';
import {
  ShoppingCart, DollarSign, Smartphone, CreditCard, Printer, Clock, LogOut,
  RefreshCw, WifiOff, ReceiptText, History,
} from 'lucide-react';
import ReceiptPreviewModal from '../sales/ui/history/ReceiptPreviewModal';
import { useExpenses } from '../expenses/api/ExpenseQueries';
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';
import ExpenseForm from '../expenses/components/ExpenseForm';
import ShiftReceiptContent from './ShiftReceiptContent';
import { CurrentShiftProgressChart, ShiftHistoryTrendChart } from './ShiftCharts';
import { buildCurrentShiftProgressSeries, buildShiftHistorySeries } from './shiftChartSeries';
import { grossSaleAmount, netSaleAmount, refundedAmount, toAmount } from '../sales/utils/saleAmounts';
import { cashHandover, netSalesAfterRefunds } from '../../shared/utils/accounting';

type ShiftLocationState = { openEndShift?: boolean };

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
};

type StatCardDef = {
  label: string;
  value: string;
  badge: string;
  icon: typeof ShoppingCart;
  color: keyof typeof cardStyles;
  secondary?: ReactNode;
};

function StatCard({ label, value, badge, icon: Icon, color, secondary }: StatCardDef) {
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

export default function MyShiftPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const business = authUser?.business;
  const { data: shift, isLoading, isRefetching } = useActiveShift();
  const { data: allShifts } = useShifts();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const logoutMutation = useLogout();
  const { confirm } = useConfirm();
  const location = useLocation();
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSyncMeta | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if ((location.state as ShiftLocationState | null)?.openEndShift) {
      queueMicrotask(() => setShowReceiptPreview(true));
      window.history.replaceState(null, '');
    }
  }, [location.state]);

  const shiftId = shift?.id || authUser?.shift_id;
  const hasActiveShift = !!(shift?.status === 'active') || !!authUser?.shift_id;
  const { data: shiftSales } = useShiftSales(shiftId ?? null);
  const { data: shiftExpenses = [] } = useExpenses(
    shiftId ? { shift_id: String(shiftId) } : undefined,
    { enabled: !!shiftId },
  );

  const filteredSales = useMemo(() => {
    if (!shiftSales) return [];
    if (!search.trim()) return shiftSales;
    const q = search.toLowerCase();
    return shiftSales.filter((sale) => sale.receipt_number.toLowerCase().includes(q));
  }, [shiftSales, search]);

  const paginated = usePagination(filteredSales || [], 10);

  const shiftGrossTotal = shiftSales?.reduce((s, sale) => s + grossSaleAmount(sale), 0) || 0;
  const shiftRefundsTotal = shiftSales?.reduce((s, sale) => s + refundedAmount(sale), 0) || 0;
  const netShiftTotal = netSalesAfterRefunds(shiftGrossTotal, shiftRefundsTotal);
  const cashTotal = shiftSales?.filter((s) => s.payment_method === 'cash').reduce((s, sale) => s + netSaleAmount(sale), 0) || 0;
  const mobileTotal = shiftSales?.filter((s) => s.payment_method === 'mobile_money').reduce((s, sale) => s + netSaleAmount(sale), 0) || 0;
  const cardTotal = shiftSales?.filter((s) => s.payment_method === 'card' || s.payment_method === 'other').reduce((s, sale) => s + netSaleAmount(sale), 0) || 0;
  const shiftExpenseTotal = shiftExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0);
  const handoverAmount = cashHandover(cashTotal, shiftExpenseTotal);

  const shiftTotals = {
    transactionCount: shiftSales?.length || 0,
    grossSales: shiftGrossTotal,
    refunds: shiftRefundsTotal,
    cash: cashTotal,
    mobileMoney: mobileTotal,
    cardOther: cardTotal,
    shiftExpenses: shiftExpenseTotal,
  };

  const clockInValue = shift?.clock_in || authUser?.shift_clock_in;

  const completedShifts = useMemo(() => {
    if (!allShifts || !authUser?.id) return [];
    return allShifts
      .filter((s) => s.status === 'completed' && s.user_id === authUser.id)
      .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  }, [allShifts, authUser]);

  const shiftProgressData = useMemo(
    () => buildCurrentShiftProgressSeries(shiftSales ?? []),
    [shiftSales],
  );

  const shiftHistoryChartData = useMemo(
    () => buildShiftHistorySeries(completedShifts),
    [completedShifts],
  );

  const statCards: StatCardDef[] = [
    {
      label: 'Transactions',
      value: String(shiftTotals.transactionCount),
      badge: 'Count',
      icon: ShoppingCart,
      color: 'blue',
      secondary: <>{formatCurrency(netShiftTotal)} net sales</>,
    },
    {
      label: 'Cash',
      value: formatCurrency(cashTotal),
      badge: 'Cash',
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Mobile Money',
      value: formatCurrency(mobileTotal),
      badge: 'Mobile',
      icon: Smartphone,
      color: 'indigo',
    },
    {
      label: 'Card / Other',
      value: formatCurrency(cardTotal),
      badge: 'Card',
      icon: CreditCard,
      color: 'purple',
    },
    {
      label: 'Cash at handover',
      value: formatCurrency(handoverAmount),
      badge: 'Handover',
      icon: ReceiptText,
      color: 'amber',
      secondary: shiftExpenseTotal > 0 ? (
        <>Expenses <span className="font-bold text-red-600">-{formatCurrency(shiftExpenseTotal)}</span></>
      ) : undefined,
    },
  ];

  const handlePrintShift = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `shift-${shiftId || 'end'}`,
    pageStyle: `@page { margin: 8mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  }, [queryClient]);

  const handleEndShift = async () => {
    if (!shiftId) return;
    const confirmed = await confirm({
      title: 'End Shift',
      message: `End your shift with ${shiftSales?.length || 0} transaction(s), ${formatCurrency(netShiftTotal)} net sales, and ${formatCurrency(handoverAmount)} cash at handover?`,
      confirmText: 'End Shift',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    setShowReceiptPreview(false);
    try {
      await clockOut.mutateAsync(
        { id: shiftId, totals: { total_sales: netShiftTotal, cash: cashTotal, mobile_money: mobileTotal, card: cardTotal } },
      );
      handlePrintShift();
      setTimeout(() => logoutMutation.mutate(), 3000);
    } catch (e) {
      console.error('Failed to end shift:', e);
    }
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (!hasActiveShift) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shift</h1>
          <p className="text-sm text-gray-500 mt-1">Clock in to track sales and cash at handover</p>
        </div>
        <EmptyState
          icon={<Clock className="w-12 h-12" />}
          title="No Active Shift"
          description={
            isOffline
              ? "You haven't started a shift yet. Clock in offline — your shift will sync when connected."
              : "You haven't started a shift yet. Clock in to begin."
          }
          actionLabel={clockIn.isPending ? 'Starting…' : 'Start Shift'}
          onAction={clockIn.isPending ? undefined : () => clockIn.mutate()}
        />
        {completedShifts.length > 0 && (
          <ShiftHistoryTrendChart data={buildShiftHistorySeries(completedShifts)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shift</h1>
          <p className="text-sm text-gray-500 mt-1">
            Started {formatShiftDateTime(clockInValue)}
            {isOffline && <span className="text-amber-600 font-medium"> · Offline mode</span>}
          </p>
          {(shift as { _pendingSync?: boolean })?._pendingSync && (
            <Badge variant="warning" className="mt-2">Shift pending sync</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleRefresh} disabled={isRefetching}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
          </button>
          <Button variant="outline" onClick={() => setShowReceiptPreview(true)}>
            <Printer className="w-4 h-4 mr-1.5" />Shift Receipt
          </Button>
          <Button variant="outline" onClick={() => setShowExpenseForm(true)}>
            <ReceiptText className="w-4 h-4 mr-1.5" />Record Expense
          </Button>
          <Button variant="outline" onClick={handleEndShift} loading={clockOut.isPending}>
            <LogOut className="w-4 h-4 mr-1.5" />End Shift
          </Button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
          <WifiOff className="w-4 h-4 shrink-0" />
          Shift changes save locally and sync when you&apos;re back online.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <CurrentShiftProgressChart
            data={shiftProgressData}
            currentTotal={netShiftTotal}
            receiptCount={shiftTotals.transactionCount}
          />

          <ShiftTransactionsTable
            shiftSales={shiftSales}
            filteredSales={filteredSales}
            paginated={paginated}
            search={search}
            setSearch={setSearch}
            onSelectSale={setSelectedSale}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Shift Summary</h3>
            <p className="text-xs text-gray-500 mb-4">Current shift totals</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Gross sales</span>
                <span className="font-semibold tabular-nums">{formatCurrency(shiftGrossTotal)}</span>
              </div>
              {shiftRefundsTotal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Refunds</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(shiftRefundsTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-800">Net sales</span>
                <span className="font-bold tabular-nums">{formatCurrency(netShiftTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cash at handover</span>
                <span className="font-bold text-green-700 tabular-nums">{formatCurrency(handoverAmount)}</span>
              </div>
            </div>
          </div>

          <ShiftExpensesPanel expenses={shiftExpenses} total={shiftExpenseTotal} />

          {completedShifts.length > 0 && (
            <>
              <ShiftHistoryTrendChart data={shiftHistoryChartData} />
              <ShiftHistoryTable shifts={completedShifts} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showReceiptPreview} onClose={() => setShowReceiptPreview(false)} title="Shift Receipt" size="sm">
        <div ref={receiptRef}>
          <ShiftReceiptContent
            businessName={business?.name || 'CUSTOSELL'}
            cashierName={authUser?.name || '—'}
            clockIn={clockInValue}
            clockOutLabel={formatShiftDateTime(new Date().toISOString())}
            totals={shiftTotals}
            preview
          />
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={() => setShowReceiptPreview(false)}>Cancel</Button>
          <Button variant="outline" onClick={handlePrintShift}>
            <Printer className="w-4 h-4 mr-1.5" />Print
          </Button>
          <Button onClick={handleEndShift} loading={clockOut.isPending}>
            <LogOut className="w-4 h-4 mr-1.5" />End & Print
          </Button>
        </div>
      </Modal>

      {selectedSale && (
        <ReceiptPreviewModal sale={selectedSale} open={!!selectedSale} onClose={() => setSelectedSale(null)} />
      )}
      <ExpenseForm open={showExpenseForm} onClose={() => setShowExpenseForm(false)} shiftId={shiftId ?? null} />
    </div>
  );
}

function ShiftTransactionsTable({
  shiftSales,
  filteredSales,
  paginated,
  search,
  setSearch,
  onSelectSale,
}: {
  shiftSales: SaleWithSyncMeta[] | undefined;
  filteredSales: SaleWithSyncMeta[];
  paginated: ReturnType<typeof usePagination<SaleWithSyncMeta>>;
  search: string;
  setSearch: (v: string) => void;
  onSelectSale: (sale: SaleWithSyncMeta) => void;
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
              { key: 'created_at', header: 'Time', render: (sale) => formatShiftTime(sale.created_at) },
              { key: 'items', header: 'Items', render: (sale) => sale.sale_items?.length || 0 },
              { key: 'payment_method', header: 'Payment', render: (sale) => (
                <Badge variant={sale.payment_method === 'cash' ? 'success' : sale.payment_method === 'mobile_money' ? 'primary' : 'warning'}>
                  {sale.payment_method.replace('_', ' ')}
                </Badge>
              )},
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

function ShiftExpensesPanel({ expenses, total }: { expenses: ExpenseWithSyncMeta[]; total: number }) {
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
          {expenses.map((expense) => (
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

function ShiftHistoryTable({ shifts }: { shifts: ShiftWithSyncMeta[] }) {
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
