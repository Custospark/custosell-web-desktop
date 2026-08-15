import { useState } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { cn } from '../../shared/utils/cn';
import { useCreateQuickNote } from './api/QuickNoteQueries';
import { useRemoveQuickNoteTag, useRenameQuickNoteTag } from './api/QuickNoteTagQueries';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';

interface QuickNoteTagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
}

export default function QuickNoteTagManagerModal({ isOpen, onClose, tags }: QuickNoteTagManagerModalProps) {
  const { confirm } = useConfirm();
  const createNote = useCreateQuickNote();
  const renameTag = useRenameQuickNoteTag();
  const removeTag = useRemoveQuickNoteTag();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newTag, setNewTag] = useState('');

  const startEdit = (tag: string) => {
    setEditing(tag);
    setDraft(tag);
  };

  const saveEdit = (oldTag: string) => {
    const next = draft.trim();
    if (!next || next === oldTag) {
      setEditing(null);
      return;
    }
    renameTag.mutate({ oldTag, newTag: next });
    setEditing(null);
  };

  /** Create a tagged placeholder note so the tag appears immediately - modal stays open. */
  const handleAdd = () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) {
      setNewTag('');
      return;
    }
    setNewTag('');
    createNote.mutate({ title: tag, tag, body: null });
  };

  const handleRemove = async (tag: string) => {
    const ok = await confirm({
      title: `Remove "${tag}" tag?`,
      message: 'This tag will be removed from all of your notes. Notes themselves are not deleted.',
      confirmText: 'Remove tag',
      variant: 'danger',
    });
    if (!ok) return;
    removeTag.mutate(tag);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage tags" size="sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="New tag name..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!newTag.trim() || tags.includes(newTag.trim())}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No tags yet. Add one above, or tag a note when creating or editing it.
        </div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
            >
              {editing === tag ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(tag);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(tag)}
                    title="Save tag"
                    className="p-1 rounded-md text-green-600 hover:bg-green-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    title="Cancel"
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{tag}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      title="Rename tag"
                      className={cn('p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(tag)}
                      title="Remove tag"
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
