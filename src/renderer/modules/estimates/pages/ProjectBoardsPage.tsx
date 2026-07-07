import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards } from '../../pipeline/api/usePipelineQueries';
import { Kanban, Search } from 'lucide-react';

export default function ProjectBoardsPage() {
  const [search, setSearch] = useState('');
  const { data: boards, isLoading, isFetched } = usePipelineBoards({ projectOnly: true });

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
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Project boards</h2>
        <p className="mt-1 text-sm text-gray-500">
          Kanban workspaces for your projects — switch boards and manage tasks in full view.
        </p>
      </div>

      <div className="relative min-w-[200px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project boards…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <p className="text-sm text-gray-600">
        {filtered.length} board{filtered.length === 1 ? '' : 's'}
        {search.trim() ? ' matching search' : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((board) => (
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
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="py-12 text-center text-sm text-gray-500">
          {search.trim()
            ? 'No project boards match your search.'
            : 'No project boards yet. Boards are created when you convert an estimate to a project.'}
        </Card>
      )}
    </div>
  );
}
