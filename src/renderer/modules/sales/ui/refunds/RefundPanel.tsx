import { useState, useCallback } from 'react';
import { useSales, useRefund } from '../../api/salesQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { Button } from '../../../../shared/components/buttons/Button';
import { Card } from '../../../../shared/components/cards/Card';
import { Table } from '../../../../shared/components/tables/Table';
import { Badge } from '../../../../shared/components/badges/Badge';
import { Modal } from '../../../../shared/components/modals/Modal';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useToast } from '../../../../app/contexts/useToast';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { RotateCcw, Search, Receipt, Trash2, CheckSquare, Square } from 'lucide-react';
import type { Sale } from '../../api/salesTypes';

const statusLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  paid: { label: 'Paid', variant: 'success' },
  partially_refunded: { label: 'Partially Refunded', variant: 'warning' },
  refunded: { label: 'Full Refund', variant: 'danger' },
};

export default function RefundPanel() {
  const { data: sales, isLoading, error, refetch } = useSales();
  const refundMutation = useRefund();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundQtys, setRefundQtys] = useState<Record<number, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await axiosInstance.post('/sales/bulk-delete', { ids });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSelectedIds(new Set());
    },
  });

  const paidSales = (sales || []).filter((s) => s.payment_status === 'paid' || s.payment_status === 'partially_refunded')
    .filter((s) => !receiptSearch || s.receipt_number.toLowerCase().includes(receiptSearch.toLowerCase()));

  const saleSubtotal = selectedSale ? parseFloat(selectedSale.subtotal) : 0;
  const saleDiscount = selectedSale ? parseFloat(selectedSale.discount_amount) : 0;
  const discountRatio = saleSubtotal > 0 ? saleDiscount / saleSubtotal : 0;

  const handleRefund = () => {
    if (!selectedSale) return;

    const items = Object.entries(refundQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const saleItem = selectedSale.sale_items?.find((i) => i.id === Number(id));
        if (!saleItem) return { id: Number(id), quantity: qty };
        const itemSubtotal = parseFloat(saleItem.unit_price) * qty;
        const proportionalDiscount = itemSubtotal * discountRatio;
        const amount = itemSubtotal - proportionalDiscount;
        return { id: Number(id), quantity: qty, amount: Math.round(amount * 100) / 100 };
      });

    if (items.length === 0) { showToast('error', 'Select items to refund'); return; }

    refundMutation.mutate({ id: selectedSale.id, data: { items } }, {
      onSuccess: () => {
        setSelectedSale(null);
        setRefundQtys({});
        refetch();
      },
    });
  };

  const openRefund = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundQtys({});
  };

  const paidIds = paidSales.map((s) => s.id);
  const allSelected = paidIds.length > 0 && paidIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paidIds));
    }
  }, [allSelected, paidIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Delete sales?',
      message: `This will permanently delete ${selectedIds.size} sale(s). This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const cashier = selectedSale?.user;
  const customer = selectedSale?.customer;

  const selectedTotalRefunded = (selectedSale?.sale_items ?? []).reduce(
    (sum, i) => sum + parseFloat(i.refunded_amount || '0'), 0
  );
  const selectedNetTotal = Math.max(0, Math.round((parseFloat(selectedSale?.total_amount || '0') - selectedTotalRefunded) * 100) / 100);

  const refundTotal = Math.round(
    Object.entries(refundQtys)
      .filter(([_, qty]) => qty > 0)
      .reduce((sum, [id, qty]) => {
        const item = selectedSale?.sale_items?.find((i) => i.id === Number(id));
        if (!item) return sum;
        const itemSubtotal = parseFloat(item.unit_price) * qty;
        return sum + itemSubtotal - itemSubtotal * discountRatio;
      }, 0) * 100
  ) / 100;

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) return <EmptyState icon={<Receipt className="w-12 h-12" />} title="Failed to load sales" description="An error occurred" actionLabel="Retry" onAction={() => refetch()} />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Process Refund</h2>
            <p className="text-sm text-gray-500 mt-0.5">Search for a sale by receipt number</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Search receipt..."
              value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} title="Select all" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              Select All
            </button>
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium">
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        <Table<any>
          rowKey={(s) => s.id}
          columns={[
            { key: 'select', header: '', render: (s) => (
              <button onClick={() => toggleOne(s.id)} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                {selectedIds.has(s.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              </button>
            )},
            { key: 'receipt_number', header: 'Receipt' },
            { key: 'date', header: 'Date', render: (s) => new Date(s.sale_date).toLocaleDateString() },
            { key: 'total', header: 'Total', render: (s) => formatCurrency(s.total_amount) },
            { key: 'status', header: 'Status', render: (s) => {
              const st = statusLabel[s.payment_status] || { label: s.payment_status, variant: 'neutral' };
              return <Badge variant={st.variant}>{st.label}</Badge>;
            }},
            { key: 'action', header: 'Receipt', render: (s) => (
              <button title="Select for refund" onClick={() => openRefund(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors text-sm">
                <RotateCcw className="w-4 h-4" /> Refund
              </button>
            )},
          ]}
          data={paidSales.slice(0, 20)}
        />
      </Card>

      <Modal isOpen={!!selectedSale} onClose={() => { setSelectedSale(null); setRefundQtys({}); }} size="lg">
        {selectedSale && (
          <div className="space-y-5">
            {/* Receipt Preview Header */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="text-center mb-3">
                <h3 className="font-bold text-gray-900 uppercase">{user?.business_name?.toUpperCase() || 'CUSTOSELL'}</h3>
                <p className="text-xs text-gray-400">Receipt {selectedSale.receipt_number}</p>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(selectedSale.sale_date).toLocaleDateString()} {new Date(selectedSale.created_at).toLocaleTimeString()}</span>
                </div>
                {cashier && <div className="flex justify-between"><span>Cashier</span><span>{cashier.name}</span></div>}
                {customer && <div className="flex justify-between"><span>Customer</span><span>{customer.name}</span></div>}
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="capitalize">{selectedSale.payment_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {saleDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(saleDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total_amount)}</span>
                </div>
                {selectedTotalRefunded > 0.005 && (
                  <>
                    <div className="flex justify-between text-red-600 pt-1 border-t border-dashed border-red-200">
                      <span>Previously Refunded</span>
                      <span>-{formatCurrency(selectedTotalRefunded)}</span>
                    </div>
                    {selectedNetTotal > 0.005 && (
                      <div className="flex justify-between font-semibold text-gray-800">
                        <span>Net Remaining</span>
                        <span>{formatCurrency(selectedNetTotal)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-1">
                  <span>Status</span>
                  <Badge variant={statusLabel[selectedSale.payment_status]?.variant || 'neutral'}>
                    {statusLabel[selectedSale.payment_status]?.label || selectedSale.payment_status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Refund Items */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Select items to refund</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {(selectedSale.sale_items || []).map((item) => {
                  const maxRefundable = item.quantity - item.refunded_quantity;
                  const selectedQty = refundQtys[item.id] || 0;
                  const itemSubtotal = parseFloat(item.unit_price) * selectedQty;
                  const proportionalDiscount = itemSubtotal * discountRatio;
                  const refundAmount = Math.round((itemSubtotal - proportionalDiscount) * 100) / 100;
                  return (
                    <div key={item.id} className={`rounded-lg p-3 ${item.refunded_quantity > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-500">
                            Sold: {item.quantity} × {formatCurrency(item.unit_price)}
                            {discountRatio > 0 && <span> (incl. {Math.round(discountRatio * 100)}% discount)</span>}
                          </p>
                          {item.refunded_quantity > 0 && (
                            <p className="text-xs text-amber-700 font-medium mt-0.5">
                              {item.refunded_quantity} already refunded · {formatCurrency(item.refunded_amount)}
                            </p>
                          )}
                        </div>
                        {maxRefundable > 0 && (
                          <>
                            <div className="text-right shrink-0">
                              <input type="number" min={0} max={maxRefundable}
                                value={refundQtys[item.id] || 0}
                                onChange={(e) => setRefundQtys((prev) => ({ ...prev, [item.id]: Math.min(maxRefundable, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center" />
                              <p className="text-xs text-gray-500 mt-0.5">Max {maxRefundable}</p>
                            </div>
                            <div className="text-right w-24 shrink-0">
                              <p className="text-sm font-semibold text-gray-800">{formatCurrency(refundAmount)}</p>
                              {selectedQty > 0 && discountRatio > 0 && (
                                <p className="text-xs text-green-600">-{formatCurrency(proportionalDiscount)} disc</p>
                              )}
                            </div>
                          </>
                        )}
                        {maxRefundable <= 0 && (
                          <div className="text-right shrink-0">
                            <Badge variant="danger">Fully Refunded</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(selectedSale.sale_items || []).every((i) => i.quantity - i.refunded_quantity <= 0) && (
                  <p className="text-sm text-gray-400 text-center py-6">All items have been fully refunded</p>
                )}
              </div>
            </div>

            {/* Refund Summary */}
            {refundTotal > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex justify-between items-center">
                <span className="font-medium text-red-700">Refund Total</span>
                <span className="font-bold text-red-700">{formatCurrency(Math.round(refundTotal * 100) / 100)}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="outline" onClick={() => { setSelectedSale(null); setRefundQtys({}); }}>
                Cancel
              </Button>
              <Button onClick={handleRefund} loading={refundMutation.isPending}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Process Refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
