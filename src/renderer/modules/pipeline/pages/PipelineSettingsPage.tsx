import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import {
  useCreatePipelineSource,
  useDeletePipelineSource,
  usePipelineBoards,
  usePipelineInsights,
  usePipelineSources,
  useUpdatePipelineSource,
} from '../api/usePipelineQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { pipelineInputClass } from '../ui/pipelineFormFields';
import BoardLabelsSettings from '../ui/BoardLabelsSettings';
import BoardMetaFieldsSettings from '../ui/BoardMetaFieldsSettings';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  Kanban, Plus, Trash2, Users, Lock, Share2, Pencil, Check, X, Tag, Settings2, Layers,
} from 'lucide-react';

const VISIBILITY_LABELS = {
  team: { label: 'Team', icon: Users, className: 'bg-blue-50 text-blue-700' },
  private: { label: 'Private', icon: Lock, className: 'bg-gray-100 text-gray-700' },
  shared: { label: 'Shared', icon: Share2, className: 'bg-violet-50 text-violet-700' },
};

export default function PipelineSettingsPage() {
  const { data: boards, isLoading: boardsLoading } = usePipelineBoards({ salesOnly: true });
  const { data: sources, isLoading: sourcesLoading } = usePipelineSources();
  const { data: insights } = usePipelineInsights();
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
        <CustosellLoader />
      </div>
    );
  }

  const customSources = (sources ?? []).filter((s) => !s.is_system);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Pipeline settings</h2>
        <p className="mt-1 text-sm text-gray-500">Configure lead sources, board labels, and review your boards.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Boards</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{(boards ?? []).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Lead sources</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{(sources ?? []).length}</p>
          <p className="text-xs text-gray-400">{customSources.length} custom</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Open pipeline</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{insights?.open_leads ?? '-'}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Lead sources</h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">Track where opportunities originate. System sources cannot be renamed.</p>
          </div>
          <div className="p-5">
            <form onSubmit={handleAddSource} className="flex gap-2">
              <input
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g. Instagram, Trade fair"
                className={pipelineInputClass}
              />
              <Button type="submit" loading={createSource.isPending} className="inline-flex shrink-0 items-center gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>

            <ul className="mt-4 divide-y divide-gray-100">
              {(sources ?? []).map((source) => (
                <li key={source.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  {editingId === source.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={pipelineInputClass}
                        autoFocus
                      />
                      <button type="button" onClick={() => handleSaveEdit(source.id)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{source.name}</span>
                        {source.is_system && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">System</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!source.is_system && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditingId(source.id); setEditName(source.name); }}
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
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Board labels</h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">Create color labels for cards on each board (Trello-style).</p>
          </div>
          <div className="p-5">
            <BoardLabelsSettings />
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Custom fields</h3>
              <p className="mt-1 text-xs text-gray-500">Add custom data fields to cards on each board.</p>
            </div>
          </div>
          <div className="p-5">
            <BoardMetaFieldsSettings />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Boards directory</h3>
              <p className="text-xs text-gray-500">Open a board to edit columns, calendar view, and members.</p>
            </div>
          </div>
          <Link
            to={ROUTES.PIPELINE.BOARDS}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            <Kanban className="h-4 w-4" />
            Manage boards
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {(boards ?? []).map((board) => {
            const vis = VISIBILITY_LABELS[board.visibility];
            const VisIcon = vis.icon;
            return (
              <div key={board.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <Link
                  to={ROUTES.PIPELINE.BOARD(board.code)}
                  className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-900 hover:text-blue-600"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
                  />
                  <span className="truncate">{board.name}</span>
                  {board.is_default && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Default</span>
                  )}
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${vis.className}`}>
                    <VisIcon className="h-3 w-3" />
                    {vis.label}
                  </span>
                  <span>{board.open_leads_count ?? 0} open</span>
                </div>
              </div>
            );
          })}
          {!(boards ?? []).length && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No boards yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
