import type { BoardProgressContext } from '../api/boardProgressTypes';

/** Frosted panels that stay readable on photo, gradient, or solid board backgrounds. */
export const PROGRESS_SURFACE = {
  hero: 'rounded-2xl border border-white/55 bg-white/85 p-4 shadow-md backdrop-blur-lg sm:p-5',
  panel: 'rounded-xl border border-white/55 bg-white/82 p-4 shadow-sm backdrop-blur-md sm:p-5',
  chipGroup: 'inline-flex flex-wrap rounded-xl border border-white/50 bg-white/75 p-1 shadow-sm backdrop-blur-md',
  chip:
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-slate-700 hover:bg-white/90',
  chipActive: 'bg-violet-600 text-white shadow-sm hover:bg-violet-600',
  input:
    'rounded-lg border border-white/50 bg-white/85 px-2 py-1.5 text-xs text-slate-800 shadow-sm backdrop-blur-sm',
  metricCard:
    'rounded-xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur-md',
  textTitle: 'text-slate-900',
  textBody: 'text-slate-700',
  textMuted: 'text-slate-600',
} as const;

export function progressTeamTabLabel(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Team delivery';
  if (ctx.is_pipeline_board) return 'Team pipeline';
  return 'Team progress';
}

export function progressMyTabLabel(_ctx: BoardProgressContext): string {
  return 'My progress';
}

export function progressColumnsTitle(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Project columns';
  if (ctx.is_pipeline_board) return 'Pipeline columns';
  return 'Board columns';
}

export function progressColumnsHint(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) {
    return 'Select at least one column — task metrics and charts use these stages.';
  }
  if (ctx.is_pipeline_board) {
    return 'Select at least one column — lead metrics and charts use these stages.';
  }
  return 'Select at least one column — metrics and charts use these stages.';
}

export function progressAddTargetLabel(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Add project target';
  if (ctx.is_pipeline_board) return 'Add pipeline target';
  return 'Add target';
}

export function progressTargetsSectionTitle(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Project targets';
  if (ctx.is_pipeline_board) return 'Pipeline targets';
  return 'Targets';
}

export function progressTargetsEmptyHint(ctx: BoardProgressContext, canManage: boolean): string {
  if (canManage) {
    return ctx.is_project_board
      ? 'Add KPIs, goals, or OKRs so the team knows what delivery success looks like.'
      : ctx.is_pipeline_board
        ? 'Add KPIs, goals, or OKRs so the team knows what pipeline success looks like.'
        : 'Add KPIs, goals, or OKRs so the team knows what success looks like.';
  }
  return 'Your board manager can define targets here.';
}
