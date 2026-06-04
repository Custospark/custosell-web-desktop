import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveShift, useClockIn, useClockOut, useShiftSales, useShifts, shiftKeys } from './ShiftQueries';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useLogout } from '../../shared/api/account/AccountQueries';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Modal } from '../../shared/components/modals/Modal';
import { Card } from '../../shared/components/cards/Card';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftTime, formatShiftDate, formatShiftDateTime } from '../../shared/utils/formatDateTime';
import { cn } from '../../shared/utils/cn';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { useReactToPrint } from 'react-to-print';
import { ShoppingCart, DollarSign, Smartphone, CreditCard, Printer, Clock, LogOut, RefreshCw } from 'lucide-react';
import ReceiptPreviewModal from '../sales/ui/history/ReceiptPreviewModal';

export default function MyShiftPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const business = authUser?.business;
  const { data: shift, isLoading, isRefetching } = useActiveShift();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const logoutMutation = useLogout();
  const { confirm } = useConfirm();
  const location = useLocation();
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if ((location.state as any)?.openEndShift) {
      setShowReceiptPreview(true);
      window.history.replaceState(null, '');
    }
  }, [location.state]);

  const shiftId = shift?.id || authUser?.shift_id;
  const hasActiveShift = !!(shift?.status === 'active') || !!authUser?.shift_id;
  const { data: shiftSales } = useShiftSales(shiftId ?? null);

  const filteredSales = useMemo(() => {
    if (!shiftSales) return [];
    if (!search.trim()) return shiftSales;
    const q = search.toLowerCase();
    return shiftSales.filter((sale: any) => sale.receipt_number.toLowerCase().includes(q));
  }, [shiftSales, search]);

  const paginated = usePagination(filteredSales || [], 10);

  const totalSales = shiftSales?.reduce((s, sale) => s + parseFloat(sale.total_amount), 0) || 0;
  const cashTotal = shiftSales?.filter((s) => s.payment_method === 'cash').reduce((s, sale) => s + parseFloat(sale.total_amount), 0) || 0;
  const mobileTotal = shiftSales?.filter((s) => s.payment_method === 'mobile_money').reduce((s, sale) => s + parseFloat(sale.total_amount), 0) || 0;
  const cardTotal = shiftSales?.filter((s) => s.payment_method === 'card' || s.payment_method === 'other').reduce((s, sale) => s + parseFloat(sale.total_amount), 0) || 0;

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
      message: `End your shift with ${shiftSales?.length || 0} sale(s) totaling ${formatCurrency(totalSales)}?`,
      confirmText: 'End Shift',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;

    setShowReceiptPreview(false);
    try {
      await clockOut.mutateAsync(
        { id: shiftId, totals: { total_sales: totalSales, cash: cashTotal, mobile_money: mobileTotal, card: cardTotal } },
      );
      handlePrintShift();
      setTimeout(() => logoutMutation.mutate(), 3000);
    } catch (e) {
      console.error('Failed to end shift:', e);
    }
  };

  const handleStartShift = () => {
    clockIn.mutate();
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (!hasActiveShift) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Shift</h1>
          <p className="text-sm text-gray-500 mt-1">Start your shift to begin recording sales</p>
        </div>
        <EmptyState
          icon={<Clock className="w-12 h-12" />}
          title="No Active Shift"
          description="You haven't started a shift yet. Clock in to begin."
          actionLabel="Start Shift"
          onAction={handleStartShift}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Shift</h1>
          <p className="text-sm text-gray-500 mt-1">
            Started {formatShiftDateTime(shift?.clock_in || authUser?.shift_clock_in)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleRefresh} disabled={isRefetching}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer" title="Refresh">
            <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
          </button>
          <Button variant="outline" onClick={() => setShowReceiptPreview(true)}>
            <Printer className="w-4 h-4 mr-1.5" />Shift Receipt
          </Button>
          <Button variant="outline" onClick={handleEndShift}>
            <LogOut className="w-4 h-4 mr-1.5" />End Shift
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 border-blue-500 bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex items-center">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-blue-500/10" />
          <div className="flex items-center gap-4 relative w-full">
            <div className="p-3.5 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300 shrink-0"><ShoppingCart className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-gray-500 mb-0.5">Sales</p><p className="text-3xl font-bold text-gray-900">{shiftSales?.length || 0}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 border-green-500 bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex items-center">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-green-500/10" />
          <div className="flex items-center gap-4 relative w-full">
            <div className="p-3.5 rounded-xl bg-green-100 text-green-600 group-hover:scale-110 group-hover:bg-green-200 transition-all duration-300 shrink-0"><DollarSign className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-gray-500 mb-0.5">Cash</p><p className="text-3xl font-bold text-gray-900">{formatCurrency(cashTotal)}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 border-indigo-500 bg-gradient-to-br from-white to-indigo-50/50 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex items-center">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-indigo-500/10" />
          <div className="flex items-center gap-4 relative w-full">
            <div className="p-3.5 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-200 transition-all duration-300 shrink-0"><Smartphone className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-gray-500 mb-0.5">Mobile Money</p><p className="text-3xl font-bold text-gray-900">{formatCurrency(mobileTotal)}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 border-purple-500 bg-gradient-to-br from-white to-purple-50/50 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex items-center">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-purple-500/10" />
          <div className="flex items-center gap-4 relative w-full">
            <div className="p-3.5 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 group-hover:bg-purple-200 transition-all duration-300 shrink-0"><CreditCard className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-gray-500 mb-0.5">Card / Other</p><p className="text-3xl font-bold text-gray-900">{formatCurrency(cardTotal)}</p></div>
          </div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Shift Transactions</h3>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalSales)}</span>
        </div>
        <div className="mb-4">
          <SearchInput placeholder="Search by receipt number..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
        {shiftSales && shiftSales.length > 0 ? (
          filteredSales.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No matching transactions" description="Try a different receipt number." />
          ) : (
            <><Table
            rowKey={(sale: any) => sale.id}
            data={paginated.data}
            columns={[
              { key: 'receipt_number', header: 'Receipt', render: (sale: any) => (
                <button onClick={() => setSelectedSale(sale)} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                  {sale.receipt_number}
                </button>
              ) },
              { key: 'created_at', header: 'Time', render: (sale: any) => formatShiftTime(sale.created_at) },
              { key: 'items', header: 'Items', render: (sale: any) => sale.sale_items?.length || 0 },
              { key: 'payment_method', header: 'Payment', render: (sale: any) => (
                <Badge variant={sale.payment_method === 'cash' ? 'success' : sale.payment_method === 'mobile_money' ? 'primary' : 'warning'}>
                  {sale.payment_method.replace('_', ' ')}
                </Badge>
              )},
              { key: 'total_amount', header: 'Total', align: 'right', render: (sale: any) => (
                <span className="font-semibold">{formatCurrency(sale.total_amount)}</span>
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
          )
        ) : (
          <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No transactions yet" description="Sales made during this shift will appear here." />
        )}
      </Card>

      {/* Shift History */}
      <ShiftHistory userId={authUser?.id} />

      <Modal isOpen={showReceiptPreview} onClose={() => setShowReceiptPreview(false)} title="Shift Receipt" size="sm">
        <div ref={receiptRef} className="bg-white p-4 max-w-sm mx-auto">
          <div className="text-center mb-3">
            <h2 className="text-base font-bold uppercase">{business?.name || 'CUSTOSELL'}</h2>
            <p className="text-xs text-gray-500">Shift Report</p>
            <p className="text-xs text-gray-400">{formatShiftDate(shift?.clock_in || authUser?.shift_clock_in)}</p>
          </div>
          <div className="border-t border-dashed border-gray-400 border-b py-2 mb-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Cashier:</span><span className="font-medium">{authUser?.name || '—'}</span></div>
            <div className="flex justify-between"><span>Clock In:</span><span>{formatShiftDateTime(shift?.clock_in || authUser?.shift_clock_in)}</span></div>
            <div className="flex justify-between"><span>Clock Out:</span><span>{formatShiftDateTime(new Date().toISOString())}</span></div>
          </div>
          <div className="text-xs space-y-1 mb-3">
            <div className="flex justify-between"><span>Sales Count:</span><span className="font-bold">{shiftSales?.length || 0}</span></div>
            <div className="flex justify-between"><span>Cash:</span><span>{formatCurrency(cashTotal)}</span></div>
            <div className="flex justify-between"><span>Mobile Money:</span><span>{formatCurrency(mobileTotal)}</span></div>
            <div className="flex justify-between"><span>Card/Other:</span><span>{formatCurrency(cardTotal)}</span></div>
            <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-sm"><span>TOTAL:</span><span>{formatCurrency(totalSales)}</span></div>
          </div>
          <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-2">End of Shift Report</div>
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
        <ReceiptPreviewModal
          sale={selectedSale}
          open={!!selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}

function ShiftHistory({ userId }: { userId?: number | null }) {
  const { data: allShifts } = useShifts();
  const completedShifts = useMemo(() => {
    if (!allShifts || !userId) return [];
    return allShifts
      .filter((s) => s.status === 'completed' && s.user_id === userId)
      .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  }, [allShifts, userId]);

  const paginated = usePagination(completedShifts, 5);

  if (completedShifts.length === 0) return null;

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Shift History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs uppercase">Date</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs uppercase">Clock In</th>
              <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs uppercase">Clock Out</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs uppercase">Sales</th>
              <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {paginated.data.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 text-gray-600">{formatShiftDate(s.clock_in)}</td>
                <td className="py-2 px-2 text-gray-800">{formatShiftTime(s.clock_in)}</td>
                <td className="py-2 px-2 text-gray-800">{formatShiftTime(s.clock_out)}</td>
                <td className="py-2 px-2 text-right text-gray-600">{s.total_sales}</td>
                <td className="py-2 px-2 text-right font-semibold">{formatCurrency(s.total_sales)}</td>
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
    </Card>
  );
}