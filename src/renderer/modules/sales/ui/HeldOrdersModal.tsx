import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../app/store/hooks/useApp';
import { resumeOrderToCart, loadOrderForUpdate } from '../api/salesSlice';
import { useOpenOrders, useCancelOrder, useUpdateOrder } from '../api/orders/useOrderQueries';
import {
  orderItemsToCartItems,
  type PosOrder,
} from '../api/orders/orderTypes';
import { Modal } from '../../../shared/components/modals/Modal';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Clock, ShoppingBag, Play, Ban, FileText, ArrowUpDown, Pencil, Check, X, LayoutGrid, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HeldOrdersModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const { confirm } = useConfirm();
  const { data: orders = [], isLoading } = useOpenOrders(open);
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();
  const [search, setSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.customer_name ?? '').toLowerCase().includes(q)
          || (o.notes ?? '').toLowerCase().includes(q)
          || o.order_number.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const at = new Date(a.held_at ?? a.created_at).getTime();
      const bt = new Date(b.held_at ?? b.created_at).getTime();
      return sortNewest ? bt - at : at - bt;
    });
    return list;
  }, [orders, search, sortNewest]);

  const startEdit = (order: PosOrder) => {
    setEditingId(order.id);
    setEditName(!order.customer_name || order.customer_name === 'Guest' ? '' : order.customer_name);
    setEditNotes(order.notes ?? '');
  };

  const saveEdit = (id: number) => {
    updateOrder.mutate({
      id,
      customer_name: editName.trim() || 'Guest',
      notes: editNotes.trim() || null,
    });
    setEditingId(null);
  };

  const resume = async (order: PosOrder) => {
    if (cartItems.length > 0) {
      const ok = await confirm({
        title: 'Replace current cart?',
        message: 'Resuming this order will replace the items currently in your cart.',
        confirmText: 'Resume order',
        cancelText: 'Keep cart',
        variant: 'warning',
      });
      if (!ok) return;
    }

    dispatch(resumeOrderToCart({
      orderId: order.id,
      items: orderItemsToCartItems(order.items),
      customerId: order.customer_id,
      notes: order.notes,
      discountAmount: Number(order.discount_amount ?? 0),
    }));
    onClose();
  };

  const startUpdate = async (order: PosOrder) => {
    if (cartItems.length > 0) {
      const ok = await confirm({
        title: 'Replace current cart?',
        message: 'Updating this order will replace the items currently in your cart.',
        confirmText: 'Update order',
        cancelText: 'Keep cart',
        variant: 'warning',
      });
      if (!ok) return;
    }

    dispatch(loadOrderForUpdate({
      orderId: order.id,
      items: orderItemsToCartItems(order.items),
      customerId: order.customer_id,
      notes: order.notes,
      discountAmount: Number(order.discount_amount ?? 0),
    }));
    onClose();
  };

  const handleCancel = async (order: PosOrder) => {
    const ok = await confirm({
      title: 'Cancel order?',
      message: `${order.order_number} will be cancelled and removed from Take Order.`,
      confirmText: 'Cancel order',
      cancelText: 'Keep',
      variant: 'danger',
    });
    if (!ok) return;
    cancelOrder.mutate(order.id);
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Open orders"
      size="xl"
      panelClassName="min-h-[70vh]"
      bodyClassName="flex flex-col min-h-0 px-6 py-4"
    >
      <div className="flex flex-col gap-3 min-h-[55vh]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by name, number, or notes..."
              value={search}
              onChange={(e: { target: { value: string } }) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <button
            type="button"
            onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortNewest ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 justify-center items-center py-16"><CustosellLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">{search ? 'No matching orders' : 'No open orders'}</p>
            <p className="text-xs mt-1">Held orders stay open until you complete a sale</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto max-h-[min(58vh,36rem)] pr-1">
            {filtered.map((order) => {
              const itemCount = order.item_count
                ?? order.items?.reduce((s, i) => s + i.quantity, 0)
                ?? 0;
              return (
                <div
                  key={order.id}
                  className="flex items-start gap-3 p-3.5 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === order.id ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Order name..."
                          autoFocus
                        />
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Notes..."
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(order.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-800 truncate">
                            {order.customer_name || 'Guest'}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400">{order.order_number}</span>
                          <button
                            type="button"
                            onClick={() => startEdit(order)}
                            className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                            {new Date(order.held_at ?? order.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            {itemCount} item{itemCount === 1 ? '' : 's'}
                          </span>
                          <span className="font-medium text-gray-700">
                            {formatCurrency(Number(order.total_amount))}
                          </span>
                        </div>
                        {order.notes ? (
                          <div className="flex items-start gap-1.5 mt-1.5 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                            <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{order.notes}</span>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  {editingId !== order.id && (
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <Button variant="ghost" size="sm" onClick={() => void resume(order)} title="Resume to complete sale">
                        <Play className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void startUpdate(order)} title="Update order">
                        <Save className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void handleCancel(order)} title="Cancel order">
                        <Ban className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 shrink-0">
          <Link
            to={ROUTES.SALES.ORDERS}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100/70 transition"
          >
            <LayoutGrid className="h-4 w-4" />
            View all orders
          </Link>
        </div>
      </div>
    </Modal>
  );
}
