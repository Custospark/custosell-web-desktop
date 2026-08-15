import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { Button } from '../../shared/components/buttons/Button';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { Modal } from '../../shared/components/modals/Modal';
import { cn } from '../../shared/utils/cn';
import { formatRelativeTime } from '../../shared/utils/formatDateTime';
import {
  useCreateQuickNote,
  useDeleteQuickNote,
  useQuickNotes,
  useReorderQuickNotes,
  useUpdateQuickNote,
  canShareQuickNotes,
} from './api/QuickNoteQueries';
import { useSaveNotesBackground } from './api/QuickNoteBackgroundQueries';
import type { QuickNoteWithSyncMeta } from './api/QuickNoteTypes';
import QuickNoteFormModal, { DEFAULT_NOTE_COLOR } from './QuickNoteFormModal';
import NotesBackgroundPicker from './NotesBackgroundPicker';
import { resolveNotesBackground } from './notesBackground';
import {
  StickyNote, Plus, Search, Pencil, Trash2, Share2, X, Pin, PinOff, RotateCcw, GripVertical, Tag, ImageIcon,
} from 'lucide-react';

interface DeletedNoteState {
  note: QuickNoteWithSyncMeta;
  timer: number;
}

export default function QuickNotesPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canShare = canShareQuickNotes(user?.account_type);

  const { data: notes = [] } = useQuickNotes();
  const createNote = useCreateQuickNote();
  const deleteNote = useDeleteQuickNote();
  const updateNote = useUpdateQuickNote();
  const reorderNotes = useReorderQuickNotes();
  const saveBackground = useSaveNotesBackground();

  const background = resolveNotesBackground(user?.preferences ?? null);

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuickNoteWithSyncMeta | null>(null);
  const [deleted, setDeleted] = useState<DeletedNoteState | null>(null);
  const [bgOpen, setBgOpen] = useState(false);
  const dragId = useRef<number | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const note of notes) {
      if (note.tag) tags.add(note.tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (tagFilter && n.tag !== tagFilter) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q);
    });
  }, [notes, search, tagFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (note: QuickNoteWithSyncMeta) => {
    setEditing(note);
    setFormOpen(true);
  };

  const handleDelete = (note: QuickNoteWithSyncMeta) => {
    window.clearTimeout(deleted?.timer);
    void deleteNote.mutateAsync(note.id);
    setDeleted({ note, timer: window.setTimeout(() => setDeleted(null), 4000) });
  };

  const undoDelete = () => {
    if (!deleted) return;
    window.clearTimeout(deleted.timer);
    setDeleted(null);
    const note = deleted.note;
    void createNote.mutateAsync({
      title: note.title,
      body: note.body,
      color: note.color,
      tag: note.tag,
      is_shared: note.is_shared,
      is_pinned: note.is_pinned,
    });
  };

  const togglePin = (note: QuickNoteWithSyncMeta) => {
    void updateNote.mutateAsync({ id: note.id, data: { is_pinned: !note.is_pinned } });
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const sourceId = dragId.current;
    dragId.current = null;
    if (sourceId == null || sourceId === targetId) return;
    const current = filtered;
    const sourceIndex = current.findIndex((n) => n.id === sourceId);
    const targetIndex = current.findIndex((n) => n.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...current];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void reorderNotes.mutateAsync(next.map((n) => n.id));
  };

  const bgFor = (color: string | null) => color ?? DEFAULT_NOTE_COLOR;

  const isBgImage = background.type === 'gallery' && Boolean(background.value);

  return (
    <div className="relative w-full min-h-screen">
      {/* Notes page background - per-user, defaults to a gallery image */}
      {isBgImage ? (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${background.value})` }}
          aria-hidden
        />
      ) : (
        <div
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: background.value ?? '#f8fafc' }}
          aria-hidden
        />
      )}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-blue-600" />
            Quick notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {canShare
              ? 'Your sticky notes - share them with your team, pin the important ones, or drag to reorder.'
              : 'Your private sticky notes - pin the important ones, or drag to reorder.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setBgOpen(true)}>
            <ImageIcon className="w-4 h-4 mr-1.5" />
            Background
          </Button>
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            New note
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <div className="relative rounded-lg p-[2px]">
          <motion.div
            className="absolute inset-0 rounded-lg z-0"
            style={{
              background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)',
              backgroundSize: '300% 100%',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: searchFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative rounded-[6px] overflow-hidden bg-white">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchFocused ? 'text-blue-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search notes by title or body..."
              title="Search notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-9 pr-16 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px]"
            />
            {search && (
              <button
                title="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors',
              tagFilter === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            <StickyNote className="w-3 h-3" />
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors',
                tagFilter === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <StickyNote className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{search || tagFilter ? 'No notes match your filters.' : 'No notes yet.'}</p>
          <p className="text-sm mt-1">
            {search || tagFilter ? 'Try a different search or tag.' : 'Jot down reminders, ideas, or handover notes from the header.'}
          </p>
          {!search && !tagFilter && (
            <Button type="button" onClick={openCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" />
              Create your first note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => {
            const bg = bgFor(note.color);
            const darkText = isLightColor(bg);
            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, note.id)}
                className="group relative flex flex-col min-h-[10rem] rounded-xl cursor-grab active:cursor-grabbing"
                style={{ backgroundColor: bg }}
              >
                <GripVertical
                  className={cn(
                    'absolute left-2 top-2 w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity',
                    darkText ? 'text-gray-500' : 'text-white/70',
                  )}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-2 pl-7 pr-4 pt-4 pb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className={cn('text-sm leading-snug truncate', darkText ? 'text-gray-900' : 'text-white')}>
                      {note.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.is_shared && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5',
                          darkText ? 'text-blue-800 bg-blue-100' : 'text-blue-100 bg-blue-900/40',
                        )}
                        title="Visible to all members of this organization"
                      >
                        <Share2 className="w-2.5 h-2.5" />
                        Shared
                      </span>
                    )}
                    {note._pendingSync && (
                      <span
                        className={cn(
                          'text-[10px] font-medium rounded-full px-1.5 py-0.5',
                          darkText ? 'text-amber-800 bg-amber-100' : 'text-amber-100 bg-amber-900/40',
                        )}
                      >
                        Pending
                      </span>
                    )}
                    {note.is_pinned && (
                      <span title="Pinned to top" aria-label="Pinned">
                        <Pin
                          className={cn('w-3 h-3', darkText ? 'text-gray-600' : 'text-white')}
                        />
                      </span>
                    )}
                  </div>
                </div>

                {note.tag && (
                  <div className="px-4 pt-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5',
                        darkText ? 'text-gray-600 bg-black/5' : 'text-white/90 bg-white/15',
                      )}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {note.tag}
                    </span>
                  </div>
                )}

                {note.body ? (
                  <p className={cn('text-sm leading-snug whitespace-pre-wrap break-words px-4 py-1 flex-1', darkText ? 'text-gray-800' : 'text-white/95')}>
                    {note.body}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="flex items-center justify-between px-3 py-2 mt-auto">
                  <div className="flex items-center gap-2 min-w-0">
                    {note.is_shared && note.author ? (
                      <UserAvatar name={note.author.name} size="xs" title={`${note.author.name} · shared note`} />
                    ) : null}
                    <span className={cn('text-[11px] truncate', darkText ? 'text-gray-500' : 'text-white/70')}>
                      {formatRelativeTime(note.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePin(note)}
                      title={note.is_pinned ? 'Unpin note' : 'Pin to top'}
                      aria-label={note.is_pinned ? 'Unpin note' : 'Pin to top'}
                      className={cn(
                        'inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors',
                        darkText ? 'text-gray-500 hover:text-blue-700 hover:bg-white/70' : 'text-white/80 hover:text-white hover:bg-white/20',
                      )}
                    >
                      {note.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(note)}
                      title="Edit note"
                      aria-label="Edit note"
                      className={cn(
                        'inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors',
                        darkText ? 'text-gray-500 hover:text-blue-700 hover:bg-white/70' : 'text-white/80 hover:text-white hover:bg-white/20',
                      )}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note)}
                      title="Delete note"
                      aria-label="Delete note"
                      className={cn(
                        'inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors',
                        darkText ? 'text-gray-500 hover:text-red-700 hover:bg-white/70' : 'text-white/80 hover:text-red-200 hover:bg-white/20',
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuickNoteFormModal
        key={editing?.id ?? 'new'}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        note={editing}
        canShare={canShare}
      />

      {deleted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[22000] flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl">
          <StickyNote className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-700">Note deleted</span>
          <button
            type="button"
            onClick={undoDelete}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={() => { window.clearTimeout(deleted.timer); setDeleted(null); }}
            aria-label="Dismiss"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal isOpen={bgOpen} onClose={() => setBgOpen(false)} title="Change background" size="md">
        <NotesBackgroundPicker
          current={background}
          onChange={(bg) => saveBackground.mutate(bg)}
        />
      </Modal>
      </div>
    </div>
  );
}

/** Perceived-luminance check so text stays readable on any note color. */
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return true;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150;
}
