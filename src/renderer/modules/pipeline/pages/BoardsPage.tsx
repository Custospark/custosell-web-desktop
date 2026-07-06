import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards } from '../api/usePipelineQueries';
import CreateBoardModal from '../ui/CreateBoardModal';
import { PIPELINE_VISIBILITY_META } from '../ui/pipelineBoardMeta';
import { Plus, Kanban, Search, Star } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export default function BoardsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: boards, isLoading, isFetched } = usePipelineBoards();

  const filtered = useMemo(() => {
    const boardList = boards ?? [];
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
        {filtered.map((board) => {
          const vis = PIPELINE_VISIBILITY_META[board.visibility];
          const VisIcon = vis.icon;
          return (
            <Link key={board.id} to={ROUTES.PIPELINE.BOARD(board.id)} className="group block">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <div
                  className="mb-3 h-2 rounded-full"
                  style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate font-semibold text-gray-900 group-hover:text-blue-700">
                      {board.name}
                      {board.is_default && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </h3>
                    {board.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{board.description}</p>
                    )}
                  </div>
                  <Kanban className="h-5 w-5 shrink-0 text-gray-400" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', vis.className)}>
                    <VisIcon className="h-3 w-3" />
                    {vis.label}
                  </span>
                  <span className="text-gray-500">{board.open_leads_count ?? 0} open {board.project_id ? 'tasks' : 'leads'}</span>
                </div>
              </Card>
            </Link>
          );
        })}
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
