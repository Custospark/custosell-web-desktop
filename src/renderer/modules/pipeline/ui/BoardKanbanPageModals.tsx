import CreateLeadModal from './CreateLeadModal';
import CreateBoardModal from './CreateBoardModal';
import EditBoardModal from './EditBoardModal';
import DuplicateLeadModal from './DuplicateLeadModal';
import BoardCardImportModal from './BoardCardImportModal';
import EditStageModal from './EditStageModal';
import DeleteStageModal from './DeleteStageModal';
import AddStageModal from './AddStageModal';
import LeadDetailModal from './LeadDetailModal';
import LeadCommentsModal from './LeadCommentsModal';
import LeadHistoryModal from './LeadHistoryModal';
import AllBoardsPickerModal from './AllBoardsPickerModal';
import BoardCollaborationDrawer from './BoardCollaborationDrawer';
import BoardResourcesModal from './BoardResourcesModal';
import BoardConversationModal from './BoardConversationModal';
import { findKanbanLead } from '../api/pipelineOptimisticCache';
import type { PipelineBoard, PipelineStage } from '../api/pipelineTypes';
import type { ProjectMember } from '../../estimates/api/projectTypes';

type BoardWorkspace = 'pipeline' | 'estimates';

interface BoardKanbanPageModalsProps {
  board: PipelineBoard;
  boardId: number;
  workspace: BoardWorkspace;
  isTaskBoard: boolean;
  allowCreateBoard: boolean;
  showBoardManagementControls: boolean;
  canContribute: boolean;
  canContributeResources: boolean;
  allStages: PipelineStage[];
  projectCreatedBy?: number;
  projectMembers: ProjectMember[];
  boardRoute: (id: number) => string;
  boardsListRoute: string;
  switcherBoards: PipelineBoard[];
  allBoardsOpen: boolean;
  setAllBoardsOpen: (open: boolean) => void;
  createStageId: number | null;
  setCreateStageId: (id: number | null) => void;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  createBoardOpen: boolean;
  setCreateBoardOpen: (open: boolean) => void;
  editBoardOpen: boolean;
  setEditBoardOpen: (open: boolean) => void;
  addStageOpen: boolean;
  setAddStageOpen: (open: boolean) => void;
  editStage: PipelineStage | null;
  setEditStage: (stage: PipelineStage | null) => void;
  deleteStage: PipelineStage | null;
  setDeleteStage: (stage: PipelineStage | null) => void;
  commentsLeadId: number | null;
  setCommentsLeadId: (id: number | null) => void;
  historyLeadId: number | null;
  setHistoryLeadId: (id: number | null) => void;
  selectedLeadId: number | null;
  setSelectedLeadId: (id: number | null) => void;
  copyLeadId: number | null;
  setCopyLeadId: (id: number | null) => void;
  collaborationOpen: boolean;
  collaborationInitialTab: 'notices' | 'polls';
  setCollaborationOpen: (open: boolean) => void;
  resourcesOpen: boolean;
  setResourcesOpen: (open: boolean) => void;
  conversationOpen: boolean;
  setConversationOpen: (open: boolean) => void;
}

export default function BoardKanbanPageModals(props: BoardKanbanPageModalsProps) {
  const {
    board,
    boardId,
    workspace,
    isTaskBoard,
    allowCreateBoard,
    showBoardManagementControls,
    canContribute,
    canContributeResources,
    allStages,
    projectCreatedBy,
    projectMembers,
    boardRoute,
    boardsListRoute,
    switcherBoards,
    allBoardsOpen,
    setAllBoardsOpen,
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
    commentsLeadId,
    setCommentsLeadId,
    historyLeadId,
    setHistoryLeadId,
    selectedLeadId,
    setSelectedLeadId,
    copyLeadId,
    setCopyLeadId,
    collaborationOpen,
    collaborationInitialTab,
    setCollaborationOpen,
    resourcesOpen,
    setResourcesOpen,
    conversationOpen,
    setConversationOpen,
  } = props;

  const boardAccess = {
    projectCreatedBy,
    projectMembers,
  };

  return (
    <>
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

      {copyLeadId != null && canContribute && (
        <DuplicateLeadModal
          open
          lead={findKanbanLead(board, copyLeadId) ?? null}
          boardId={boardId}
          workspace={workspace}
          onClose={() => setCopyLeadId(null)}
        />
      )}

      <BoardCardImportModal
        open={importOpen}
        boardId={boardId}
        onClose={() => setImportOpen(false)}
        itemLabel={isTaskBoard ? 'task' : 'card'}
      />

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

      {commentsLeadId != null && (
        <LeadCommentsModal
          leadId={commentsLeadId}
          boardId={boardId}
          board={board}
          boardAccess={boardAccess}
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

      {selectedLeadId != null && (
        <LeadDetailModal
          leadId={selectedLeadId}
          boardId={boardId}
          board={board}
          boardAccess={boardAccess}
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
        boardAccess={boardAccess}
        onOpenBoardSettings={showBoardManagementControls ? () => {
          setConversationOpen(false);
          setEditBoardOpen(true);
        } : undefined}
      />
    </>
  );
}
