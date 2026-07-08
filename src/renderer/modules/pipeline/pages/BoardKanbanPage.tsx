import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useMovePipelineLead,
  usePipelineBoards,
  useBoardAccessSync,
  usePipelineKanban,
  useReorderPipelineStages,
  useUpdatePipelineLead,
} from '../api/usePipelineQueries';
import type { PipelineLead, PipelineStage } from '../api/pipelineTypes';
import {
  boardBelongsToEstimatesWorkspace,
  boardBelongsToPipelineWorkspace,
  boardUsesTaskTerminology,
  filterBoardsForWorkspace,
} from '../api/pipelineBoardWorkspace';
import { findKanbanLead } from '../api/pipelineOptimisticCache';
import { leadMatchesSearchQuery } from '../api/pipelineLeadSearch';
import LeadSearchHint from '../ui/LeadSearchHint';
import { pipelineCollaborationKeys, useBoardAnnouncements, useBoardPolls } from '../api/usePipelineCollaborationQueries';
import KanbanColumn from '../ui/KanbanColumn';
import CreateLeadModal from '../ui/CreateLeadModal';
import CreateBoardModal from '../ui/CreateBoardModal';
import EditBoardModal from '../ui/EditBoardModal';
import EditStageModal from '../ui/EditStageModal';
import DeleteStageModal from '../ui/DeleteStageModal';
import AddStageModal from '../ui/AddStageModal';
import LeadDetailModal from '../ui/LeadDetailModal';
import LeadCommentsModal from '../ui/LeadCommentsModal';
import LeadHistoryModal from '../ui/LeadHistoryModal';
import BoardSearchMenu from '../ui/BoardSearchMenu';
import BoardSwitcherIcons from '../ui/BoardSwitcherIcons';
import AllBoardsPickerModal from '../ui/AllBoardsPickerModal';
import BoardCalendarView from '../ui/BoardCalendarView';
import BoardProgressView from '../ui/BoardProgressView';
import KanbanBoardSkeleton from '../ui/KanbanBoardSkeleton';
import { pipelineBoardBackgroundStyleFromBoard } from '../api/pipelineKanbanCache';
import BoardCollaborationDrawer from '../ui/BoardCollaborationDrawer';
import BoardCollaborationButton from '../ui/BoardCollaborationButton';
import BoardResourcesModal from '../ui/BoardResourcesModal';
import BoardConversationModal from '../ui/BoardConversationModal';
import { useBoardResourcesSummary } from '../api/usePipelineResourceQueries';
import { useBoardConversationSummary } from '../api/usePipelineConversationQueries';
import { useBoardProgressSummary } from '../api/useBoardProgressQueries';
import type { ProgressPeriod } from '../api/pipelineProgressTerms';
import { CalendarDays, Columns3, LayoutGrid, Plus, RefreshCw, Search, Settings, UserPlus, X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useProject, useProjectMembers } from '../../estimates/api/useProjectQueries';
import { canContributeToBoard, canManageBoardSettings, getSharedBoardMemberRole } from '../../../shared/utils/moduleAccess';
import BoardAccessBadges from '../ui/BoardAccessBadges';
import { useBoardAccessChangeNotice } from '../ui/useBoardAccessChangeNotice';
import type { PipelineBoardCollaborationSummary } from '../api/pipelineTypes';

type BoardViewMode = 'kanban' | 'calendar' | 'progress';
type BoardWorkspace = 'pipeline' | 'estimates';

function workspaceFromPath(pathname: string): BoardWorkspace {
  return pathname.startsWith('/estimates/boards') ? 'estimates' : 'pipeline';
}

export default function BoardKanbanPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspace = workspaceFromPath(location.pathname);
  const queryClient = useQueryClient();
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);

  const boardsQueryOptions = workspace === 'estimates'
    ? { estimatesWorkspace: true as const, poll: true as const }
    : { salesOnly: true as const, poll: true as const };

  const {
    data: board,
    isLoading,
    isError,
    error,
    refetch,
  } = usePipelineKanban(boardId, { poll: true });
  useBoardAccessSync(boardId, boardId > 0);
  useBoardAnnouncements(boardId, boardId > 0);
  useBoardPolls(boardId, undefined, boardId > 0);
  const { data: boards = [] } = usePipelineBoards(boardsQueryOptions);
  const switcherBoards = useMemo(
    () => filterBoardsForWorkspace(boards, workspace),
    [boards, workspace],
  );
  const moveLead = useMovePipelineLead();
  const updateLead = useUpdatePipelineLead();
  const reorderStages = useReorderPipelineStages(boardId);

  const [viewMode, setViewMode] = useState<BoardViewMode>('kanban');
  const [progressPeriod, setProgressPeriod] = useState<ProgressPeriod>('month');
  const [leadQuery, setLeadQuery] = useState('');
  const [createStageId, setCreateStageId] = useState<number | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editStage, setEditStage] = useState<PipelineStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [commentsLeadId, setCommentsLeadId] = useState<number | null>(null);
  const [historyLeadId, setHistoryLeadId] = useState<number | null>(null);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [collaborationInitialTab, setCollaborationInitialTab] = useState<'notices' | 'polls'>('notices');
  const [allBoardsOpen, setAllBoardsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(
    () => searchParams.get('conversation') === '1',
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const user = useAppSelector((s) => s.auth.user);
  const isProjectBoard = Boolean(board?.project_id);
  const projectId = board?.project_id ?? 0;
  const { data: project } = useProject(isProjectBoard ? projectId : 0);
  const { data: projectMembers = [] } = useProjectMembers(isProjectBoard ? projectId : 0);
  const boardAccess = useMemo(
    () => ({
      projectCreatedBy: project?.created_by,
      projectMembers,
    }),
    [project?.created_by, projectMembers],
  );

  const canManageSettings = board
    ? canManageBoardSettings(user, board, boardAccess)
    : false;

  const canContribute = board
    ? canContributeToBoard(user, board, boardAccess)
    : false;

  const { data: resourcesSummary } = useBoardResourcesSummary(boardId, boardId > 0, true);
  const resourcesCount = resourcesSummary?.resources_count ?? 0;

  const { data: conversationSummary } = useBoardConversationSummary(boardId, boardId > 0, true);
  const conversationMessagesCount = conversationSummary?.messages_count ?? 0;
  const conversationUnreadCount = conversationSummary?.unread_count ?? 0;

  const {
    data: progressSummary,
    isLoading: progressLoading,
    isFetching: progressFetching,
  } = useBoardProgressSummary(boardId, progressPeriod, {
    enabled: boardId > 0 && viewMode === 'progress',
    poll: viewMode === 'progress',
  });

  const canContributeResources = canContribute;

  const mySharedBoardRole = board?.visibility === 'shared'
    ? getSharedBoardMemberRole(user, board)
    : null;
  const showBoardManagementControls = canManageSettings
    && !(board?.visibility === 'shared' && mySharedBoardRole != null && mySharedBoardRole !== 'manager');

  useBoardAccessChangeNotice(board, user);

  const boardRoute = workspace === 'estimates' ? ROUTES.ESTIMATES.BOARD : ROUTES.PIPELINE.BOARD;
  const boardsListRoute = workspace === 'estimates' ? ROUTES.ESTIMATES.BOARDS : ROUTES.PIPELINE.BOARDS;
  const allowCreateBoard = workspace === 'pipeline' || workspace === 'estimates';
  const workspaceLabel = workspace === 'estimates' ? 'Projects & Estimates' : 'Pipeline';

  useEffect(() => {
    if (searchParams.get('conversation') !== '1') return;
    const next = new URLSearchParams(searchParams);
    next.delete('conversation');
    setSearchParams(next, { replace: true });
  }, [boardId, searchParams, setSearchParams]);

  const handleOpenCollaboration = () => {
    const summary = queryClient.getQueryData<PipelineBoardCollaborationSummary>(
      pipelineCollaborationKeys.summary(boardId),
    );
    const unread = summary?.unread_announcements_count ?? 0;
    const pending = summary?.polls_pending_vote_count ?? 0;
    setCollaborationInitialTab(unread > 0 ? 'notices' : pending > 0 ? 'polls' : 'notices');
    setCollaborationOpen(true);
  };

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
      leads: (stage.leads ?? []).filter((lead) => leadMatchesSearchQuery(lead, leadQuery)),
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

  const handleToggleComplete = (lead: PipelineLead, complete: boolean) => {
    updateLead.mutate({
      id: lead.id,
      board_id: boardId,
      status: complete ? 'won' : 'open',
      silent: true,
    });
  };

  const applySearchToken = (token: string) => {
    setLeadQuery((prev) => (prev.trim() ? `${prev.trim()} ${token}` : token));
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const headerBoard = board ?? switcherBoards.find((b) => b.id === boardId);
  const boardBgStyle = headerBoard ? pipelineBoardBackgroundStyleFromBoard(headerBoard) : undefined;
  const isTaskBoard = board ? boardUsesTaskTerminology(board) : workspace === 'estimates';
  const itemLabel = isTaskBoard ? 'task' : 'lead';

  if (workspace === 'pipeline' && board && !boardBelongsToPipelineWorkspace(board)) {
    return <Navigate to={ROUTES.ESTIMATES.BOARD(boardId)} replace />;
  }

  if (workspace === 'estimates' && board && !boardBelongsToEstimatesWorkspace(board)) {
    return <Navigate to={ROUTES.PIPELINE.BOARD(boardId)} replace />;
  }

  if (isError && !board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50/50 p-8 text-center">
        <p className="text-sm font-medium text-red-800">Could not load this board</p>
        <p className="max-w-md text-sm text-red-700/80">
          {(error as Error)?.message ?? 'Check your connection and try again.'}
        </p>
        <Button variant="secondary" onClick={() => void refetch()} className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!board && (isLoading || boardId <= 0)) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/50 shadow-sm"
        style={boardBgStyle}
      >
        <header className="shrink-0 border-b border-white/40 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-indigo-500/80">{workspaceLabel}</span>
            <div className="h-4 w-32 animate-pulse rounded bg-indigo-100/80" />
          </div>
        </header>
        <KanbanBoardSkeleton />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-gray-800">Board not found</p>
        <p className="text-sm text-gray-500">It may have been archived or you no longer have access.</p>
        <Button variant="secondary" onClick={() => window.history.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/50 shadow-sm transition-opacity duration-200"
      style={boardBgStyle}
    >
      <header className="relative z-40 shrink-0 border-b border-white/40 bg-white/85 px-3 py-3 backdrop-blur-sm sm:px-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-indigo-500/80">
          <span>{workspaceLabel}</span>
          {board && (
            <BoardAccessBadges
              visibility={board.visibility}
              memberRole={mySharedBoardRole}
              className="normal-case tracking-normal"
            />
          )}
          {/* Keeping the header clean — "Refreshing…" chip removed. */}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-2 lg:min-w-[200px]">
            <BoardSearchMenu
              boards={switcherBoards}
              activeBoard={board}
              onCreateBoard={() => setCreateBoardOpen(true)}
              boardRoute={boardRoute}
              boardsListRoute={boardsListRoute}
              allowCreateBoard={allowCreateBoard}
              workspaceLabel={workspaceLabel}
            />
            <BoardCollaborationButton
              boardId={boardId}
              onClick={handleOpenCollaboration}
            />
            {showBoardManagementControls && (
              <button
                type="button"
                onClick={() => setEditBoardOpen(true)}
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
                type="search"
                value={leadQuery}
                onChange={(e) => setLeadQuery(e.target.value)}
                placeholder={isTaskBoard ? 'Search tasks…' : 'Search leads…'}
                className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {leadQuery && (
                <button
                  type="button"
                  onClick={() => setLeadQuery('')}
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
                onClick={() => setViewMode('kanban')}
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
                onClick={() => setViewMode('calendar')}
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
                  <Button
                    variant="secondary"
                    onClick={() => setAddStageOpen(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <Columns3 className="h-4 w-4" />
                    Add column
                  </Button>
                )}
                {canContribute && (
                  <Button
                    onClick={() => setCreateStageId(stages[0]?.id ?? allStages[0]?.id ?? null)}
                    className="inline-flex items-center gap-2 shadow-sm"
                    disabled={!allStages.length}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isTaskBoard ? 'Add task' : 'Add card'}
                  </Button>
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
                {filteredCount} matching &ldquo;{leadQuery.trim()}&rdquo;
              </span>
            ) : (
              <LeadSearchHint className="text-xs" onApplyToken={applySearchToken} />
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
              onLeadHistoryClick={(lead) => setHistoryLeadId(lead.id)}
              onToggleComplete={canContribute ? handleToggleComplete : undefined}
              onAddLead={canContribute ? (stageId) => setCreateStageId(stageId) : undefined}
              onDropLead={canContribute ? handleDropLead : undefined}
              onDropColumn={canContribute ? handleDropColumn : undefined}
              onEditStage={showBoardManagementControls ? (s) => setEditStage(s) : undefined}
              isProjectBoard={isTaskBoard}
            />
          ))}
          {showBoardManagementControls && (
          <button
            type="button"
            onClick={() => setAddStageOpen(true)}
            className="flex h-full min-h-[120px] w-[48px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/50 bg-white/40 text-indigo-700 shadow-sm backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/55"
            title="Add column"
          >
            <Plus className="h-5 w-5" />
          </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BoardCalendarView boardId={boardId} onLeadClick={setSelectedLeadId} isProjectBoard={isTaskBoard} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BoardProgressView
            boardId={boardId}
            summary={progressSummary}
            isLoading={progressLoading}
            isFetching={progressFetching}
            period={progressPeriod}
            onPeriodChange={setProgressPeriod}
          />
        </div>
      )}

      <BoardSwitcherIcons
        allowCreate={allowCreateBoard}
        onOpenAll={() => setAllBoardsOpen(true)}
        onOpenResources={() => {
          setViewMode('kanban');
          setResourcesOpen(true);
        }}
        resourcesCount={resourcesCount}
        onOpenProgress={() => setViewMode((mode) => (mode === 'progress' ? 'kanban' : 'progress'))}
        progressActive={viewMode === 'progress'}
        onOpenConversation={() => {
          setViewMode('kanban');
          setConversationOpen(true);
        }}
        conversationMessagesCount={conversationMessagesCount}
        conversationUnreadCount={conversationUnreadCount}
        onCreateNew={() => setCreateBoardOpen(true)}
      />

      <AllBoardsPickerModal
        open={allBoardsOpen}
        onClose={() => setAllBoardsOpen(false)}
        boards={switcherBoards}
        activeBoardId={boardId}
        boardRoute={boardRoute}
        boardsListRoute={boardsListRoute}
        workspace={workspace}
      />

      {createStageId != null && (
        <CreateLeadModal
          open
          boardId={boardId}
          stageId={createStageId}
          onClose={() => setCreateStageId(null)}
          defaultCardType={isTaskBoard ? 'card' : undefined}
          workspace={workspace}
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
          initialLead={findKanbanLead(board, commentsLeadId)}
          onClose={() => setCommentsLeadId(null)}
        />
      )}

      {historyLeadId != null && (
        <LeadHistoryModal
          leadId={historyLeadId}
          onClose={() => setHistoryLeadId(null)}
        />
      )}

      {selectedLeadId != null && board && (
        <LeadDetailModal
          leadId={selectedLeadId}
          boardId={boardId}
          board={board}
          boardAccess={{
            projectCreatedBy: project?.created_by,
            projectMembers,
          }}
          initialLead={findKanbanLead(board, selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      <BoardCollaborationDrawer
        key={collaborationOpen ? collaborationInitialTab : 'closed'}
        boardId={boardId}
        canManage={showBoardManagementControls}
        canContribute={canContribute}
        open={collaborationOpen}
        initialTab={collaborationInitialTab}
        onClose={() => setCollaborationOpen(false)}
      />

      <BoardResourcesModal
        boardId={boardId}
        canContribute={canContributeResources}
        open={resourcesOpen}
        onClose={() => setResourcesOpen(false)}
      />

      <BoardConversationModal
        boardId={boardId}
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
        canContribute={canContribute}
        board={board}
        boardAccess={{
          projectCreatedBy: project?.created_by,
          projectMembers,
        }}
        onOpenBoardSettings={showBoardManagementControls ? () => {
          setConversationOpen(false);
          setEditBoardOpen(true);
        } : undefined}
      />
    </div>
  );
}
