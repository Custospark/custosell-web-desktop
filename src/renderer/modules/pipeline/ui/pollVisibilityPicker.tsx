import { cn } from '../../../shared/utils/cn';
import type { ResultsVisibility } from './BoardPollsTab';

export function ResultsVisibilityPicker({
  value,
  onChange,
}: {
  value: ResultsVisibility;
  onChange: (value: ResultsVisibility) => void;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white/80 p-3">
      <p className="text-xs font-semibold text-violet-900">Results visible to</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('team')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold ring-1',
            value === 'team'
              ? 'bg-violet-600 text-white ring-violet-600'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-violet-50',
          )}
        >
          All team members
        </button>
        <button
          type="button"
          onClick={() => onChange('creator_only')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold ring-1',
            value === 'creator_only'
              ? 'bg-violet-600 text-white ring-violet-600'
              : 'bg-white text-gray-600 ring-gray-200 hover:bg-violet-50',
          )}
        >
          Only me (poll creator)
        </button>
      </div>
    </div>
  );
}
