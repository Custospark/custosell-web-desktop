import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, LayoutGrid, Plus, Search, Star,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { MODAL_Z_INDEX_CLASS } from '../../../shared/components/modals/Modal';
import type { PipelineBoard } from '../api/pipelineTypes';
import { PIPELINE_VISIBILITY_META } from './pipelineBoardMeta';
import { cn } from '../../../shared/utils/cn';

interface BoardSearchMenuProps {
  boards: PipelineBoard[];
  activeBoard: PipelineBoard;
  onCreateBoard: () => void;
  boardRoute?: (boardRef: string | number) => string;
  boardsListRoute?: string;
  allowCreateBoard?: boolean;
  workspaceLabel?: string;
}

export default function BoardSearchMenu({
  boards,
  activeBoard,
  onCreateBoard,
  boardRoute = ROUTES.PIPELINE.BOARD,
  boardsListRoute = ROUTES.PIPELINE.BOARDS,
  allowCreateBoard = true,
  workspaceLabel,
}: BoardSearchMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 360 });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      (b) =>
        b.name.toLowerCase().includes(q)
        || (b.description?.toLowerCase().includes(q) ?? false),
    );
  }, [boards, query]);

  const updateMenuPosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    setMenuPos({ top: rect.bottom + 8, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        const menu = document.getElementById('pipeline-board-search-menu');
        if (menu?.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const goToBoard = (board: PipelineBoard) => {
    setOpen(false);
    setQuery('');
    if (board.id !== activeBoard.id) {
      navigate(boardRoute(board.code));
    }
  };

  const menu = open ? (
    <div
      id="pipeline-board-search-menu"
      className={cn(
        'fixed overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5',
        MODAL_Z_INDEX_CLASS,
      )}
      style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
    >
      <div className="border-b border-gray-100 p-2">
        {workspaceLabel && (
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{workspaceLabel} boards</p>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">No boards match your search.</p>
        ) : (
          filtered.map((board) => {
            const vis = PIPELINE_VISIBILITY_META[board.visibility];
            const VisIcon = vis.icon;
            const isActive = board.id === activeBoard.id;
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => goToBoard(board)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                )}
              >
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10"
                  style={{ backgroundColor: board.cover_color ?? '#6366f1' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-gray-900" title={board.name}>{board.name}</span>
                    {board.is_default && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                  </span>
                  {board.description && (
                    <span className="mt-0.5 line-clamp-1 block text-xs text-gray-500">{board.description}</span>
                  )}
                  <span className="mt-1 inline-flex items-center gap-2 text-[11px] text-gray-500">
                    <span className={cn('inline-flex items-center gap-0.5 rounded px-1.5 py-0.5', vis.className)}>
                      <VisIcon className="h-3 w-3" />
                      {vis.label}
                    </span>
                    <span>{board.open_leads_count ?? 0} open</span>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex border-t border-gray-100 p-1">
        <button
          type="button"
          onClick={() => { setOpen(false); navigate(boardsListRoute); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <LayoutGrid className="h-4 w-4" />
          All boards
        </button>
        {allowCreateBoard && (
        <button
          type="button"
          onClick={() => { setOpen(false); onCreateBoard(); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          New board
        </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div ref={rootRef} className="relative min-w-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-indigo-50/60"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-sm shadow-sm ring-1 ring-black/10"
            style={{ backgroundColor: activeBoard.cover_color ?? '#6366f1' }}
          />
          <span className="truncate text-base font-semibold text-slate-900" title={activeBoard.name}>{activeBoard.name}</span>
          {activeBoard.is_default && (
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Default board" />
          )}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-indigo-500 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
