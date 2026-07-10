import { useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useDocumentActivity } from '../api/useDocumentQueries';
import type { DocumentActivityItem } from '../api/documentTypes';
import { ChevronDown, ChevronUp, History } from 'lucide-react';

function formatActivityTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActivityRow({ entry }: { entry: DocumentActivityItem }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5 text-[11px] leading-4 text-gray-600 hover:bg-white/50">
      <UserAvatar name={entry.actor?.name ?? 'User'} avatar={entry.actor?.avatar} size="xs" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-gray-700">{entry.message}</p>
      </div>
      <span className="shrink-0 tabular-nums text-[10px] text-gray-400">{formatActivityTime(entry.created_at)}</span>
    </div>
  );
}

interface DocumentExplorerActivityProps {
  enabled?: boolean;
  className?: string;
}

export function DocumentExplorerActivity({ enabled = true, className }: DocumentExplorerActivityProps) {
  const [expanded, setExpanded] = useState(true);
  const { data, isLoading, isError } = useDocumentActivity(enabled);

  const entries = useMemo(() => data?.data ?? [], [data?.data]);

  return (
    <div className={cn('shrink-0 border-t border-white/50 bg-white/70 backdrop-blur-md', className)}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:bg-white/40"
      >
        <History className="h-3.5 w-3.5" />
        <span className="flex-1">Activity</span>
        {entries.length > 0 && (
          <span className="rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-gray-600">
            {entries.length}
          </span>
        )}
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="max-h-36 overflow-y-auto border-t border-white/40">
          {isLoading && (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          )}
          {!isLoading && isError && (
            <p className="px-3 py-3 text-center text-[11px] text-gray-500">Could not load activity.</p>
          )}
          {!isLoading && !isError && entries.length === 0 && (
            <p className="px-3 py-3 text-center text-[11px] text-gray-500">Activity will appear here as your team works.</p>
          )}
          {entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
