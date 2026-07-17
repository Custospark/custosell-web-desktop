import type { RefObject } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import type { BoardViewMode, PipelineBoard, PipelineStage } from '../api/pipelineTypes';
import BoardSearchMenu from './BoardSearchMenu';
import BoardCollaborationButton from './BoardCollaborationButton';
import BoardAccessBadges from './BoardAccessBadges';
import LeadSearchHint from './LeadSearchHint';
import type { BoardMemberRole } from '../api/boardRoleUtils';
import { CalendarDays, Columns3, LayoutGrid, Search, Settings, Upload, UserPlus, X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface QueryToken {
  raw: string;
  type: 'label' | 'priority' | 'due' | 'me' | 'text';
}

function tokenizeQuery(query: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  for (const raw of query.trim().split(/\s+/)) {
    if (!raw) continue;
    if (raw === '@me' || raw === '@Me') {
      tokens.push({ raw, type: 'me' });
    } else if (raw.startsWith('@') && raw.length > 1) {
      tokens.push({ raw, type: 'label' });
    } else if (raw.startsWith('!') && raw.length > 1) {
      tokens.push({ raw, type: 'priority' });
    } else if (raw.startsWith('#') && raw.length > 1) {
      tokens.push({ raw, type: 'due' });
    } else {
      tokens.push({ raw, type: 'text' });
    }
  }
  return tokens;
}

function tokenClass(type: QueryToken['type']): string {
  switch (type) {
    case 'label': return 'bg-violet-100 text-violet-800';
    case 'priority': return 'bg-amber-100 text-amber-800';
    case 'due': return 'bg-red-100 text-red-800';
    case 'me': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

interface BoardKanbanPageHeaderProps {
  workspaceLabel: string;
  board: PipelineBoard;
  boardId: number;
  headerMemberRole?: BoardMemberRole | null;
  switcherBoards: PipelineBoard[];
  boardRoute: (id: number) => string;
  boardsListRoute: string;
  allowCreateBoard: boolean;
  showBoardManagementControls: boolean;
  canContribute: boolean;
  viewMode: BoardViewMode;
  onViewModeChange: (mode: BoardViewMode) => void;
  leadQuery: string;
  onLeadQueryChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isTaskBoard: boolean;
  itemLabel: string;
  allLeadsCount: number;
  filteredCount: number;
  allStages: PipelineStage[];
  onCreateBoard: () => void;
  onOpenCollaboration: () => void;
  onOpenSettings: () => void;
  onAddStage: () => void;
  onImport: () => void;
  onAddCard: () => void;
  onApplySearchToken: (token: string) => void;
}

export default function BoardKanbanPageHeader({
  workspaceLabel,
  board,
  boardId,
  headerMemberRole,
  switcherBoards,
  boardRoute,
  boardsListRoute,
  allowCreateBoard,
  showBoardManagementControls,
  canContribute,
  viewMode,
  onViewModeChange,
  leadQuery,
  onLeadQueryChange,
  searchInputRef,
  isTaskBoard,
  itemLabel,
  allLeadsCount,
  filteredCount,
  allStages,
  onCreateBoard,
  onOpenCollaboration,
  onOpenSettings,
  onAddStage,
  onImport,
  onAddCard,
  onApplySearchToken,
}: BoardKanbanPageHeaderProps) {
  return (
    <header className="relative z-40 shrink-0 border-b border-white/40 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-indigo-500/80">
        <span>{workspaceLabel}</span>
        <BoardAccessBadges
          visibility={board.visibility}
          memberRole={headerMemberRole}
          className="normal-case tracking-normal"
        />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 lg:min-w-[200px]">
          <BoardSearchMenu
            boards={switcherBoards}
            activeBoard={board}
            onCreateBoard={onCreateBoard}
            boardRoute={boardRoute}
            boardsListRoute={boardsListRoute}
            allowCreateBoard={allowCreateBoard}
            workspaceLabel={workspaceLabel}
          />
          <BoardCollaborationButton boardId={boardId} onClick={onOpenCollaboration} />
          {showBoardManagementControls && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
              title="Board settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        {viewMode === 'kanban' && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500/70" />
            <input
              ref={searchInputRef}
              type="text"
              value={leadQuery}
              onChange={(e) => onLeadQueryChange(e.target.value)}
              placeholder={isTaskBoard ? 'Search tasks…  (@label, !high, #today, @me)' : 'Search leads…  (@label, !high, #today, @me)'}
              className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {leadQuery && (
              <button
                type="button"
                onClick={() => onLeadQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-blue-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-blue-100 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-800/80 hover:bg-blue-50',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-800/80 hover:bg-blue-50',
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>

          {viewMode === 'kanban' && (
            <>
              {showBoardManagementControls && (
                <Button variant="secondary" onClick={onAddStage} className="inline-flex items-center gap-2">
                  <Columns3 className="h-4 w-4" />
                  Add column
                </Button>
              )}
              {canContribute && (
                <>
                  <Button
                    variant="secondary"
                    onClick={onImport}
                    className="inline-flex items-center gap-2"
                    disabled={!allStages.length}
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    onClick={onAddCard}
                    className="inline-flex items-center gap-2 shadow-sm"
                    disabled={!allStages.length}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isTaskBoard ? 'Add task' : 'Add card'}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {viewMode === 'kanban' && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>{allLeadsCount} {itemLabel}{allLeadsCount === 1 ? '' : 's'} on board</span>

          {leadQuery.trim() ? (
            <span className="font-medium text-blue-700">
              {filteredCount} matching
            </span>
          ) : (
            <LeadSearchHint className="text-xs" onApplyToken={onApplySearchToken} />
          )}

          {leadQuery.trim() && (
            <div className="flex w-full flex-wrap items-center gap-1.5">
              {tokenizeQuery(leadQuery).map((token) => (
                <span
                  key={token.raw}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                    tokenClass(token.type),
                  )}
                >
                  {token.raw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
