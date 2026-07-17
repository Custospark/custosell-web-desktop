import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { PipelineBoardCollaborationSummary, BoardViewMode, PipelineLead, PipelineStage } from '../api/pipelineTypes';
import {
  useMovePipelineLead,
  usePipelineBoards,
  useBoardAccessSync,
  usePipelineKanban,
  useReorderPipelineStages,
  useUpdatePipelineLead,
} from '../api/usePipelineQueries';
import {
  boardUsesTaskTerminology,
  filterBoardsForWorkspace,
} from '../api/pipelineBoardWorkspace';
import { leadMatchesSearchQuery } from '../api/pipelineLeadSearch';
import { pipelineCollaborationKeys, useBoardAnnouncements, useBoardPolls } from '../api/usePipelineCollaborationQueries';
import { pipelineBoardBackgroundStyleFromBoard, sortLeads } from '../api/pipelineKanbanCache';
import { useBoardResourcesSummary } from '../api/usePipelineResourceQueries';
import { useBoardConversationSummary } from '../api/usePipelineConversationQueries';
import { useBoardProgressSummaryDisplay } from '../api/useBoardProgressQueries';
import type { ProgressPeriod } from '../api/pipelineProgressTerms';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useProject, useProjectMembers } from '../../estimates/api/useProjectQueries';
import { canContributeToBoard, canManageBoardSettings, getSharedBoardMemberRole } from '../../../shared/utils/moduleAccess';
import { useBoardAccessChangeNotice } from '../ui/useBoardAccessChangeNotice';
import { ROUTES } from '../../../app/routes/constants/shared.paths';

type BoardWorkspace = 'pipeline' | 'estimates';

const FAME_COLORS = [
  '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981',
  '#f97316', '#6366f1', '#d946ef', '#14b8a6', '#eab308',
];

function workspaceFromPath(pathname: string): BoardWorkspace {
  return pathname.startsWith('/estimates/boards') ? 'estimates' : 'pipeline';
}

export function useBoardKanbanPage() {
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
  const [copyLeadId, setCopyLeadId] = useState<number | null>(null);
  const [moveLeadId, setMoveLeadId] = useState<number | null>(null);
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
  const [fameColorIndex, setFameColorIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFameColorIndex((i) => (i + 1) % FAME_COLORS.length), 30000);
    return () => clearInterval(id);
  }, []);

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
    () => [...(board?.stages ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((stage) => ({ ...stage, leads: sortLeads(stage.leads ?? []) })),
    [board?.stages],
  );

  const allLeadsCount = useMemo(
    () => allStages.reduce((n, s) => n + (s.leads?.length ?? 0), 0),
    [allStages],
  );

  const stages = useMemo(() => {
    const q = leadQuery.trim();
    if (!q) return allStages;
    return allStages.map((stage) => ({
      ...stage,
      leads: (stage.leads ?? []).filter((lead) =>
        leadMatchesSearchQuery(lead, q, user?.id),
      ),
    }));
  }, [allStages, leadQuery, user?.id]);

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

  const handleCopyClick = (lead: PipelineLead) => {
    setCopyLeadId(lead.id);
  };

  const handleMoveClick = (lead: PipelineLead) => {
    setMoveLeadId(lead.id);
  };

  const handleToggleComplete = (lead: PipelineLead, complete: boolean) => {
    updateLead.mutate({
      id: lead.id,
      board_id: boardId,
      status: complete ? 'won' : 'open',
      silent: true,
    });
  };

  const handlePinClick = (lead: PipelineLead) => {
    updateLead.mutate({
      id: lead.id,
      board_id: boardId,
      is_pinned: !lead.is_pinned,
      silent: true,
    });
  };

  const applySearchToken = (token: string) => {
    setLeadQuery((prev) => (prev.trim() ? `${prev.trim()} ${token}` : token));
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const headerBoard = board ?? switcherBoards.find((b) => b.id === boardId);
  const boardBgStyle = headerBoard ? pipelineBoardBackgroundStyleFromBoard(headerBoard) : undefined;
  const fameBgStyle = boardBgStyle?.backgroundColor || boardBgStyle?.backgroundImage
    ? boardBgStyle
    : { backgroundColor: FAME_COLORS[fameColorIndex] };
  const isTaskBoard = board ? boardUsesTaskTerminology(board) : workspace === 'estimates';
  const itemLabel = isTaskBoard ? 'task' : 'lead';

  return {
    boardBgStyle,
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
    setProgressCustomFrom,
    progressCustomTo,
    setProgressCustomTo,
    selectedProgressStageIds,
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
    allLeadsCount,
    stages,
    filteredCount,
    handleDropColumn,
    handleDropLead,
    handleCopyClick,
    handleMoveClick,
    handleToggleComplete,
    handlePinClick,
    applySearchToken,
    fameBgStyle,
    isTaskBoard,
    itemLabel,
    project,
    projectMembers,
  };
}
