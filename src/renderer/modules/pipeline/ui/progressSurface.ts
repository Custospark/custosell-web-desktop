import type { BoardProgressContext } from '../api/boardProgressTypes';

/** Frosted panels that stay readable on photo, gradient, or solid board backgrounds. */
export const PROGRESS_SURFACE = {
  hero: 'rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-5',
  panel: 'rounded-xl border border-white/60 bg-white/65 p-4 shadow-[0_4px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-5',
  chartPanel:
    'rounded-2xl border border-white/70 bg-gradient-to-br from-white/80 via-white/55 to-white/40 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-5',
  chartWell:
    'rounded-xl border border-white/50 bg-white/35 p-2 shadow-inner backdrop-blur-md',
  chipGroup: 'inline-flex flex-wrap rounded-xl border border-white/60 bg-white/55 p-1 shadow-sm backdrop-blur-xl',
  chip:
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-slate-700 hover:bg-white/80',
  chipActive: 'bg-violet-600 text-white shadow-sm hover:bg-violet-600',
  input:
    'rounded-lg border border-white/60 bg-white/70 px-2 py-1.5 text-xs text-slate-800 shadow-sm backdrop-blur-md',
  metricCard:
    'rounded-xl border border-white/65 bg-white/55 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.05)] backdrop-blur-xl',
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
  void _ctx;
  return 'My progress';
}

export function progressColumnsTitle(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Project columns';
  if (ctx.is_pipeline_board) return 'Pipeline columns';
  return 'Board columns';
}

export function progressColumnsHint(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) {
    return 'Select at least one column - task metrics and charts use these stages.';
  }
  if (ctx.is_pipeline_board) {
    return 'Select at least one column - lead metrics and charts use these stages.';
  }
  return 'Select at least one column - metrics and charts use these stages.';
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
