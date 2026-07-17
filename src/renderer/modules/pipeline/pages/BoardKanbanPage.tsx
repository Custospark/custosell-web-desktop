import { Navigate } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { PipelineLead } from '../api/pipelineTypes';
import {
  boardBelongsToEstimatesWorkspace,
  boardBelongsToPipelineWorkspace,
} from '../api/pipelineBoardWorkspace';
import KanbanColumn from '../ui/KanbanColumn';
import BoardSwitcherIcons from '../ui/BoardSwitcherIcons';
import BoardCalendarView from '../ui/BoardCalendarView';
import BoardProgressView from '../ui/BoardProgressView';
import BoardFameView from '../ui/BoardFameView';
import PetalBackground from '../ui/PetalBackground';
import KanbanBoardSkeleton from '../ui/KanbanBoardSkeleton';
import BoardKanbanPageModals from '../ui/BoardKanbanPageModals';
import BoardKanbanPageHeader from '../ui/BoardKanbanPageHeader';
import { Plus, RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useBoardKanbanPage } from './useBoardKanbanPage';

export default function BoardKanbanPage() {
  const {
    workspace,
    boardId,
    board,
    isLoading,
    isError,
    error,
    refetch,
    switcherBoards,
    viewMode,
    setViewMode,
    progressPeriod,
    setProgressPeriod,
    progressCustomFrom,
    progressCustomTo,
    setProgressCustomFrom,
    setProgressCustomTo,
    setSelectedProgressStageIds,
    leadQuery,
    setLeadQuery,
    createStageId,
    setCreateStageId,
    importOpen,
    setImportOpen,
    createBoardOpen,
    setCreateBoardOpen,
    editBoardOpen,
    setEditBoardOpen,
    addStageOpen,
    setAddStageOpen,
    editStage,
    setEditStage,
    deleteStage,
    setDeleteStage,
    selectedLeadId,
    setSelectedLeadId,
    copyLeadId,
    setCopyLeadId,
    moveLeadId,
    setMoveLeadId,
    commentsLeadId,
    setCommentsLeadId,
    historyLeadId,
    setHistoryLeadId,
    collaborationOpen,
    collaborationInitialTab,
    setCollaborationOpen,
    allBoardsOpen,
    setAllBoardsOpen,
    resourcesOpen,
    setResourcesOpen,
    conversationOpen,
    setConversationOpen,
    searchInputRef,
    canManageSettings,
    canContribute,
    canContributeResources,
    resourcesCount,
    conversationMessagesCount,
    conversationUnreadCount,
    progressStages,
    resolvedProgressStageIds,
    progressSummary,
    headerMemberRole,
    showBoardManagementControls,
    boardRoute,
    boardsListRoute,
    allowCreateBoard,
    workspaceLabel,
    handleOpenCollaboration,
    allStages,
    stages,
    filteredCount,
    handleDropColumn,
    handleDropLead,
    handleCopyClick,
    handleMoveClick,
    handleToggleComplete,
    applySearchToken,
    fameBgStyle,
    isTaskBoard,
    itemLabel,
    project,
    projectMembers,
    boardBgStyle,
  } = useBoardKanbanPage();

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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/50 shadow-sm">
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
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/50 shadow-sm transition-opacity duration-200"
      style={boardBgStyle}
    >
      {viewMode === 'fame' && <PetalBackground />}
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
              onLeadCopyClick={canContribute ? handleCopyClick : undefined}
              onLeadMoveClick={canContribute ? handleMoveClick : undefined}
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
          <BoardCalendarView boardId={boardId} onLeadClick={setSelectedLeadId} isProjectBoard={isTaskBoard} workspace={workspace} />
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
      <div className={cn('min-h-0 flex-1 overflow-y-auto', viewMode !== 'fame' && 'hidden')} aria-hidden={viewMode !== 'fame'} style={fameBgStyle}>
        <BoardFameView canContribute={canContribute} />
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
        onOpenFame={() => setViewMode((mode) => (mode === 'fame' ? 'kanban' : 'fame'))}
        fameActive={viewMode === 'fame'}
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
        copyLeadId={copyLeadId}
        setCopyLeadId={setCopyLeadId}
        moveLeadId={moveLeadId}
        setMoveLeadId={setMoveLeadId}
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
