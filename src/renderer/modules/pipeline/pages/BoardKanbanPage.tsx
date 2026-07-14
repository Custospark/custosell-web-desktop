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
import { leadMatchesSearchQuery } from '../api/pipelineLeadSearch';
import { pipelineCollaborationKeys, useBoardAnnouncements, useBoardPolls } from '../api/usePipelineCollaborationQueries';
import KanbanColumn from '../ui/KanbanColumn';
import BoardSwitcherIcons from '../ui/BoardSwitcherIcons';
import BoardCalendarView from '../ui/BoardCalendarView';
import BoardProgressView from '../ui/BoardProgressView';
import KanbanBoardSkeleton from '../ui/KanbanBoardSkeleton';
import { pipelineBoardBackgroundStyleFromBoard } from '../api/pipelineKanbanCache';
import { useBoardResourcesSummary } from '../api/usePipelineResourceQueries';
import { useBoardConversationSummary } from '../api/usePipelineConversationQueries';
import { useBoardProgressSummaryDisplay } from '../api/useBoardProgressQueries';
import type { ProgressPeriod } from '../api/pipelineProgressTerms';
import BoardKanbanPageModals from '../ui/BoardKanbanPageModals';
import BoardKanbanPageHeader from '../ui/BoardKanbanPageHeader';
import { Plus, RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useProject, useProjectMembers } from '../../estimates/api/useProjectQueries';
import { canContributeToBoard, canManageBoardSettings, getSharedBoardMemberRole } from '../../../shared/utils/moduleAccess';
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
  const { data: boardAccessSnapshot } = useBoardAccessSync(boardId, boardId > 0);
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
  const [progressCustomFrom, setProgressCustomFrom] = useState('');
  const [progressCustomTo, setProgressCustomTo] = useState('');
  const [selectedProgressStageIds, setSelectedProgressStageIds] = useState<number[]>([]);
  const [leadQuery, setLeadQuery] = useState('');
  const [createStageId, setCreateStageId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
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

  const progressStages = useMemo(
    () => (board?.stages ?? []).map((stage) => ({
      stage_id: stage.id,
      stage_name: stage.name,
      color: stage.color,
      sort_order: stage.sort_order,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
    })),
    [board?.stages],
  );

  const resolvedProgressStageIds = useMemo(() => {
    if (progressStages.length === 0) return [];
    if (selectedProgressStageIds.length === 0) {
      return progressStages.map((s) => s.stage_id);
    }
    const valid = selectedProgressStageIds.filter((id) => progressStages.some((s) => s.stage_id === id));
    return valid.length > 0 ? valid : progressStages.map((s) => s.stage_id);
  }, [progressStages, selectedProgressStageIds]);

  const {
    displaySummary: progressSummary,
  } = useBoardProgressSummaryDisplay(boardId, progressPeriod, {
    enabled: boardId > 0,
    poll: boardId > 0,
    stageIds: resolvedProgressStageIds,
    from: progressPeriod === 'custom' ? progressCustomFrom : undefined,
    to: progressPeriod === 'custom' ? progressCustomTo : undefined,
  });

  const canContributeResources = canContribute;

  const mySharedBoardRole = board?.visibility === 'shared'
    ? getSharedBoardMemberRole(user, board)
    : null;
  const headerMemberRole =
    boardAccessSnapshot?.current_member_role
    ?? board?.current_member_role
    ?? mySharedBoardRole;
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
      <BoardKanbanPageHeader
        workspaceLabel={workspaceLabel}
        board={board}
        boardId={boardId}
        headerMemberRole={headerMemberRole}
        switcherBoards={switcherBoards}
        boardRoute={boardRoute}
        boardsListRoute={boardsListRoute}
        allowCreateBoard={allowCreateBoard}
        showBoardManagementControls={showBoardManagementControls}
        canContribute={canContribute}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leadQuery={leadQuery}
        onLeadQueryChange={setLeadQuery}
        searchInputRef={searchInputRef}
        isTaskBoard={isTaskBoard}
        itemLabel={itemLabel}
        allLeadsCount={allLeadsCount}
        filteredCount={filteredCount}
        allStages={allStages}
        onCreateBoard={() => setCreateBoardOpen(true)}
        onOpenCollaboration={handleOpenCollaboration}
        onOpenSettings={() => setEditBoardOpen(true)}
        onAddStage={() => setAddStageOpen(true)}
        onImport={() => setImportOpen(true)}
        onAddCard={() => setCreateStageId(stages[0]?.id ?? allStages[0]?.id ?? null)}
        onApplySearchToken={applySearchToken}
      />

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
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          viewMode !== 'progress' && 'hidden',
        )}
        aria-hidden={viewMode !== 'progress'}
      >
        <BoardProgressView
          boardId={boardId}
          board={board}
          canManageTargets={canManageSettings}
          summary={progressSummary}
          period={progressPeriod}
          onPeriodChange={setProgressPeriod}
          customFrom={progressCustomFrom}
          customTo={progressCustomTo}
          onCustomRangeChange={(from, to) => {
            setProgressCustomFrom(from);
            setProgressCustomTo(to);
          }}
          stages={progressStages}
          selectedStageIds={resolvedProgressStageIds}
          onSelectedStageIdsChange={setSelectedProgressStageIds}
        />
      </div>

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

      <BoardKanbanPageModals
        board={board}
        boardId={boardId}
        workspace={workspace}
        isTaskBoard={isTaskBoard}
        allowCreateBoard={allowCreateBoard}
        showBoardManagementControls={showBoardManagementControls}
        canContribute={canContribute}
        canContributeResources={canContributeResources}
        allStages={allStages}
        projectCreatedBy={project?.created_by}
        projectMembers={projectMembers}
        boardRoute={boardRoute}
        boardsListRoute={boardsListRoute}
        switcherBoards={switcherBoards}
        allBoardsOpen={allBoardsOpen}
        setAllBoardsOpen={setAllBoardsOpen}
        createStageId={createStageId}
        setCreateStageId={setCreateStageId}
        importOpen={importOpen}
        setImportOpen={setImportOpen}
        createBoardOpen={createBoardOpen}
        setCreateBoardOpen={setCreateBoardOpen}
        editBoardOpen={editBoardOpen}
        setEditBoardOpen={setEditBoardOpen}
        addStageOpen={addStageOpen}
        setAddStageOpen={setAddStageOpen}
        editStage={editStage}
        setEditStage={setEditStage}
        deleteStage={deleteStage}
        setDeleteStage={setDeleteStage}
        commentsLeadId={commentsLeadId}
        setCommentsLeadId={setCommentsLeadId}
        historyLeadId={historyLeadId}
        setHistoryLeadId={setHistoryLeadId}
        selectedLeadId={selectedLeadId}
        setSelectedLeadId={setSelectedLeadId}
        collaborationOpen={collaborationOpen}
        collaborationInitialTab={collaborationInitialTab}
        setCollaborationOpen={setCollaborationOpen}
        resourcesOpen={resourcesOpen}
        setResourcesOpen={setResourcesOpen}
        conversationOpen={conversationOpen}
        setConversationOpen={setConversationOpen}
      />
    </div>
  );
}
