import { useState } from 'react';
import { useSales, useRefund } from '../../api/salesQueries';
import { Button } from '../../../../shared/components/buttons/Button';
import { Card } from '../../../../shared/components/cards/Card';
import { Table } from '../../../../shared/components/tables/Table';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { useToast } from '../../../../app/contexts/useToast';
import { RotateCcw, Search } from 'lucide-react';

export default function RefundPanel() {
  const { data: sales, isLoading } = useSales();
  const refundMutation = useRefund();
  const { showToast } = useToast();
  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [refundQtys, setRefundQtys] = useState<Record<number, number>>({});

  const paidSales = (sales || []).filter((s) => s.payment_status === 'paid' || s.payment_status === 'partially_refunded')
    .filter((s) => !receiptSearch || s.receipt_number.toLowerCase().includes(receiptSearch.toLowerCase()));

  const handleRefund = () => {
    if (!selectedSale) return;
    const items = Object.entries(refundQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ id: Number(id), quantity: qty }));

    if (items.length === 0) { showToast('error', 'Select items to refund'); return; }

    refundMutation.mutate({ id: selectedSale.id, data: { items } }, {
      onSuccess: () => { setSelectedSale(null); setRefundQtys({}); },
    });
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Process Refund</h2>
            <p className="text-sm text-gray-500 mt-0.5">Search for a sale by receipt number</p>
          </div>
        </div>

        <div className="relative max-w-xs mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Search receipt..."
            value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value)} />
        </div>

        <Table<any>
          rowKey={(s) => s.id}
          columns={[
            { key: 'receipt_number', header: 'Receipt' },
            { key: 'date', header: 'Date', render: (s) => new Date(s.sale_date).toLocaleDateString() },
            { key: 'total', header: 'Total', render: (s) => formatCurrency(s.total_amount) },
            { key: 'status', header: 'Status', render: (s) => <Badge variant={s.payment_status === 'partially_refunded' ? 'warning' : 'success'}>{s.payment_status.replace('_', ' ')}</Badge> },
            { key: 'action', header: '', render: (s) => <Button size="sm" onClick={() => { setSelectedSale(s); setRefundQtys({}); }}>Select</Button> },
          ]}
          data={paidSales.slice(0, 20)}
        />
      </Card>

      {selectedSale && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Refund — {selectedSale.receipt_number}</h3>
              <p className="text-sm text-gray-500">Select items and quantities to refund</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedSale(null)}>Cancel</Button>
          </div>

          <Table<any>
            rowKey={(i: any) => i.id}
            columns={[
              { key: 'product', header: 'Item', render: (i: any) => i.product_name },
              { key: 'qty', header: 'Sold', render: (i: any) => i.quantity - i.refunded_quantity },
              { key: 'price', header: 'Price', render: (i: any) => formatCurrency(i.unit_price) },
              { key: 'refund_qty', header: 'To Refund', render: (i: any) => {
                const max = i.quantity - i.refunded_quantity;
                return (
                  <input type="number" min={0} max={max} value={refundQtys[i.id] || 0}
                    onChange={(e) => setRefundQtys((prev) => ({ ...prev, [i.id]: Math.min(max, Math.max(0, parseInt(e.target.value) || 0)) }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm" />
                );
              }},
              { key: 'amount', header: 'Amount', render: (i: any) => formatCurrency((refundQtys[i.id] || 0) * parseFloat(i.unit_price)) },
            ]}
            data={selectedSale.items || []}
          />

          <div className="flex justify-end mt-4">
            <Button onClick={handleRefund} loading={refundMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-1.5" />Process Refund
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
