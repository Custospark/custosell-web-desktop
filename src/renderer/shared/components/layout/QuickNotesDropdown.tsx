import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/formatDateTime';
import {
  useQuickNotes,
  canShareQuickNotes,
} from '../../../modules/notes/api/QuickNoteQueries';
import QuickNoteFormModal, { DEFAULT_NOTE_COLOR } from '../../../modules/notes/QuickNoteFormModal';
import {
  StickyNote, ChevronDown, Plus, ArrowRight, Share2,
} from 'lucide-react';

/** Quick Notes header dropdown - recent notes list + quick capture, matching the subscription dropdown layout. */
export default function QuickNotesDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAppSelector((s) => s.auth.user);
  const canShare = canShareQuickNotes(user?.account_type);

  const { data: notes = [] } = useQuickNotes();
  const recent = notes.slice(0, 5);
  const count = notes.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0" data-tour="navbar-quick-notes">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Quick notes${count > 0 ? `, ${count} notes` : ''}`}
        className={cn(
          'flex items-center gap-1.5 px-2 lg:gap-2 lg:px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition-colors',
          open ? 'bg-blue-50 ring-blue-300' : 'bg-white ring-blue-200 hover:bg-blue-50/60 hover:ring-blue-300',
        )}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-blue-200 bg-blue-50 shrink-0 relative">
          <StickyNote className="w-3.5 h-3.5 text-blue-600" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-bold leading-none">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <div className="hidden lg:block min-w-0 max-w-[140px]">
          <span className="text-xs font-semibold truncate block text-gray-900">Quick notes</span>
          <span className="block text-xs truncate text-gray-500">
            {count > 0 ? `${count} note${count === 1 ? '' : 's'}` : 'Jot it down'}
          </span>
        </div>
        <ChevronDown className={cn('w-3 h-3 transition-transform shrink-0 text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl z-50 lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:-translate-x-0 lg:mt-2 lg:w-80">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-blue-200 bg-blue-50 shrink-0">
                <StickyNote className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold block text-gray-900">Quick notes</span>
                <span className="text-xs text-gray-500">
                  {canShare
                    ? 'Visible to all members of this organization when shared.'
                    : 'Your private notes - only you can see them.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setCreateOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 p-3 text-left hover:from-blue-600 hover:to-indigo-700 cursor-pointer shadow-sm"
            >
              <div className="rounded-full bg-white/20 p-2 shrink-0">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white block">New note</span>
                <span className="text-xs text-blue-100 block">Capture an idea, reminder, or note</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white shrink-0" />
            </button>
          </div>

          <div className="p-2 max-h-64 overflow-y-auto">
            <p className="text-xs font-medium mb-1 px-2 text-gray-500">Recent notes</p>
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-3 text-center">No notes yet.</p>
            ) : (
              <div className="space-y-1">
                {recent.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => { setOpen(false); navigate(ROUTES.NOTES.INDEX); }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-gray-50 cursor-pointer text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: note.color ?? DEFAULT_NOTE_COLOR }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {note.title}
                        {note.is_shared && <Share2 className="inline w-3 h-3 text-gray-400 ml-1 -mt-0.5" aria-label="Shared" />}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        {note.body && <span className="truncate max-w-[10rem]">{note.body}</span>}
                        <span className="shrink-0">{formatRelativeTime(note.updated_at)}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 bg-gray-50/50">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate(ROUTES.NOTES.INDEX); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 cursor-pointer text-gray-700"
            >
              <StickyNote className="w-4 h-4" />
              <span>View all notes</span>
            </button>
          </div>
        </div>
      )}

      <QuickNoteFormModal isOpen={createOpen} onClose={() => setCreateOpen(false)} canShare={canShare} />
    </div>
  );
}
