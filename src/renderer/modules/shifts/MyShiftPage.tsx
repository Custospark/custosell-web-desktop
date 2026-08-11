import { useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveShift, useShiftExpenses, useShiftPayments, useShiftSales, useShifts, shiftKeys } from './ShiftQueries';
import { useClockIn } from './ShiftMutations';
import { useEndShiftAction } from './useEndShiftAction';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { Modal } from '../../shared/components/modals/Modal';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDateTime } from '../../shared/utils/formatDateTime';
import { cn } from '../../shared/utils/cn';
import { useReactToPrint } from 'react-to-print';
import {
  ShoppingCart, DollarSign, Smartphone, CreditCard, Printer, Clock, LogOut, RefreshCw, WifiOff, ReceiptText, Banknote,
} from 'lucide-react';
import { usePagination } from '../../shared/components/tables/Pagination';
import ReceiptPreviewModal from '../sales/ui/history/ReceiptPreviewModal';
import ExpenseForm from '../expenses/components/ExpenseForm';
import ShiftCloseReportContent from './ShiftCloseReportContent';
import OpeningBalanceModal from './OpeningBalanceModal';
import EndShiftModal from './EndShiftModal';
import { StatCard, ShiftTransactionsTable, ShiftExpensesPanel, ShiftHistoryTable } from './shiftComponents';
import { buildShiftCloseReportData } from './buildShiftCloseReportData';
import { canDownloadShiftClosePdf, downloadShiftClosePdf } from './useShiftClosePdf';
import { CurrentShiftProgressChart, ShiftHistoryTrendChart } from './ShiftCharts';
import { buildCurrentShiftProgressSeries, buildShiftHistorySeries } from './shiftChartSeries';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { grossSaleAmount, netSaleTaxAmount, refundedAmount, saleTaxRefundedAmount, toAmount } from '../sales/utils/saleAmounts';
import { netSales } from '../../shared/utils/accounting';
import { computeShiftCollections } from '../../shared/utils/shiftCollectionTotals';
import { useToast } from '../../app/contexts/useToast';

export default function MyShiftPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { business, taxEnabled } = useBusinessTaxSettings();
  const { data: shift, isLoading, isRefetching } = useActiveShift();
  const { data: allShifts } = useShifts();
  const clockIn = useClockIn();
  const { endShift, isEnding, totals } = useEndShiftAction();
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
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
  const openingBalance = Number(shift?.opening_balance ?? 0);
  const expectedCash = openingBalance + cashTotal - shiftExpenseTotal;

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
        openingBalance: openingBalance,
        countedCash: shift?.counted_cash ?? null,
      }),
    [
      business,
      authUser,
      clockInValue,
      shift?.clock_out,
      openingBalance,
      shift?.counted_cash,
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
      label: 'Expected cash in drawer',
      value: formatCurrency(expectedCash),
      badge: 'Drawer',
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
          <Button variant="outline" onClick={() => setShowOpeningBalance(true)}>
            <Banknote className="w-4 h-4 mr-1.5" />Opening Balance
          </Button>
          <Button variant="outline" onClick={() => setShowExpenseForm(true)}>
            <ReceiptText className="w-4 h-4 mr-1.5" />Record Expense
          </Button>
          <Button variant="outline" onClick={() => setShowEndShift(true)} loading={isEnding}>
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
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500">Opening balance</span>
                <span className="font-semibold tabular-nums">{formatCurrency(openingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cash collected</span>
                <span className="font-semibold tabular-nums">{formatCurrency(cashTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expected cash in drawer</span>
                <span className="font-bold text-green-700 tabular-nums">{formatCurrency(expectedCash)}</span>
              </div>
              <p className="text-xs text-gray-400">Opening balance + cash collected − expenses paid from the drawer.</p>
              {openingBalance === 0 && (
                <button
                  type="button"
                  onClick={() => setShowOpeningBalance(true)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Record opening balance
                </button>
              )}
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
      <OpeningBalanceModal
        open={showOpeningBalance}
        onClose={() => setShowOpeningBalance(false)}
        shiftId={shiftId ?? null}
        shift={shift}
      />
      <EndShiftModal
        open={showEndShift}
        onClose={() => setShowEndShift(false)}
        shiftId={shiftId ?? null}
        totals={totals}
        isEnding={isEnding}
        onEndShift={endShift}
        onOpenOpeningBalance={() => {
          setShowEndShift(false);
          setShowOpeningBalance(true);
        }}
      />
    </div>
  );
}
