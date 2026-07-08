import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { cn } from '../../../shared/utils/cn';
import type { PipelineStage } from '../api/pipelineTypes';
import { useBoardAutomations, useSyncBoardAutomations } from '../api/usePipelineAutomationQueries';
import { pipelineInputClass } from './pipelineFormFields';
import {
  AUTOMATION_MESSAGE_PLACEHOLDER,
  automationTriggerLabel,
  buildAutomationDraftsFromStages,
  type StageAutomationDraft,
} from './pipelineAutomationPresets';
import { MessageSquare, Zap } from 'lucide-react';

interface BoardAutomationsSectionProps {
  boardId: number;
  stages: PipelineStage[];
  boardName?: string;
  canManage: boolean;
  compact?: boolean;
  onSaved?: () => void;
}

export default function BoardAutomationsSection({
  boardId,
  stages,
  boardName,
  canManage,
  compact = false,
  onSaved,
}: BoardAutomationsSectionProps) {
  const { data: automations = [], isLoading } = useBoardAutomations(boardId, boardId > 0);
  const syncAutomations = useSyncBoardAutomations(boardId);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sort_order - b.sort_order),
    [stages],
  );

  const [drafts, setDrafts] = useState<StageAutomationDraft[]>([]);
  const [expandedStageId, setExpandedStageId] = useState<number | null>(null);

  useEffect(() => {
    if (!sortedStages.length) return;
    setDrafts(buildAutomationDraftsFromStages(sortedStages, automations, boardName));
  }, [sortedStages, automations, boardName]);

  const activeCount = drafts.filter((draft) => draft.is_active).length;

  const toggleStage = (stageId: number, next: boolean) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.trigger_stage_id === stageId ? { ...draft, is_active: next } : draft,
      ),
    );
    if (next) setExpandedStageId(stageId);
  };

  const updateMessage = (stageId: number, body: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.trigger_stage_id === stageId ? { ...draft, action_body: body } : draft,
      ),
    );
  };

  const handleSave = async () => {
    await syncAutomations.mutateAsync(drafts);
    onSaved?.();
  };

  if (!sortedStages.length) {
    return (
      <p className="text-sm text-gray-500">Add columns to this board before setting up discussion alerts.</p>
    );
  }

  if (isLoading && !drafts.length) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-blue-50/50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Discussion alerts</p>
          <p className="mt-0.5 text-xs text-gray-600">
            Post to the board discussion when cards hit specific columns. Each board has its own columns and alerts.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sortedStages.map((stage) => {
          const draft = drafts.find((item) => item.trigger_stage_id === stage.id);
          if (!draft) return null;
          const expanded = expandedStageId === stage.id;
          const active = draft.is_active;

          return (
            <div
              key={stage.id}
              className={cn(
                'rounded-xl border transition-colors',
                active ? 'border-violet-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/70',
              )}
            >
              <div className="flex items-center gap-3 p-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: stage.color ?? '#94a3b8' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{stage.name}</p>
                  <p className="text-xs text-gray-500">{automationTriggerLabel(stage)}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">{active ? 'On' : 'Off'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    disabled={!canManage}
                    onClick={() => toggleStage(stage.id, !active)}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      active ? 'bg-violet-600' : 'bg-gray-300',
                      !canManage && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        active ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </label>
              </div>

              {active && (
                <div className="border-t border-violet-100 px-3 pb-3 pt-2">
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => setExpandedStageId(expanded ? null : stage.id)}
                    className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {expanded ? 'Hide message' : 'Customize message'}
                  </button>
                  {(expanded || compact) && (
                    <textarea
                      value={draft.action_body}
                      onChange={(e) => updateMessage(stage.id, e.target.value)}
                      rows={2}
                      disabled={!canManage}
                      className={cn(pipelineInputClass, 'min-h-[64px] resize-y text-sm')}
                      placeholder={AUTOMATION_MESSAGE_PLACEHOLDER}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManage ? (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">
            {activeCount} alert{activeCount === 1 ? '' : 's'} enabled for this board
          </p>
          <Button
            type="button"
            size="sm"
            loading={syncAutomations.isPending}
            onClick={() => void handleSave()}
          >
            Save alerts
          </Button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          {activeCount} active alert{activeCount === 1 ? '' : 's'} on this board. Only board managers can edit them.
        </p>
      )}
    </div>
  );
}
