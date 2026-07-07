import { useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useMovePipelineLead,
  usePipelineBoards,
  usePipelineKanban,
  useReorderPipelineStages,
} from '../api/usePipelineQueries';
import type { PipelineLead, PipelineStage } from '../api/pipelineTypes';
import {
  boardBelongsToEstimatesWorkspace,
  boardBelongsToPipelineWorkspace,
  boardUsesTaskTerminology,
  filterBoardsForWorkspace,
} from '../api/pipelineBoardWorkspace';
import KanbanColumn from '../ui/KanbanColumn';
import CreateLeadModal from '../ui/CreateLeadModal';
import CreateBoardModal from '../ui/CreateBoardModal';
import EditBoardModal from '../ui/EditBoardModal';
import EditStageModal from '../ui/EditStageModal';
import DeleteStageModal from '../ui/DeleteStageModal';
import AddStageModal from '../ui/AddStageModal';
import LeadDetailModal from '../ui/LeadDetailModal';
import LeadCommentsModal from '../ui/LeadCommentsModal';
import BoardSearchMenu from '../ui/BoardSearchMenu';
import BoardSwitcherStrip from '../ui/BoardSwitcherStrip';
import BoardCalendarView from '../ui/BoardCalendarView';
import { pipelineBoardBackgroundStyleFromBoard } from '../api/pipelineKanbanCache';
import { CalendarDays, Columns3, LayoutGrid, Plus, Search, Settings, UserPlus, X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useProject, useProjectMembers } from '../../estimates/api/useProjectQueries';
import { canManageBoardSettings } from '../../../shared/utils/moduleAccess';

type BoardViewMode = 'kanban' | 'calendar';
type BoardWorkspace = 'pipeline' | 'estimates';

function leadMatchesQuery(lead: PipelineLead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    lead.title,
    lead.contact_name,
    lead.contact_email,
    lead.contact_phone,
    lead.assignee?.name,
    lead.source?.name,
  ].some((v) => v?.toLowerCase().includes(q));
}

function workspaceFromPath(pathname: string): BoardWorkspace {
  return pathname.startsWith('/estimates/boards') ? 'estimates' : 'pipeline';
}

export default function BoardKanbanPage() {
  const location = useLocation();
  const workspace = workspaceFromPath(location.pathname);
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);

  const { data: board, isLoading } = usePipelineKanban(boardId);
  const { data: boards = [] } = usePipelineBoards(
    workspace === 'estimates' ? { estimatesWorkspace: true } : { salesOnly: true },
  );
  const switcherBoards = useMemo(
    () => filterBoardsForWorkspace(boards, workspace),
    [boards, workspace],
  );
  const moveLead = useMovePipelineLead();
  const reorderStages = useReorderPipelineStages(boardId);

  const [viewMode, setViewMode] = useState<BoardViewMode>('kanban');
  const [leadQuery, setLeadQuery] = useState('');
  const [createStageId, setCreateStageId] = useState<number | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editStage, setEditStage] = useState<PipelineStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [commentsLeadId, setCommentsLeadId] = useState<number | null>(null);

  const user = useAppSelector((s) => s.auth.user);
  const isProjectBoard = Boolean(board?.project_id);
  const projectId = board?.project_id ?? 0;
  const { data: project } = useProject(isProjectBoard ? projectId : 0);
  const { data: projectMembers = [] } = useProjectMembers(isProjectBoard ? projectId : 0);
  const canManageSettings = board
    ? canManageBoardSettings(user, board, {
        projectCreatedBy: project?.created_by,
        projectMembers,
      })
    : false;

  const boardRoute = workspace === 'estimates' ? ROUTES.ESTIMATES.BOARD : ROUTES.PIPELINE.BOARD;
  const boardsListRoute = workspace === 'estimates' ? ROUTES.ESTIMATES.BOARDS : ROUTES.PIPELINE.BOARDS;
  const allowCreateBoard = workspace === 'pipeline' || workspace === 'estimates';

  const allStages = useMemo(
    () => [...(board?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [board?.stages],
  );

  const allLeadsCount = useMemo(
    () => allStages.reduce((n, s) => n + (s.leads?.length ?? 0), 0),
    [allStages],
  );

  const stages = useMemo(() => {
    if (!leadQuery.trim()) return allStages;
    return allStages.map((stage) => ({
      ...stage,
      leads: (stage.leads ?? []).filter((lead) => leadMatchesQuery(lead, leadQuery)),
    }));
  }, [allStages, leadQuery]);

  const filteredCount = useMemo(
    () => stages.reduce((n, s) => n + (s.leads?.length ?? 0), 0),
    [stages],
  );

  const handleDropColumn = (draggedStageId: number, targetStageId: number) => {
    const ids = allStages.map((s) => s.id);
    const fromIdx = ids.indexOf(draggedStageId);
    const toIdx = ids.indexOf(targetStageId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggedStageId);
    reorderStages.mutate(next);
  };

  const handleDropLead = (leadId: number, stageId: number, position: number) => {
    const lead = allStages.flatMap((s) => s.leads ?? []).find((l) => l.id === leadId);
    moveLead.mutate({
      id: leadId,
      stage_id: stageId,
      position,
      board_id: boardId,
      card_type: lead?.card_type,
    });
  };

  if (workspace === 'pipeline' && board && !boardBelongsToPipelineWorkspace(board)) {
    return <Navigate to={ROUTES.ESTIMATES.BOARD(boardId)} replace />;
  }

  if (workspace === 'estimates' && board && !boardBelongsToEstimatesWorkspace(board)) {
    return <Navigate to={ROUTES.PIPELINE.BOARD(boardId)} replace />;
  }

  if (isLoading || !board) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isTaskBoard = boardUsesTaskTerminology(board);
  const itemLabel = isTaskBoard ? 'task' : 'lead';
  const boardBgStyle = pipelineBoardBackgroundStyleFromBoard(board);

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 shadow-sm"
      style={boardBgStyle}
    >
      <header className="relative z-40 shrink-0 border-b border-gray-200/70 bg-white/90 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-2 lg:min-w-[200px]">
            <BoardSearchMenu
              boards={switcherBoards}
              activeBoard={board}
              onCreateBoard={() => setCreateBoardOpen(true)}
              boardRoute={boardRoute}
              boardsListRoute={boardsListRoute}
              allowCreateBoard={allowCreateBoard}
            />
            {canManageSettings && (
              <button
                type="button"
                onClick={() => setEditBoardOpen(true)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                title="Board settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>

          {viewMode === 'kanban' && (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={leadQuery}
                onChange={(e) => setLeadQuery(e.target.value)}
                placeholder={isTaskBoard ? "Search tasks by title, assignee…" : "Search leads by name, email, phone, assignee…"}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {leadQuery && (
                <button
                  type="button"
                  onClick={() => setLeadQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'calendar' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </button>
            </div>

            {viewMode === 'kanban' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setAddStageOpen(true)}
                  className="inline-flex items-center gap-2"
                >
                  <Columns3 className="h-4 w-4" />
                  Add column
                </Button>
                <Button
                  onClick={() => setCreateStageId(stages[0]?.id ?? allStages[0]?.id ?? null)}
                  className="inline-flex items-center gap-2 shadow-sm"
                  disabled={!allStages.length}
                >
                  <UserPlus className="h-4 w-4" />
                  {isTaskBoard ? 'Add task' : 'Add card'}
                </Button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'kanban' && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{allLeadsCount} {itemLabel}{allLeadsCount === 1 ? '' : 's'} on board</span>
            {leadQuery.trim() && (
              <span className="font-medium text-blue-700">
                {filteredCount} matching &ldquo;{leadQuery.trim()}&rdquo;
              </span>
            )}
          </div>
        )}
      </header>

      {viewMode === 'kanban' ? (
        <div className="relative z-0 flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden p-3 pb-1">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onLeadClick={(lead: PipelineLead) => setSelectedLeadId(lead.id)}
              onLeadCommentsClick={(lead) => setCommentsLeadId(lead.id)}
              onAddLead={(stageId) => setCreateStageId(stageId)}
              onDropLead={handleDropLead}
              onDropColumn={handleDropColumn}
              onEditStage={(s) => setEditStage(s)}
              isProjectBoard={isTaskBoard}
            />
          ))}
          <button
            type="button"
            onClick={() => setAddStageOpen(true)}
            className="flex h-full min-h-[120px] w-[48px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-300/80 bg-white/40 text-gray-500 transition-colors hover:border-gray-400 hover:bg-white/70 hover:text-gray-700"
            title="Add column"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BoardCalendarView boardId={boardId} onLeadClick={setSelectedLeadId} isProjectBoard={isTaskBoard} />
        </div>
      )}

      <BoardSwitcherStrip
        boards={switcherBoards}
        activeBoardId={boardId}
        onCreateBoard={() => setCreateBoardOpen(true)}
        boardRoute={boardRoute}
        allowCreateBoard={allowCreateBoard}
      />

      {createStageId != null && (
        <CreateLeadModal
          open
          boardId={boardId}
          stageId={createStageId}
          onClose={() => setCreateStageId(null)}
          defaultCardType={isTaskBoard ? 'card' : undefined}
        />
      )}

      {allowCreateBoard && createBoardOpen && (
        <CreateBoardModal open onClose={() => setCreateBoardOpen(false)} workspace={workspace} />
      )}

      {editBoardOpen && (
        <EditBoardModal
          open
          board={board}
          onClose={() => setEditBoardOpen(false)}
          workspace={workspace}
        />
      )}

      {addStageOpen && (
        <AddStageModal open boardId={boardId} onClose={() => setAddStageOpen(false)} />
      )}

      {editStage && (
        <EditStageModal
          open
          boardId={boardId}
          stage={editStage}
          allStages={allStages}
          onClose={() => setEditStage(null)}
          onDelete={() => {
            setDeleteStage(editStage);
            setEditStage(null);
          }}
        />
      )}

      {deleteStage && (
        <DeleteStageModal
          open
          boardId={boardId}
          stage={deleteStage}
          otherStages={allStages.filter((s) => s.id !== deleteStage.id)}
          onClose={() => setDeleteStage(null)}
        />
      )}

      {commentsLeadId != null && board && (
        <LeadCommentsModal
          leadId={commentsLeadId}
          boardId={boardId}
          board={board}
          boardAccess={{
            projectCreatedBy: project?.created_by,
            projectMembers,
          }}
          onClose={() => setCommentsLeadId(null)}
        />
      )}

      {selectedLeadId != null && (
        <LeadDetailModal
          leadId={selectedLeadId}
          boardId={boardId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}
