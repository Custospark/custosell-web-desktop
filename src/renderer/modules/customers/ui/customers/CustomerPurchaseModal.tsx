import { useCustomerPurchases } from '../../api/customers/CustomerQueries';
import { Modal } from '../../../../shared/components/modals/Modal';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { ShoppingBag } from 'lucide-react';

interface CustomerPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
}

export default function CustomerPurchaseModal({ open, onClose, customerId, customerName }: CustomerPurchaseModalProps) {
  const { data: purchases, isLoading, error } = useCustomerPurchases(customerId);

  return (
    <Modal isOpen={open} onClose={onClose} title={`Purchase History — ${customerName}`} size="lg">
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : error ? (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10" />}
          title="Failed to load purchases"
          description={error?.message || 'An error occurred while fetching purchase history'}
        />
      ) : !purchases || purchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10" />}
          title="No purchases yet"
          description={`${customerName} has not made any purchases.`}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Receipt</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Items</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Total</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Payment</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-2.5 px-3 text-gray-800">
                    {new Date(p.sale_date).toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-sm text-gray-800">{p.receipt_number}</td>
                  <td className="py-2.5 px-3 text-right text-gray-800">{p.sale_items?.length || 0}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-gray-900">{formatCurrency(p.total_amount)}</td>
                  <td className="py-2.5 px-3 capitalize text-gray-800">{p.payment_method.replace('_', ' ')}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.payment_status === 'partially_refunded' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {p.payment_status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
