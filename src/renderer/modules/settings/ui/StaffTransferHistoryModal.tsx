import { useMemo } from 'react';
import { ArrowRight, GitBranch } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { useStaffTransfers } from '../api/settings/StaffTransferQueries';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { cn } from '../../../shared/utils/cn';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';

interface StaffTransferHistoryModalProps {
  open: boolean;
  onClose: () => void;
  staff: StaffWithSyncMeta | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status: string) {
  const classes = status === 'completed'
    ? 'bg-green-100 text-green-700'
    : status === 'pending'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', classes)}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function StaffTransferHistoryModal({ open, onClose, staff }: StaffTransferHistoryModalProps) {
  const { data: transfers, isLoading } = useStaffTransfers();

  const history = useMemo(() => {
    if (!staff) return [];
    return (transfers ?? [])
      .filter((t) => t.user_id === staff.id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [transfers, staff]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={staff ? `${staff.name} — transfer history` : 'Transfer history'}
      subtitle="Branch moves recorded for this staff member"
      size="lg"
    >
      {isLoading ? (
        <LoadingSkeleton variant="list" />
      ) : history.length === 0 ? (
        <div className="py-10 text-center">
          <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No transfers recorded for {staff?.name ?? 'this staff member'} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  {t.from_location?.name ?? '—'}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <GitBranch className="w-4 h-4 text-indigo-500" />
                  {t.to_location?.name ?? `Branch #${t.to_location_id}`}
                </span>
                <span className="ml-auto">{statusBadge(t.status)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="capitalize">{t.transfer_type} transfer</span>
                <span>Effective {formatDate(t.effective_at)}</span>
                {t.end_at ? <span>Returns {formatDate(t.end_at)}</span> : null}
                <span>Recorded {formatDate(t.created_at)}</span>
              </div>
              {t.reason ? <p className="mt-2 text-sm text-gray-600">{t.reason}</p> : null}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
