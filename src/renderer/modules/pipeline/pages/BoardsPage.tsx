import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards } from '../api/usePipelineQueries';
import { filterBoardsForWorkspace } from '../api/pipelineBoardWorkspace';
import CreateBoardModal from '../ui/CreateBoardModal';
import BoardListCard from '../ui/BoardListCard';
import { Plus, Search } from 'lucide-react';

export default function BoardsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: boards, isLoading, isFetched } = usePipelineBoards({ salesOnly: true });

  const filtered = useMemo(() => {
    const boardList = filterBoardsForWorkspace(boards ?? [], 'pipeline');
    const q = search.trim().toLowerCase();
    if (!q) return boardList;
    return boardList.filter(
      (b) =>
        b.name.toLowerCase().includes(q)
        || (b.description?.toLowerCase().includes(q) ?? false),
    );
  }, [boards, search]);

  if (isLoading || !isFetched) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New board
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        {filtered.length} board{filtered.length === 1 ? '' : 's'}
        {search.trim() ? ' matching search' : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((board) => (
          <BoardListCard
            key={board.id}
            board={board}
            to={ROUTES.PIPELINE.BOARD(board.id)}
            showVisibility
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="py-12 text-center text-sm text-gray-500">
          {search.trim()
            ? 'No boards match your search. Try a different term or create a new board.'
            : 'No boards yet. Create your first board to get started.'}
        </Card>
      )}

      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
