import { Link } from 'react-router-dom';
import { Kanban, Star } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { PipelineBoard } from '../api/pipelineTypes';
import { pipelineBoardCardHeroStyle, pipelineColorAlpha } from '../api/pipelineKanbanCache';
import { boardUsesTaskTerminology } from '../api/pipelineBoardWorkspace';
import { PIPELINE_VISIBILITY_META } from './pipelineBoardMeta';

export interface BoardListCardProps {
  board: PipelineBoard;
  to: string;
  /** Show team/private/shared badge (Pipeline module). */
  showVisibility?: boolean;
}

export default function BoardListCard({ board, to, showVisibility = false }: BoardListCardProps) {
  const accent = board.cover_color ?? '#6366f1';
  const heroStyle = pipelineBoardCardHeroStyle(board);
  const openCount = board.open_leads_count ?? 0;
  const usesTasks = boardUsesTaskTerminology(board);
  const countNoun = usesTasks
    ? `open task${openCount === 1 ? '' : 's'}`
    : `open lead${openCount === 1 ? '' : 's'}`;
  const vis = showVisibility ? PIPELINE_VISIBILITY_META[board.visibility] : null;

  return (
    <Link to={to} className="group block h-full">
      <article
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm',
          'transition-all duration-200 ease-out',
          'group-hover:-translate-y-0.5 group-hover:shadow-lg',
        )}
        style={{ borderColor: pipelineColorAlpha(accent, 0.28) }}
      >
        <div className="relative h-28 shrink-0 overflow-hidden" style={heroStyle}>
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
          <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
            <Kanban className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 truncate font-semibold text-gray-900 group-hover:text-blue-700">
              {board.name}
              {board.is_default && (
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Default board" />
              )}
            </h3>
            {board.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{board.description}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {vis && (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', vis.className)}>
                <vis.icon className="h-3 w-3" />
                {vis.label}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium',
                showVisibility ? 'text-gray-500' : 'bg-gray-50 text-gray-600',
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              {openCount} {countNoun}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
