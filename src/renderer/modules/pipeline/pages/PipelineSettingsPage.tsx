import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useCreatePipelineSource,
  useDeletePipelineSource,
  usePipelineBoards,
  usePipelineSources,
  useUpdatePipelineSource,
} from '../api/usePipelineQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { pipelineInputClass } from '../ui/pipelineFormFields';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { Kanban, Plus, Trash2, Users, Lock, Share2, Pencil, Check, X } from 'lucide-react';

const VISIBILITY_LABELS = {
  team: { label: 'Team', icon: Users },
  private: { label: 'Private', icon: Lock },
  shared: { label: 'Shared', icon: Share2 },
};

export default function PipelineSettingsPage() {
  const { data: boards, isLoading: boardsLoading } = usePipelineBoards();
  const { data: sources, isLoading: sourcesLoading } = usePipelineSources();
  const createSource = useCreatePipelineSource();
  const updateSource = useUpdatePipelineSource();
  const deleteSource = useDeletePipelineSource();
  const { confirm } = useConfirm();

  const [newSourceName, setNewSourceName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  if (boardsLoading || sourcesLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    await createSource.mutateAsync({ name: newSourceName.trim() });
    setNewSourceName('');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    await updateSource.mutateAsync({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleDeleteSource = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Delete source?',
      message: `"${name}" will be removed. Leads using this source will show no source.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteSource.mutateAsync(id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">Lead sources</h3>
        <p className="mt-1 text-xs text-gray-500">Manage where your leads come from.</p>

        <form onSubmit={handleAddSource} className="mt-4 flex gap-2">
          <input
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="New source name"
            className={pipelineInputClass}
          />
          <Button type="submit" loading={createSource.isPending} className="inline-flex shrink-0 items-center gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        <ul className="mt-4 divide-y divide-gray-100">
          {(sources ?? []).map((source) => (
            <li key={source.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              {editingId === source.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={pipelineInputClass}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(source.id)}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span>{source.name}</span>
                  <div className="flex items-center gap-2">
                    {source.is_system && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">System</span>
                    )}
                    {!source.is_system && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(source.id);
                            setEditName(source.name);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(source.id, source.name)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">Boards overview</h3>
        <p className="mt-1 text-xs text-gray-500">Open a board to edit columns, calendar, and archive settings.</p>
        <ul className="mt-4 divide-y divide-gray-100">
          {(boards ?? []).map((board) => {
            const vis = VISIBILITY_LABELS[board.visibility];
            const VisIcon = vis.icon;
            return (
              <li key={board.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link
                  to={ROUTES.PIPELINE.BOARD(board.id)}
                  className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-900 hover:text-blue-600"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
                  />
                  <span className="truncate">{board.name}</span>
                  {board.is_default && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      Default
                    </span>
                  )}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-500">
                  <VisIcon className="h-3.5 w-3.5" />
                  {vis.label}
                </span>
              </li>
            );
          })}
        </ul>
        {!(boards ?? []).length && (
          <p className="mt-4 text-sm text-gray-500">No boards yet.</p>
        )}
        <Link
          to={ROUTES.PIPELINE.BOARDS}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <Kanban className="h-4 w-4" />
          Go to boards
        </Link>
      </Card>
    </div>
  );
}
