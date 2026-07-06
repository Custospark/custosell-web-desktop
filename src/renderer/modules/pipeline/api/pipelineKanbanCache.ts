import type { CSSProperties } from 'react';
import { getApiUrl } from '../../../shared/utils/env';
import type { PipelineBoard, PipelineLead } from '../api/pipelineTypes';

/** Resolve gallery or uploaded board background to a loadable image URL. */
export function resolveBoardBackgroundImageUrl(
  backgroundType: string | undefined,
  backgroundValue: string | null | undefined,
): string | null {
  if (!backgroundValue?.trim()) return null;

  const value = backgroundValue.trim();

  if (backgroundType === 'gallery') {
    return value;
  }

  if (backgroundType === 'upload') {
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
      return value;
    }
    const base = getApiUrl().replace(/\/api\/v1\/?$/, '');
    const path = value.replace(/^\/+/, '').replace(/^storage\//, '');
    return `${base}/storage/${path}`;
  }

  return null;
}

/** Normalize stored upload path (handles legacy full URLs saved in background_value). */
export function normalizeBoardBackgroundUploadPath(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  const storageMatch = trimmed.match(/\/storage\/(.+)$/);
  if (storageMatch) return storageMatch[1];
  return trimmed.replace(/^storage\//, '');
}

export function pipelineBoardImageBackgroundStyle(imageUrl: string): CSSProperties {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}

export function pipelineBoardBackgroundStyleFromBoard(
  board: Pick<PipelineBoard, 'background_type' | 'background_value' | 'cover_color'>,
): CSSProperties {
  if (board.background_type === 'color' && board.background_value) {
    return { backgroundColor: board.background_value };
  }

  const imageUrl = resolveBoardBackgroundImageUrl(board.background_type, board.background_value);
  if (imageUrl && (board.background_type === 'gallery' || board.background_type === 'upload')) {
    return pipelineBoardImageBackgroundStyle(imageUrl);
  }

  return pipelineBoardBackgroundStyle(board.cover_color);
}

/** Reliable rgba from #rgb or #rrggbb for board backgrounds. */
export function pipelineColorAlpha(hex: string | null | undefined, alpha: number): string {
  const raw = (hex ?? '#6366f1').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function pipelineBoardBackgroundStyle(coverColor: string | null | undefined): CSSProperties {
  const accent = coverColor ?? '#6366f1';
  return {
    background: [
      `linear-gradient(165deg, ${pipelineColorAlpha(accent, 0.38)} 0%, ${pipelineColorAlpha(accent, 0.14)} 28%, ${pipelineColorAlpha(accent, 0.06)} 55%, #f1f5f9 100%)`,
    ].join(', '),
  };
}

export function resolveBoardCoverColor(
  kanbanBoard: PipelineBoard | undefined,
  boardsList: PipelineBoard[],
  boardId: number,
): string {
  const fromList = boardsList.find((b) => b.id === boardId)?.cover_color;
  return kanbanBoard?.cover_color ?? fromList ?? '#6366f1';
}

export function moveLeadOptimistic(
  board: PipelineBoard,
  leadId: number,
  toStageId: number,
  position: number,
): PipelineBoard {
  if (!board.stages?.length) return board;

  let moved: PipelineLead | undefined;
  const stagesWithout = board.stages.map((stage) => ({
    ...stage,
    leads: (stage.leads ?? []).filter((lead) => {
      if (lead.id === leadId) {
        moved = lead;
        return false;
      }
      return true;
    }),
  }));

  if (!moved) return board;

  const targetMeta = board.stages.find((s) => s.id === toStageId);
  let status = moved.status;
  if (targetMeta?.is_won) status = 'won';
  else if (targetMeta?.is_lost) status = 'lost';
  else if (status !== 'converted') status = 'open';

  const updatedLead: PipelineLead = {
    ...moved,
    stage_id: toStageId,
    position,
    status,
    stage: targetMeta
      ? {
          id: targetMeta.id,
          name: targetMeta.name,
          color: targetMeta.color,
          is_won: targetMeta.is_won,
          is_lost: targetMeta.is_lost,
        }
      : moved.stage,
  };

  return {
    ...board,
    stages: stagesWithout.map((stage) => {
      if (stage.id !== toStageId) return stage;
      const nextLeads = [...(stage.leads ?? []), updatedLead].sort((a, b) => a.position - b.position);
      return { ...stage, leads: nextLeads };
    }),
  };
}

export function replaceLeadOnKanban(board: PipelineBoard, lead: PipelineLead): PipelineBoard {
  if (!board.stages?.length) return board;

  const without = board.stages.map((stage) => ({
    ...stage,
    leads: (stage.leads ?? []).filter((l) => l.id !== lead.id),
  }));

  return {
    ...board,
    stages: without.map((stage) =>
      stage.id === lead.stage_id
        ? { ...stage, leads: [...(stage.leads ?? []), lead].sort((a, b) => a.position - b.position) }
        : stage,
    ),
  };
}
