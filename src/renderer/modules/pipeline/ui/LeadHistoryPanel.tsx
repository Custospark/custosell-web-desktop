import { ArrowRight, History } from 'lucide-react';
import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { cn } from '../../../shared/utils/cn';
import { historyIconForActivity } from './pipelineActivityMeta';
import { buildHistoryTimeline, formatHistoryActivity } from './pipelineActivityHistory';
import { PipelineUserAttribution } from './pipelineUserAttribution';

interface LeadHistoryPanelProps {
  activities?: PipelineLeadActivity[];
  currency?: string;
  compact?: boolean;
}

export default function LeadHistoryPanel({
  activities = [],
  currency = 'UGX',
  compact = false,
}: LeadHistoryPanelProps) {
  const timeline = buildHistoryTimeline(activities);

  if (timeline.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-gray-200 text-center', compact ? 'py-10' : 'py-12')}>
        <History className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">No activity yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Comments, moves, attachments, reactions, and all updates appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn('relative space-y-0', compact ? 'max-h-[min(60vh,480px)] overflow-y-auto pr-1' : '')}>
      {timeline.map((activity, index) => {
        const Icon = historyIconForActivity(activity);
        const display = formatHistoryActivity(activity, currency);
        const showFromTo = display.fromLabel != null && display.toLabel != null;

        return (
          <li
            key={activity.id}
            className={cn('relative flex gap-3 pb-5 last:pb-0', display.isReply && 'ml-6')}
          >
            {index < timeline.length - 1 && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200"
                aria-hidden
              />
            )}
            <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-900">{display.headline}</p>
              {display.detail && !showFromTo && (
                <p className="mt-0.5 text-sm text-gray-600">{display.detail}</p>
              )}
              {showFromTo && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {display.fromLabel}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                    {display.toLabel}
                  </span>
                </div>
              )}
              <div className="mt-2">
                <PipelineUserAttribution user={activity.user} timestamp={activity.created_at} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
