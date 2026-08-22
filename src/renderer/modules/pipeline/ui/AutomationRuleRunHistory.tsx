import { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { useAutomationRuleRuns } from '../api/usePipelineAutomationRuleQueries';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';

interface AutomationRuleRunHistoryProps {
  ruleId: number;
}

function formatRunTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AutomationRuleRunHistory({ ruleId }: AutomationRuleRunHistoryProps) {
  const [open, setOpen] = useState(false);
  const { data: runs = [], isLoading, isFetching } = useAutomationRuleRuns(ruleId, open);

  return (
    <div className="mt-2.5 border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:text-indigo-600"
        title="Run history"
        aria-expanded={open}
      >
        <History className="h-3.5 w-3.5" />
        Run history
        <span className="text-slate-400">({runs.length})</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading ? (
            <div className="py-2">
              <CustosellLoader message="Loading runs" />
            </div>
          ) : runs.length === 0 ? (
            <p className="py-1 text-[11px] text-slate-400">No runs yet.</p>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-gray-50/70 px-2.5 py-1.5 text-[11px]"
              >
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    run.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700',
                  )}
                >
                  {run.status}
                </span>
                <span className="text-slate-600">
                  {run.actions_executed} action{run.actions_executed === 1 ? '' : 's'}
                </span>
                {run.lead_title && <span className="text-slate-500">· {run.lead_title}</span>}
                <span className="ml-auto text-slate-400">{formatRunTime(run.created_at)}</span>
                {run.message && <p className="w-full text-red-600/80">{run.message}</p>}
              </div>
            ))
          )}
          {isFetching && runs.length > 0 && (
            <p className="text-[10px] text-slate-400">Refreshing...</p>
          )}
        </div>
      )}
    </div>
  );
}