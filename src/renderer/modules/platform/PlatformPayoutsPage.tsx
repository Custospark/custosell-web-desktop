import { useState } from 'react';
import { usePayables } from './api/PlatformPayoutQueries';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Table } from '../../shared/components/tables/Table';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { DollarSign, CalendarDays, Wallet } from 'lucide-react';
import PlatformRecordPayoutModal from './PlatformRecordPayoutModal';
import PlatformPayoutScheduleModal from './PlatformPayoutScheduleModal';
import PlatformPayoutHistoryModal from './PlatformPayoutHistoryModal';
import type { PayableEntity } from './api/PlatformPayoutTypes';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export default function PlatformPayoutsPage() {
  const { data: payables = [], isLoading } = usePayables();
  const [recordFor, setRecordFor] = useState<PayableEntity | null>(null);
  const [scheduleFor, setScheduleFor] = useState<PayableEntity | null>(null);
  const [historyFor, setHistoryFor] = useState<PayableEntity | null>(null);

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">Manage payouts for sales reps and referral rewards</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {payables.length > 0 ? (
          <Table
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r: PayableEntity) => (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (r: PayableEntity) => (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'sales_rep' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                    {r.type === 'sales_rep' ? 'Sales Rep' : 'User'}
                  </span>
                ),
              },
              {
                key: 'total_earned',
                header: 'Total Earned',
                align: 'right',
                render: (r: PayableEntity) => <span className="text-sm font-medium text-gray-900">{formatUSD(r.total_earned)}</span>,
              },
              {
                key: 'total_paid',
                header: 'Paid',
                align: 'right',
                render: (r: PayableEntity) => <span className="text-sm text-gray-600">{formatUSD(r.total_paid)}</span>,
              },
              {
                key: 'pending',
                header: 'Pending',
                align: 'right',
                render: (r: PayableEntity) => (
                  <span className={`text-sm font-semibold ${r.pending > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                    {formatUSD(r.pending)}
                  </span>
                ),
              },
              {
                key: 'schedule',
                header: 'Schedule',
                render: (r: PayableEntity) => {
                  if (!r.payout_frequency) return <span className="text-xs text-gray-400">None</span>;
                  const isOverdue = r.next_payout_at && new Date(r.next_payout_at) < new Date() && r.pending > 0;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600">{FREQUENCY_LABELS[r.payout_frequency] ?? r.payout_frequency}</span>
                      {r.next_payout_at && (
                        <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {new Date(r.next_payout_at).toLocaleDateString('en-UG')}
                        </span>
                      )}
                      {isOverdue && <span className="text-[10px] text-red-600 font-bold">OVERDUE</span>}
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r: PayableEntity) => (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setHistoryFor(r)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer" title="View history">
                      <Wallet className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setScheduleFor(r)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Edit schedule">
                      <CalendarDays className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setRecordFor(r)}
                      disabled={r.pending <= 0}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-amber-50 text-amber-700 hover:bg-amber-100"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Pay
                    </button>
                  </div>
                ),
              },
            ]}
            data={payables}
          />
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No pending payables</p>
            <p className="text-xs text-gray-400 mt-1">Sales rep commissions and referral rewards will appear here</p>
          </div>
        )}
      </div>

      {recordFor && (
        <PlatformRecordPayoutModal
          entity={recordFor}
          onClose={() => setRecordFor(null)}
        />
      )}
      {scheduleFor && (
        <PlatformPayoutScheduleModal
          entity={scheduleFor}
          onClose={() => setScheduleFor(null)}
        />
      )}
      {historyFor && (
        <PlatformPayoutHistoryModal
          entity={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}
