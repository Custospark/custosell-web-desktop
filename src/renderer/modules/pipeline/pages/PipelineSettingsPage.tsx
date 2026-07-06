import { Card } from '../../../shared/components/cards/Card';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { usePipelineBoards, usePipelineSources } from '../api/usePipelineQueries';
import { Users, Lock, Share2 } from 'lucide-react';

const VISIBILITY_LABELS = {
  team: { label: 'Team', icon: Users },
  private: { label: 'Private', icon: Lock },
  shared: { label: 'Shared', icon: Share2 },
};

export default function PipelineSettingsPage() {
  const { data: boards, isLoading: boardsLoading } = usePipelineBoards();
  const { data: sources, isLoading: sourcesLoading } = usePipelineSources();

  if (boardsLoading || sourcesLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">Lead sources</h3>
        <p className="mt-1 text-xs text-gray-500">Default sources seeded for your business. Custom source management coming soon.</p>
        <ul className="mt-4 divide-y divide-gray-100">
          {(sources ?? []).map((source) => (
            <li key={source.id} className="flex items-center justify-between py-2 text-sm">
              <span>{source.name}</span>
              {source.is_system && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">System</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">Boards overview</h3>
        <p className="mt-1 text-xs text-gray-500">Archive and member management from the board kanban view (owner only).</p>
        <ul className="mt-4 divide-y divide-gray-100">
          {(boards ?? []).map((board) => {
            const vis = VISIBILITY_LABELS[board.visibility];
            const VisIcon = vis.icon;
            return (
              <li key={board.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-gray-900">{board.name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <VisIcon className="h-3.5 w-3.5" />
                  {vis.label}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
