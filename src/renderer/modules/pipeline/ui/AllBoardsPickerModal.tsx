import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FolderKanban, LayoutGrid, Search, UserRound } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { PipelineBoard } from '../api/pipelineTypes';
import BoardListCard from './BoardListCard';
import { cn } from '../../../shared/utils/cn';

interface AllBoardsPickerModalProps {
  open: boolean;
  onClose: () => void;
  boards: PipelineBoard[];
  activeBoardId: number;
  boardRoute?: (id: number) => string;
  boardsListRoute?: string;
  workspace?: 'pipeline' | 'estimates';
}

function filterBoards(boards: PipelineBoard[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return boards;
  return boards.filter(
    (b) =>
      b.name.toLowerCase().includes(q)
      || (b.description?.toLowerCase().includes(q) ?? false),
  );
}

function SectionHeading({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof UserRound;
  label: string;
  tone: 'indigo' | 'violet';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  return (
    <div className="flex items-center gap-2 px-0.5">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1', tones[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
    </div>
  );
}

function BoardGrid({
  boards,
  activeBoardId,
  showVisibility,
  onSelect,
}: {
  boards: PipelineBoard[];
  activeBoardId: number;
  showVisibility: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <BoardListCard
          key={board.id}
          board={board}
          variant="compact"
          showVisibility={showVisibility}
          showRole={showVisibility}
          isActive={board.id === activeBoardId}
          onSelect={() => onSelect(board.id)}
        />
      ))}
    </div>
  );
}

export default function AllBoardsPickerModal({
  open,
  onClose,
  boards,
  activeBoardId,
  boardRoute = ROUTES.PIPELINE.BOARD,
  boardsListRoute = ROUTES.PIPELINE.BOARDS,
  workspace = 'pipeline',
}: AllBoardsPickerModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const isEstimates = workspace === 'estimates';
  const showVisibility = workspace === 'pipeline';

  const filteredBoards = useMemo(() => filterBoards(boards, query), [boards, query]);

  const { personalBoards, projectBoards } = useMemo(() => {
    if (!isEstimates) {
      return { personalBoards: [] as PipelineBoard[], projectBoards: [] as PipelineBoard[] };
    }
    return {
      personalBoards: filteredBoards.filter((b) => !b.project_id),
      projectBoards: filteredBoards.filter((b) => b.project_id),
    };
  }, [filteredBoards, isEstimates]);

  const handleSelect = (id: number) => {
    setQuery('');
    onClose();
    if (id !== activeBoardId) {
      navigate(boardRoute(id));
    }
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleAllBoards = () => {
    setQuery('');
    onClose();
    navigate(boardsListRoute);
  };

  const totalCount = filteredBoards.length;
  const empty = totalCount === 0;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Switch boards"
      subtitle="Pick a board to jump right in"
      titleCentered
      size="xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search boards…"
              className="w-full rounded-xl border border-indigo-200/80 bg-indigo-50/30 py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
            />
          </div>
          <p className="shrink-0 text-sm text-gray-600 sm:text-right">
            {totalCount} board{totalCount === 1 ? '' : 's'}
            {query.trim() ? ' found' : ''}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
          {empty ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {query.trim()
                ? 'No boards match your search.'
                : 'No boards available.'}
            </p>
          ) : isEstimates ? (
            <div className="space-y-4">
              {personalBoards.length > 0 && (
                <section className="space-y-2">
                  <SectionHeading icon={UserRound} label="My boards" tone="indigo" />
                  <BoardGrid
                    boards={personalBoards}
                    activeBoardId={activeBoardId}
                    showVisibility={showVisibility}
                    onSelect={handleSelect}
                  />
                </section>
              )}
              {projectBoards.length > 0 && (
                <section className="space-y-2">
                  <SectionHeading icon={Briefcase} label="Project boards" tone="violet" />
                  <BoardGrid
                    boards={projectBoards}
                    activeBoardId={activeBoardId}
                    showVisibility={showVisibility}
                    onSelect={handleSelect}
                  />
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <SectionHeading icon={FolderKanban} label="Your boards" tone="indigo" />
              <BoardGrid
                boards={filteredBoards}
                activeBoardId={activeBoardId}
                showVisibility={showVisibility}
                onSelect={handleSelect}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-indigo-100/80 pt-3">
          <button
            type="button"
            onClick={handleAllBoards}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-200/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
              'bg-gradient-to-r from-indigo-50 via-white to-blue-50 text-indigo-800',
              'hover:border-indigo-300 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md hover:shadow-indigo-200/40',
            )}
          >
            <LayoutGrid className="h-4 w-4 text-indigo-600" />
            All boards
          </button>
        </div>
      </div>
    </Modal>
  );
}
