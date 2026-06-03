import { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/store/hooks/useApp';
import { takeOrder, removeHeldOrder, renameHeldOrder } from '../api/salesSlice';
import type { HeldOrder } from '../api/salesTypes';
import { Modal } from '../../../shared/components/modals/Modal';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Clock, User, ShoppingBag, Play, Trash2, FileText, ArrowUpDown, Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HeldOrdersModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const heldOrders = useAppSelector((s) => s.sales.heldOrders);
  const [search, setSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    let list = [...heldOrders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.customerName.toLowerCase().includes(q) || o.notes.toLowerCase().includes(q));
    }
    list.sort((a, b) => sortNewest ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return list;
  }, [heldOrders, search, sortNewest]);

  const startRename = (order: HeldOrder) => {
    setEditingId(order.id);
    setEditName(order.customerName === 'Guest' ? '' : order.customerName);
  };

  const saveRename = (id: string) => {
    dispatch(renameHeldOrder({ id, name: editName.trim() || 'Guest' }));
    setEditingId(null);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Held Orders" size="md">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput placeholder="Search by name or notes..." value={search} onChange={(e: any) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <button onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortNewest ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Clock className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">{search ? 'No matching orders' : 'No held orders'}</p>
            <p className="text-xs mt-1">Orders auto-expire after 72 hours</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.map((order) => (
              <div key={order.id} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {editingId === order.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Order name..." autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(order.id); if (e.key === 'Escape') setEditingId(null); }} />
                        <button onClick={() => saveRename(order.id)} className="text-xs text-blue-600 font-medium hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Esc</button>
                      </div>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{order.customerName}</span>
                        <button onClick={() => startRename(order)} className="p-0.5 text-gray-300 hover:text-blue-500 transition-colors shrink-0">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                          {new Date(order.timestamp).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{order.itemCount} item{order.itemCount > 1 ? 's' : ''}</span>
                    <span className="font-medium text-gray-700">{formatCurrency(order.total)}</span>
                  </div>
                  {order.notes && (
                    <div className="flex items-start gap-1.5 mt-1.5 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{order.notes}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <Button variant="ghost" size="sm" onClick={() => { dispatch(takeOrder(order.id)); onClose(); }} title="Resume">
                    <Play className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => dispatch(removeHeldOrder(order.id))} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
