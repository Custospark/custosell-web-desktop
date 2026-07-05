import { useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveShift, useClockIn, useShiftExpenses, useShiftPayments, useShiftSales, useShifts, shiftKeys } from './ShiftQueries';
import { useEndShiftAction } from './useEndShiftAction';
import type { ShiftWithSyncMeta } from '../../app/store/offline/sales/localShiftsStore';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
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
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';
import ExpenseForm from '../expenses/components/ExpenseForm';
import ShiftCloseReportContent from './ShiftCloseReportContent';
import { buildShiftCloseReportData } from './buildShiftCloseReportData';
import {
  canDownloadShiftClosePdf,
  downloadShiftClosePdf,
} from './useShiftClosePdf';
import { CurrentShiftProgressChart, ShiftHistoryTrendChart } from './ShiftCharts';
import { buildCurrentShiftProgressSeries, buildShiftHistorySeries } from './shiftChartSeries';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { grossSaleAmount, netSaleAmount, netSaleTaxAmount, refundedAmount, saleTaxRefundedAmount, toAmount } from '../sales/utils/saleAmounts';
import { cashHandover, netSales } from '../../shared/utils/accounting';
import { computeShiftCollections } from '../../shared/utils/shiftCollectionTotals';
import { useToast } from '../../app/contexts/useToast';

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
  const { business, taxEnabled } = useBusinessTaxSettings();
  const { data: shift, isLoading, isRefetching } = useActiveShift();
  const { data: allShifts } = useShifts();
  const clockIn = useClockIn();
  const { requestEndShift, isEnding } = useEndShiftAction();
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithSyncMeta | null>(null);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const shiftId = shift?.id || authUser?.shift_id;
  const hasActiveShift = !!(shift?.status === 'active') || !!authUser?.shift_id;
  const { data: shiftSales } = useShiftSales(shiftId ?? null);
  const { data: shiftPayments = [] } = useShiftPayments(shiftId ?? null);
  const { data: shiftExpenses = [] } = useShiftExpenses(shiftId ?? null);

  const filteredSales = useMemo(() => {
    if (!shiftSales) return [];
    const safe = shiftSales.filter(Boolean) as SaleWithSyncMeta[];
    if (!search.trim()) return safe;
    const q = search.toLowerCase();
    return safe.filter((sale) => sale.receipt_number.toLowerCase().includes(q));
  }, [shiftSales, search]);

  const paginated = usePagination(filteredSales || [], 10);

  const shiftGrossTotal = shiftSales?.reduce((s, sale) => s + grossSaleAmount(sale), 0) || 0;
  const shiftRefundsTotal = shiftSales?.reduce((s, sale) => s + refundedAmount(sale), 0) || 0;
  const shiftOutputVat = shiftSales?.reduce((s, sale) => s + netSaleTaxAmount(sale), 0) || 0;
  const shiftVatRefunded = shiftSales?.reduce((s, sale) => s + saleTaxRefundedAmount(sale), 0) || 0;
  const shiftExpenseTotal = shiftExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0);
  const netShiftTotal = netSales(shiftGrossTotal, shiftRefundsTotal, shiftExpenseTotal);
  const collections = computeShiftCollections(shiftPayments, shiftSales ?? []);
  const cashTotal = collections.cash;
  const mobileTotal = collections.mobile;
  const cardTotal = collections.card;
  const handoverAmount = cashHandover(cashTotal, shiftExpenseTotal);

  const clockInValue = shift?.clock_in || authUser?.shift_clock_in;

  const liveReportData = useMemo(
    () =>
      buildShiftCloseReportData({
        business,
        authUser,
        clockIn: clockInValue,
        clockOut: shift?.clock_out ?? null,
        shiftSales: shiftSales ?? [],
        shiftPayments,
        shiftExpenses,
        isOfflineCopy: isOffline,
        taxEnabled,
      }),
    [
      business,
      authUser,
      clockInValue,
      shift?.clock_out,
      shiftSales,
      shiftPayments,
      shiftExpenses,
      isOffline,
      taxEnabled,
    ],
  );

  const reportData = liveReportData;
  const canDownloadPdf = !isOffline && canDownloadShiftClosePdf(authUser);

  const completedShifts = useMemo(() => {
    if (!allShifts || !authUser?.id) return [];
    return allShifts
      .filter(Boolean)
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
      value: String(shiftSales?.length || 0),
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
    documentTitle: `shift-close-${shiftId || 'report'}`,
    pageStyle: `@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  }, [queryClient]);

  const triggerPrint = useCallback(() => {
    requestAnimationFrame(() => {
      handlePrintShift();
    });
  }, [handlePrintShift]);

  const handleDownloadPdf = async () => {
    if (!shiftId) return;
    setPdfLoading(true);
    try {
      await downloadShiftClosePdf(shiftId);
      showToast('success', 'Shift report downloaded');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEndShift = () => {
    void requestEndShift();
  };

  const closeReceiptModal = () => {
    setShowReceiptPreview(false);
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
            <Printer className="w-4 h-4 mr-1.5" />Shift Report
          </Button>
          <Button variant="outline" onClick={() => setShowExpenseForm(true)}>
            <ReceiptText className="w-4 h-4 mr-1.5" />Record Expense
          </Button>
          <Button variant="outline" onClick={handleEndShift} loading={isEnding}>
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
            receiptCount={shiftSales?.length || 0}
          />

          <ShiftTransactionsTable
            shiftSales={shiftSales}
            filteredSales={filteredSales}
            paginated={paginated}
            search={search}
            setSearch={setSearch}
            onSelectSale={setSelectedSale}
            showVat={taxEnabled}
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
              {shiftExpenseTotal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Shift expenses</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(shiftExpenseTotal)}</span>
                </div>
              )}
              {shiftRefundsTotal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Refunds</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(shiftRefundsTotal)}</span>
                </div>
              )}
              {taxEnabled && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Output VAT (net)</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(shiftOutputVat)}</span>
                  </div>
                  {shiftVatRefunded > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>VAT refunded</span>
                      <span className="font-semibold tabular-nums">-{formatCurrency(shiftVatRefunded)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-800">Net sales (cash collected)</span>
                <span className="font-bold tabular-nums">{formatCurrency(netShiftTotal)}</span>
              </div>
              <p className="text-xs text-gray-400">Gross − refunds − shift expenses. VAT shown separately above.</p>
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

      <div className="fixed -left-[9999px] top-0 w-[210mm] pointer-events-none" aria-hidden>
        <div ref={receiptRef}>
          <ShiftCloseReportContent data={reportData} forPrint />
        </div>
      </div>

      <Modal
        isOpen={showReceiptPreview}
        onClose={closeReceiptModal}
        title="Shift Close Report"
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto border border-gray-100 rounded-lg">
          <ShiftCloseReportContent data={reportData} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={closeReceiptModal}>Close</Button>
          {canDownloadPdf && (
            <Button variant="outline" onClick={handleDownloadPdf} loading={pdfLoading}>
              Download PDF
            </Button>
          )}
          <Button variant="outline" onClick={triggerPrint}>
            <Printer className="w-4 h-4 mr-1.5" />Print
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
