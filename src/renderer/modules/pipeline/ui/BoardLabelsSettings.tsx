import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import {
  useCreatePipelineLabel,
  useDeletePipelineLabel,
  usePipelineBoards,
  usePipelineLabels,
} from '../api/usePipelineQueries';
import { pipelineInputClass } from './pipelineFormFields';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { cn } from '../../../shared/utils/cn';
import { Plus, Tag, Trash2 } from 'lucide-react';

const LABEL_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function BoardLabelsSettings() {
  const { data: boards = [] } = usePipelineBoards({ salesOnly: true });
  const [boardId, setBoardId] = useState<number | ''>('');
  const resolvedBoardId = boardId === '' ? boards[0]?.id : boardId;
  const { data: labels = [] } = usePipelineLabels(resolvedBoardId);
  const createLabel = useCreatePipelineLabel(resolvedBoardId ?? 0);
  const deleteLabel = useDeletePipelineLabel(resolvedBoardId ?? 0);
  const { confirm } = useConfirm();

  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedBoardId || !name.trim()) return;
    await createLabel.mutateAsync({ name: name.trim(), color });
    setName('');
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
            <li key={label.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span
                className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: label.color }}
              >
                <Tag className="mr-1 h-3 w-3" />
                {label.name}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(label.id, label.name)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Delete label"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
