import { useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import {
  useBoardAutomationRules,
  useDeleteAutomationRule,
  useToggleAutomationRule,
  isOptimisticRule,
} from '../api/usePipelineAutomationRuleQueries';
import type { PipelineAutomationRule } from '../api/pipelineAutomationRuleTypes';
import { utcTimeToLocal } from '../api/automationTimeUtils';
import AutomationRuleBuilderModal from './AutomationRuleBuilderModal';
import AutomationRuleRunHistory from './AutomationRuleRunHistory';
import { SCHEDULED_TRIGGERS, TRIGGER_OPTIONS, ACTION_OPTIONS } from './automationRuleBuilderOptions';
import { Sparkles, Plus, Pencil, Trash2, Power, Search } from 'lucide-react';

function triggerLabel(rule: PipelineAutomationRule): string {
  const option = TRIGGER_OPTIONS.find((o) => o.value === rule.trigger.type);
  const label = option?.label ?? rule.trigger.type;
  const freq = rule.trigger.frequency ?? 'once';
  if (freq === 'once') return label;
  if (rule.trigger.type === 'recurring') {
    if (freq === 'cron') return `${label} · ${rule.trigger.cron ?? ''}`;
    if (freq === 'weekly') {
      const days = (rule.trigger.days_of_week ?? [])
        .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? d)
        .join(', ');
      return `${label} · ${days} ${rule.trigger.time ? `at ${utcTimeToLocal(rule.trigger.time)}` : ''}`;
    }
    if (freq === 'monthly') return `${label} · on the ${rule.trigger.day_of_month ?? 1} at ${utcTimeToLocal(rule.trigger.time ?? '00:00')}`;
    return `${label} · at ${utcTimeToLocal(rule.trigger.time ?? '00:00')}`;
  }
  return `${label} · ${freq} at ${utcTimeToLocal(rule.trigger.time ?? '00:00')}`;
}

function actionsSummary(rule: PipelineAutomationRule): string {
  return rule.actions
    .map((action) => ACTION_OPTIONS.find((o) => o.value === action.type)?.label ?? action.type)
    .join(' · ');
}

function formatLastRun(lastRun: string | null): string {
  if (!lastRun) return 'Never';
  const date = new Date(lastRun);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface BoardAutomationsViewProps {
  boardId: number;
  canManage?: boolean;
}

export default function BoardAutomationsView({ boardId, canManage = true }: BoardAutomationsViewProps) {
  const { data: rules = [], isLoading } = useBoardAutomationRules(boardId, boardId > 0);
  const toggleRule = useToggleAutomationRule(boardId);
  const deleteRule = useDeleteAutomationRule(boardId);
  const { confirm } = useConfirm();
  const [building, setBuilding] = useState<{ mode: 'create' | 'edit'; rule?: PipelineAutomationRule } | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return rules;
    return rules.filter((rule) => {
      const haystack = [
        rule.name,
        triggerLabel(rule),
        actionsSummary(rule),
        rule.is_active ? 'active' : 'paused',
        rule.run_count.toString(),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rules, query]);

  const handleDelete = async (rule: PipelineAutomationRule) => {
    const ok = await confirm({
      title: 'Delete automation?',
      message: `"${rule.name}" will be removed. This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteRule.mutateAsync(rule.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/40 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-fuchsia-100 p-2 text-fuchsia-600 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Automations</h2>
              <p className="truncate text-xs text-slate-500">
                Rules that move, create, and update cards automatically. Scheduled rules fire via the cron engine.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search automations"
                aria-label="Search automations"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
              />
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setBuilding({ mode: 'create' })}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New automation</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <CustosellLoader message="Loading automations" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-4 py-16 text-center shadow-sm backdrop-blur-md">
              <Sparkles className="h-9 w-9 text-fuchsia-400" />
              <p className="text-sm font-semibold text-slate-800">
                {rules.length === 0 ? 'No automations on this board yet' : 'No automations match your search'}
              </p>
              <p className="max-w-sm text-xs text-slate-600">
                {rules.length === 0
                  ? 'For example: when a card is marked high priority, move it to "Qualified" and notify the team.'
                  : 'Try a different search term.'}
              </p>
              {canManage && rules.length === 0 && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setBuilding({ mode: 'create' })}>
                  <Plus className="h-4 w-4" />
                  Create the first one
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    'flex min-h-[160px] flex-col rounded-xl border bg-white/85 p-4 shadow-sm backdrop-blur-md transition-colors',
                    rule.is_active ? 'border-fuchsia-200/70' : 'border-white/50 opacity-75',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{rule.name}</p>
                        {isOptimisticRule(rule) ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Saving...</span>
                        ) : rule.is_active ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Active</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Paused</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        <span className="font-semibold text-slate-500">When</span> {triggerLabel(rule)}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        <span className="font-semibold text-slate-500">Then</span> {actionsSummary(rule)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[11px] text-slate-500">
                    <span>
                      Runs: <span className="font-semibold text-slate-700">{rule.run_count}</span>
                    </span>
                    <span>
                      Last run: <span className="font-semibold text-slate-700">{formatLastRun(rule.last_run_at)}</span>
                    </span>
                    {SCHEDULED_TRIGGERS.includes(rule.trigger.type) && (
                      <span className="w-full text-slate-400">Fired by the cron engine every minute</span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-1 pt-3">
                    {canManage && !isOptimisticRule(rule) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void toggleRule.mutateAsync({ ruleId: rule.id, is_active: !rule.is_active })}
                          className={cn(
                            'inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                            rule.is_active
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          )}
                          title={rule.is_active ? 'Pause' : 'Activate'}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {rule.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBuilding({ mode: 'edit', rule })}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400">You can view automations but not manage them.</span>
                    )}
                  </div>

                  {!isOptimisticRule(rule) && <AutomationRuleRunHistory ruleId={rule.id} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AutomationRuleBuilderModal
        key={building ? `${building.mode}-${building.rule?.id ?? 'new'}` : 'closed'}
        boardId={boardId}
        open={building != null}
        mode={building?.mode ?? 'create'}
        rule={building?.mode === 'edit' ? building.rule : undefined}
        onClose={() => setBuilding(null)}
      />
    </div>
  );
}