import { useAppSelector, useAppDispatch } from '../../../app/store/hooks/useApp';
import { takeOrder, removeHeldOrder } from '../api/salesSlice';
import { Modal } from '../../../shared/components/modals/Modal';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Button } from '../../../shared/components/buttons/Button';
import { Clock, User, ShoppingBag, Play, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HeldOrdersModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const heldOrders = useAppSelector((s) => s.sales.heldOrders);

  return (
    <Modal isOpen={open} onClose={onClose} title="Held Orders" size="md">
      {heldOrders.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <Clock className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No held orders</p>
          <p className="text-xs mt-1">Hold an order to save it for later</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {heldOrders.map((order) => (
            <div key={order.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-800 truncate">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{order.itemCount} item{order.itemCount > 1 ? 's' : ''}</span>
                  <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</span>
              <Button variant="ghost" size="sm" onClick={() => { dispatch(takeOrder(order.id)); onClose(); }} title="Resume">
                <Play className="w-4 h-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dispatch(removeHeldOrder(order.id))} title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
