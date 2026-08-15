import { useState, useMemo } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import PipelineColorPicker from '../pipeline/ui/PipelineColorPicker';
import { CARD_PRESET_COLORS } from '../pipeline/ui/pipelineColorPresets';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from '../pipeline/ui/pipelineFormFields';
import { cn } from '../../shared/utils/cn';
import { Type, AlignLeft, Palette, Users, StickyNote, Tag, Pin, PinOff } from 'lucide-react';
import { useCreateQuickNote, useQuickNotes, useUpdateQuickNote } from './api/QuickNoteQueries';
import type { QuickNotePayload } from './api/QuickNoteTypes';

/** Default sticky-note color when the user has not chosen one. */
export const DEFAULT_NOTE_COLOR = '#93c5fd';

interface QuickNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Note being edited; when omitted the modal creates a new note. */
  note?: {
    id: number;
    title: string;
    body: string | null;
    color: string | null;
    tag: string | null;
    is_shared: boolean;
    is_pinned: boolean;
  } | null;
  canShare: boolean;
}

export default function QuickNoteFormModal({ isOpen, onClose, note, canShare }: QuickNoteFormModalProps) {
  const createNote = useCreateQuickNote();
  const updateNote = useUpdateQuickNote();
  const { data: notes = [] } = useQuickNotes();
  const isEdit = Boolean(note);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [tag, setTag] = useState(note?.tag ?? '');
  const [color, setColor] = useState<string | null>(note?.color ?? null);
  const [share, setShare] = useState(note?.is_shared ?? false);
  const [pinned, setPinned] = useState(note?.is_pinned ?? false);

  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    for (const n of notes) {
      if (n.tag) tags.add(n.tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  /** Fire-and-close: the mutation updates the cache optimistically, so we don't wait. */
  const handleSave = () => {
    if (!title.trim()) return;
    const payload: QuickNotePayload = {
      title: title.trim(),
      body: body.trim() || null,
      tag: tag.trim() || null,
      color,
      is_shared: canShare ? share : false,
      is_pinned: pinned,
    };
    if (note) {
      updateNote.mutate({ id: note.id, data: payload });
    } else {
      createNote.mutate(payload);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit note' : 'New note'} size="md">
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        className="space-y-5"
      >
        <PipelineModalHero
          icon={StickyNote}
          tone="blue"
          title={isEdit ? 'Edit quick note' : 'New quick note'}
          description={
            canShare
              ? 'Keep it private, or make it visible to all members of this organization.'
              : 'Your private note - visible only to you.'
          }
        />

        <PipelineFormSection title="Note details" icon={Type}>
          <PipelineIconField label="Title" icon={Type} required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className={pipelineInputClass}
              required
              autoFocus
            />
          </PipelineIconField>
          <PipelineIconField label="Body" icon={AlignLeft}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write something down..."
              rows={4}
              className={cn(pipelineInputClass, 'resize-none')}
            />
          </PipelineIconField>
          <PipelineIconField label="Tag" icon={Tag}>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. Ops, Handover, Idea"
              className={pipelineInputClass}
              list="quick-note-tags"
            />
            <datalist id="quick-note-tags">
              {existingTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {existingTags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500">Reuse:</span>
                {existingTags.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
                      tag === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {t}
                  </button>
                ))}
              </div>
            )}
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Appearance" icon={Palette}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
            <PipelineColorPicker
              value={color ?? DEFAULT_NOTE_COLOR}
              onChange={setColor}
              presets={CARD_PRESET_COLORS}
              allowClear
              onClear={() => setColor(null)}
              clearLabel="No color"
              swatchSize="md"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              {color ? 'Your sticky note will use this color.' : `Default: blue sticky note (${DEFAULT_NOTE_COLOR}).`}
            </p>
          </div>
        </PipelineFormSection>

        {canShare && (
          <PipelineFormSection title="Visibility" icon={Users}>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {share ? 'Visible to all members' : 'Share with organization'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {share ? 'Everyone in this organization can see this note.' : 'Keep this note private to you.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={share}
                onClick={() => setShare((s) => !s)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
                  share ? 'bg-blue-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform',
                    share ? 'translate-x-5.5' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          </PipelineFormSection>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {pinned ? <Pin className="w-4 h-4 text-blue-600 shrink-0" /> : <PinOff className="w-4 h-4 text-gray-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">{pinned ? 'Pinned to top' : 'Pin to top'}</p>
              <p className="text-xs text-gray-500 truncate">
                {pinned ? 'This note stays at the top of your board.' : 'Keep this note above the rest.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pinned}
            onClick={() => setPinned((p) => !p)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
              pinned ? 'bg-blue-600' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform',
                pinned ? 'translate-x-5.5' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            {isEdit ? 'Save changes' : 'Add note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

