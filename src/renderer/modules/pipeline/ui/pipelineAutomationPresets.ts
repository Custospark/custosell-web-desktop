import type { PipelineStage } from '../api/pipelineTypes';

export interface StageAutomationDraft {
  trigger_type: 'stage_entered' | 'status_won' | 'status_lost';
  trigger_stage_id: number | null;
  action_body: string;
  is_active: boolean;
}

export const AUTOMATION_MESSAGE_PLACEHOLDER =
  'Use {card}, {column}, {board}, and {status} in your message.';

export function defaultAutomationMessage(stage: PipelineStage, boardName?: string): string {
  if (stage.is_won) {
    return `🎉 {card} was won on ${boardName ?? '{board}'}!`;
  }
  if (stage.is_lost) {
    return `{card} was marked lost on ${boardName ?? '{board}'}.`;
  }
  return `📋 {card} moved to ${stage.name} on ${boardName ?? '{board}'}.`;
}

/** Preview stage names used before a board exists (matches backend defaults). */
export const PIPELINE_STAGE_PRESETS = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed won',
  'Closed lost',
] as const;

export const ESTIMATES_STAGE_PRESETS = ['To Do', 'In Progress', 'Review', 'Done'] as const;

export function buildAutomationDraftsFromStages(
  stages: PipelineStage[],
  existing?: Array<{ trigger_type: string; trigger_stage_id?: number | null; action_body: string; is_active?: boolean }>,
  boardName?: string,
): StageAutomationDraft[] {
  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);

  return sorted.map((stage) => {
    const match = existing?.find(
      (item) =>
        item.trigger_type === 'stage_entered' && Number(item.trigger_stage_id) === stage.id,
    );

    return {
      trigger_type: 'stage_entered',
      trigger_stage_id: stage.id,
      action_body: match?.action_body ?? defaultAutomationMessage(stage, boardName),
      is_active: match ? Boolean(match.is_active ?? true) : stage.is_won || stage.is_lost,
    };
  });
}

export function automationTriggerLabel(stage: PipelineStage): string {
  if (stage.is_won) return 'Card won';
  if (stage.is_lost) return 'Card lost';
  return `Card enters “${stage.name}”`;
}
