import { useProductStockMovements } from '../../api/products/ProductQueries';
import { stockMovementActor } from '../../api/products/ProductTypes';
import { Modal } from '../../../../shared/components/modals/Modal';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { UserIdentityChip } from '../../../../shared/components/UserIdentityChip';
import { Package, Plus, Minus, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

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
        <div className="relative max-h-[60vh] overflow-y-auto">
          <div className="absolute bottom-2 left-[23px] top-2 w-px bg-gray-200" />

          <div className="space-y-4 p-0.5">
            {movements.map((m) => {
              const Icon = typeIcons[m.type] || Clock;
              const colorClass = typeColors[m.type] || 'text-gray-600 bg-gray-100';
              const label = typeLabels[m.type] || m.type;
              const isPositive = m.quantity_change > 0;
              const actor = stockMovementActor(m);

              return (
                <div key={m.id} className="relative flex gap-4 pl-0">
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{label}</span>
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

                    {(m.reference || m.notes) ? (
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {m.reference ? <span>Ref: {m.reference}</span> : null}
                        {m.notes ? <span>{m.notes}</span> : null}
                      </div>
                    ) : null}

                    <div className="mt-1 flex items-center gap-2 border-t border-gray-50 pt-2">
                      {actor ? (
                        <UserIdentityChip
                          name={actor.name}
                          avatar={actor.avatar}
                          size="sm"
                          nameClassName="text-xs text-gray-700"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">System / unknown user</span>
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
