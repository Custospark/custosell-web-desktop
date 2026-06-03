import { useProductStockMovements } from '../../api/products/ProductQueries';

import { Modal } from '../../../../shared/components/modals/Modal';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { Package, Plus, Minus, AlertTriangle, RefreshCw, Clock, User } from 'lucide-react';

interface LedgerHistoryModalProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
}

const typeIcons: Record<string, React.ElementType> = {
  purchase: Plus, sale: Minus, adjustment: AlertTriangle, return: RefreshCw, initial: Clock,
};

const typeColors: Record<string, string> = {
  purchase: 'text-green-600 bg-green-100',
  sale: 'text-red-600 bg-red-100',
  adjustment: 'text-amber-600 bg-amber-100',
  return: 'text-blue-600 bg-blue-100',
  initial: 'text-purple-600 bg-purple-100',
};

const typeLabels: Record<string, string> = {
  purchase: 'Purchase', sale: 'Sale', adjustment: 'Adjustment', return: 'Return', initial: 'Initial Stock',
};

export default function LedgerHistoryModal({ open, onClose, productId, productName }: LedgerHistoryModalProps) {
  const { data: movements, isLoading } = useProductStockMovements(productId);

  return (
    <Modal isOpen={open} onClose={onClose} title={`Stock History — ${productName}`} size="lg">
      {isLoading ? (
        <LoadingSkeleton variant="list" />
      ) : !movements || movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Package className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No transaction history</p>
          <p className="text-xs mt-1">Stock movements for this product will appear here</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-4">
            {movements.map((m) => {
              const Icon = typeIcons[m.type] || Clock;
              const colorClass = typeColors[m.type] || 'text-gray-600 bg-gray-100';
              const label = typeLabels[m.type] || m.type;
              const isPositive = m.quantity_change > 0;

              // Extract user name from created_by_user if available
              const userName = (m as any).created_by_user?.data?.name || (m as any).created_by_user?.name || null;

              return (
                <div key={m.id} className="relative flex gap-4 pl-0">
                  {/* Timeline dot */}
                  <div className="relative flex-shrink-0 z-10">
                    <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4 shadow-sm min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>{label}</span>
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{m.quantity_change}
                        </span>
                        <span className="text-xs text-gray-400">
                          Balance: {m.stock_after}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {m.reference && <span>Ref: {m.reference}</span>}
                      {m.notes && <span>{m.notes}</span>}
                      {userName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {userName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
