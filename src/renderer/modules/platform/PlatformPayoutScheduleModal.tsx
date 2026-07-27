import { useState } from 'react';
import { useUpdatePayoutSchedule } from './api/PlatformPayoutQueries';
import { Button } from '../../shared/components/buttons/Button';
import { X } from 'lucide-react';
import type { PayableEntity } from './api/PlatformPayoutTypes';

const FREQUENCIES = [
  { value: '', label: 'No schedule' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

interface Props {
  entity: PayableEntity;
  onClose: () => void;
}

export default function PlatformPayoutScheduleModal({ entity, onClose }: Props) {
  const updateMutation = useUpdatePayoutSchedule();
  const [frequency, setFrequency] = useState(entity.payout_frequency ?? '');
  const [nextPayoutAt, setNextPayoutAt] = useState(
    entity.next_payout_at ? entity.next_payout_at.slice(0, 16) : ''
  );

  const handleSubmit = () => {
    updateMutation.mutate({
      payable_type: entity.type,
      payable_id: entity.id,
      payout_frequency: frequency || null,
      next_payout_at: nextPayoutAt || null,
    }, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Payout Schedule</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Set a recurring payout schedule for <strong>{entity.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {frequency && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Next Payout Date</label>
              <input type="datetime-local" value={nextPayoutAt} onChange={(e) => setNextPayoutAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={updateMutation.isPending}>
            Save Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
