import { usePayoutHistory } from './api/PlatformPayoutQueries';
import { Button } from '../../shared/components/buttons/Button';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PayableEntity } from './api/PlatformPayoutTypes';

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  scheduled: Clock,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'text-green-600',
  scheduled: 'text-amber-600',
  cancelled: 'text-red-400',
};

interface Props {
  entity: PayableEntity;
  onClose: () => void;
}

export default function PlatformPayoutHistoryModal({ entity, onClose }: Props) {
  const { data: payouts = [], isLoading } = usePayoutHistory(entity.type, entity.user_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Payout History</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{formatUSD(entity.total_earned)}</p>
              <p className="text-[10px] text-gray-500">Earned</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-lg font-bold text-green-700">{formatUSD(entity.total_paid)}</p>
              <p className="text-[10px] text-green-600">Paid</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{formatUSD(entity.pending)}</p>
              <p className="text-[10px] text-amber-600">Pending</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No payout records yet</div>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => {
                const Icon = STATUS_ICONS[p.status] ?? Clock;
                const color = STATUS_COLORS[p.status] ?? 'text-gray-400';
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatUSD(p.amount)}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{p.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {p.paid_at
                          ? formatDistanceToNow(new Date(p.paid_at), { addSuffix: true })
                          : p.scheduled_at
                            ? formatDistanceToNow(new Date(p.scheduled_at), { addSuffix: true })
                            : '—'}
                      </p>
                      {p.paid_by_user && (
                        <p className="text-[10px] text-gray-400">by {p.paid_by_user.name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
