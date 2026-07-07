import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards } from '../../pipeline/api/usePipelineQueries';
import { filterBoardsForWorkspace } from '../../pipeline/api/pipelineBoardWorkspace';
import CreateBoardModal from '../../pipeline/ui/CreateBoardModal';
import { Kanban, Plus, Search } from 'lucide-react';
import type { PipelineBoard } from '../../pipeline/api/pipelineTypes';

function BoardCard({ board }: { board: PipelineBoard }) {
  return (
    <Link key={board.id} to={ROUTES.ESTIMATES.BOARD(board.id)} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <div
          className="mb-3 h-2 rounded-full"
          style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
        />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-blue-700">
              {board.name}
            </h3>
            {board.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{board.description}</p>
            )}
          </div>
          <Kanban className="h-5 w-5 shrink-0 text-gray-400" />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          {board.open_leads_count ?? 0} open task{(board.open_leads_count ?? 0) === 1 ? '' : 's'}
        </div>
      </Card>
    </Link>
  );
}

export default function ProjectBoardsPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: boards, isLoading, isFetched } = usePipelineBoards({ estimatesWorkspace: true });

  const { projectBoards, personalBoards } = useMemo(() => {
    const boardList = filterBoardsForWorkspace(boards ?? [], 'estimates');
    return {
      projectBoards: boardList.filter((b) => b.project_id),
      personalBoards: boardList.filter((b) => !b.project_id),
    };
  }, [boards]);

  const filterBoards = (list: PipelineBoard[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(q)
        || (b.description?.toLowerCase().includes(q) ?? false),
    );
  };

  const filteredProjectBoards = filterBoards(projectBoards);
  const filteredPersonalBoards = filterBoards(personalBoards);
  const totalCount = filteredProjectBoards.length + filteredPersonalBoards.length;

  if (isLoading || !isFetched) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project boards</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your personal boards and client project boards — manage tasks in full kanban view.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New personal board
        </Button>
      </div>

      <div className="relative min-w-[200px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search boards…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <p className="text-sm text-gray-600">
        {totalCount} board{totalCount === 1 ? '' : 's'}
        {search.trim() ? ' matching search' : ''}
      </p>

      {filteredPersonalBoards.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">My boards</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPersonalBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Project boards</h3>
        {filteredProjectBoards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjectBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        ) : (
          <Card className="py-12 text-center text-sm text-gray-500">
            {search.trim()
              ? 'No project boards match your search.'
              : 'No client project boards yet. Boards are created when an estimate converts to a project.'}
          </Card>
        )}
      </section>

      {totalCount === 0 && !search.trim() && (
        <Card className="py-12 text-center text-sm text-gray-500">
          Create a personal board to manage your own tasks, or wait until you are invited to a project board.
        </Card>
      )}

      <CreateBoardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspace="estimates"
      />
    </div>
  );
}
