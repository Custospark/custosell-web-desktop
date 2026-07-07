import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { PipelineBoard } from '../api/pipelineTypes';
import { cn } from '../../../shared/utils/cn';

interface BoardSwitcherStripProps {
  boards: PipelineBoard[];
  activeBoardId: number;
  onCreateBoard: () => void;
  boardRoute?: (id: number) => string;
  allowCreateBoard?: boolean;
}

export default function BoardSwitcherStrip({
  boards,
  activeBoardId,
  onCreateBoard,
  boardRoute = ROUTES.PIPELINE.BOARD,
  allowCreateBoard = true,
}: BoardSwitcherStripProps) {
  const navigate = useNavigate();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeBoardId]);

  return (
    <div className="relative z-30 shrink-0 border-t border-gray-200/80 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 scrollbar-thin">
        {boards.map((board) => {
          const isActive = board.id === activeBoardId;
          return (
            <button
              key={board.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => navigate(boardRoute(board.id))}
              className={cn(
                'inline-flex max-w-[200px] shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
              title={board.name}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
              />
              <span className="truncate">{board.name}</span>
              {!isActive && (board.open_leads_count ?? 0) > 0 && (
                <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                  {board.open_leads_count}
                </span>
              )}
            </button>
          );
        })}
        {allowCreateBoard && (
        <button
          type="button"
          onClick={onCreateBoard}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
          New board
        </button>
        )}
      </div>
    </div>
  );
}
