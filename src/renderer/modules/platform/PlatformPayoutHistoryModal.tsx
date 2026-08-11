import { usePayoutHistory } from './api/PlatformPayoutQueries';
import { Button } from '../../shared/components/buttons/Button';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { formatUSD } from '../../shared/utils/formatCurrency';
import {
  X, Clock, CheckCircle2, XCircle, Mail, Phone, Smartphone, Building2,
} from 'lucide-react';
import { format } from 'date-fns';
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

const STATUS_BG: Record<string, string> = {
  paid: 'bg-green-50 border-green-100',
  scheduled: 'bg-amber-50 border-amber-100',
  cancelled: 'bg-red-50 border-red-100',
};

interface Props {
  entity: PayableEntity;
  onClose: () => void;
}

export default function PlatformPayoutHistoryModal({ entity, onClose }: Props) {
  const { data: payouts = [], isLoading } = usePayoutHistory(entity.type, entity.id);
  const paginated = usePagination(payouts, 5);

  const formatWhen = (p: { paid_at: string | null; scheduled_at: string | null }): string => {
    const raw = p.paid_at ?? p.scheduled_at;
    if (!raw) return '—';
    const d = new Date(raw);
    return format(d, 'MMM d, yyyy · h:mm a');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Payout History</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{entity.name}</p>
              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${entity.type === 'sales_rep' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                {entity.type === 'sales_rep' ? 'Sales Rep' : 'User'}
              </span>
            </div>
            <div className="text-right space-y-1">
              {entity.email && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end">
                  <Mail className="w-3 h-3" />
                  <span>{entity.email}</span>
                </div>
              )}
              {entity.phone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-end">
                  <Phone className="w-3 h-3" />
                  <span>{entity.phone}</span>
                </div>
              )}
            </div>
          </div>

          {entity.mobile_money_provider && entity.mobile_money_number && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
              <Smartphone className="w-3 h-3" />
              <span>{entity.mobile_money_provider} — {entity.mobile_money_number}{entity.mobile_money_name ? ` (${entity.mobile_money_name})` : ''}</span>
            </div>
          )}
          {(entity.bank_name && entity.bank_account_name) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
              <Building2 className="w-3 h-3" />
              <span>{entity.bank_name} — {entity.bank_account_name}</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
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
              <p className="text-[10px] text-amber-600">Due</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-gray-400">Loading...</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No payout records yet</div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                {paginated.data.map((p) => {
                  const Icon = STATUS_ICONS[p.status] ?? Clock;
                  const color = STATUS_COLORS[p.status] ?? 'text-gray-400';
                  const bg = STATUS_BG[p.status] ?? 'border-gray-100';
                  return (
                    <div key={p.id} className={`flex items-start justify-between rounded-lg border ${bg} px-4 py-3`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{formatUSD(p.amount)}</p>
                          <p className="text-[11px] text-gray-400 capitalize">{p.status}</p>
                          {p.notes && (
                            <p className="text-[11px] text-gray-500 mt-1 italic">{p.notes}</p>
                          )}
                          {p.payment_method && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{p.payment_method}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">{formatWhen(p)}</p>
                        {p.paid_by_user && (
                          <p className="text-[10px] text-gray-400">by {p.paid_by_user.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                currentPage={paginated.page}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                pageSize={paginated.pageSize}
                onPageChange={paginated.setPage}
                onPageSizeChange={paginated.setPageSize}
              />
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
