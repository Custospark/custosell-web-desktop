import { Card } from '../../../shared/components/cards/Card';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import type { EstimateVersion } from '../api/estimateTypes';
import { History } from 'lucide-react';

export default function EstimateHistoryTab({ versions }: { versions?: EstimateVersion[] }) {
  const list = versions ?? [];
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <History className="h-4 w-4 text-blue-600" />
        Version history
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <History className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No version history yet.</p>
          <p className="text-xs text-gray-400 mt-1">Versions are created when you send or update an estimate.</p>
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gray-200">
          {list.map((v, idx) => (
            <div key={v.id} className="relative pb-6 last:pb-0">
              <div className={cn(
                'absolute -left-[23px] top-1 h-4 w-4 rounded-full border-2 border-white ring-2',
                idx === 0 ? 'bg-blue-500 ring-blue-300' : 'bg-gray-300 ring-gray-200',
              )} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Version {v.version}</p>
                  {v.change_summary && (
                    <p className="text-sm text-gray-500">{v.change_summary}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatShiftDate(v.created_at)}</p>
              </div>
              {v.creator && (
                <p className="mt-0.5 text-xs text-gray-400">by {v.creator.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
