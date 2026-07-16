import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import {
  useCreatePipelineLabel,
  useUpdatePipelineLabel,
  useDeletePipelineLabel,
  usePipelineBoards,
  usePipelineLabels,
} from '../api/usePipelineQueries';
import { pipelineInputClass } from './pipelineFormFields';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { cn } from '../../../shared/utils/cn';
import { Plus, Tag, Trash2, Pencil, X, Check } from 'lucide-react';

const LABEL_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function BoardLabelsSettings() {
  const { data: boards = [] } = usePipelineBoards({ salesOnly: true });
  const [boardId, setBoardId] = useState<number | ''>('');
  const resolvedBoardId = boardId === '' ? boards[0]?.id : boardId;
  const { data: labels = [] } = usePipelineLabels(resolvedBoardId);
  const createLabel = useCreatePipelineLabel(resolvedBoardId ?? 0);
  const updateLabel = useUpdatePipelineLabel(resolvedBoardId ?? 0);
  const deleteLabel = useDeletePipelineLabel(resolvedBoardId ?? 0);
  const { confirm } = useConfirm();

  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedBoardId || !name.trim()) return;
    await createLabel.mutateAsync({ name: name.trim(), color });
    setName('');
  };

  const startEdit = (label: { id: number; name: string; color: string }) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    await updateLabel.mutateAsync({ id, name: editName.trim(), color: editColor });
    cancelEdit();
  };

  const handleDelete = async (id: number, labelName: string) => {
    const ok = await confirm({
      title: 'Delete label?',
      message: `"${labelName}" will be removed from this board. Cards will keep their other labels.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteLabel.mutateAsync(id);
  };

  if (!boards.length) {
    return <p className="text-sm text-gray-500">Create a board first to manage labels.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Board</label>
        <select
          value={resolvedBoardId ?? ''}
          onChange={(e) => setBoardId(Number(e.target.value))}
          className={pipelineInputClass}
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-3">
        <p className="text-xs font-medium text-gray-700">Create custom label</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name"
          className={cn(pipelineInputClass, 'pl-3 text-sm')}
        />
        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'h-7 w-7 rounded-md ring-2 ring-offset-1',
                color === c ? 'ring-gray-500' : 'ring-transparent',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <Button type="submit" size="sm" loading={createLabel.isPending} disabled={!name.trim()} className="inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add label
        </Button>
      </form>

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {labels.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-gray-500">No labels on this board yet.</li>
        ) : (
          labels.map((label) => (
            <li key={label.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              {editingId === label.id ? (
                <div className="flex w-full flex-col gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Label name"
                    className={cn(pipelineInputClass, 'pl-3 text-sm')}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); void saveEdit(label.id); }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn(
                            'h-6 w-6 rounded-md ring-2 ring-offset-1',
                            editColor === c ? 'ring-gray-500' : 'ring-transparent',
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void saveEdit(label.id)}
                        disabled={!editName.trim()}
                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {label.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(label)}
                      className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Edit label"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(label.id, label.name)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete label"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
