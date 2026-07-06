import type { PipelineCardType } from './pipelineTypes';

export function isPipelineLead(cardType?: PipelineCardType | null): boolean {
  return (cardType ?? 'lead') === 'lead';
}

/** Capitalized singular noun for toasts and headings, e.g. "Lead" or "Card". */
export function pipelineItemLabel(cardType?: PipelineCardType | null): string {
  return isPipelineLead(cardType) ? 'Lead' : 'Card';
}
