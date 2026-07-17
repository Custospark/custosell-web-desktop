import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useUpdatePipelineBoard, useUploadBoardBackground, useDeletePipelineBoard, useDuplicatePipelineBoard } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineBoard, PipelineVisibility } from '../api/pipelineTypes';
import { membersFromBoard } from '../api/pipelineBoardMembers';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useProjectMembers,
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
  useProject,
} from '../../estimates/api/useProjectQueries';
import ProjectMemberPicker from '../../estimates/ui/ProjectMemberPicker';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import BoardVisibilitySection from './BoardVisibilitySection';
import BoardBackgroundSection from './BoardBackgroundSection';
import BoardAutomationsSection from './BoardAutomationsSection';
import { normalizeBoardBackgroundUploadPath } from '../api/pipelineKanbanCache';
import { addBoardUploadHistory, loadBoardUploadHistory } from '../api/boardUploadHistory';
import { AlignLeft, Kanban, Copy, Trash2, Type, Users, Zap } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canManageBoardSettings, canManageProjectTeam } from '../../../shared/utils/moduleAccess';
import type { BoardWorkspace } from './boardVisibilityOptions';

interface EditBoardModalProps {
  open: boolean;
  board: PipelineBoard;
  onClose: () => void;
  workspace?: BoardWorkspace;
}

export default function EditBoardModal({ open, board, onClose, workspace = 'pipeline' }: EditBoardModalProps) {
  if (!open) return null;
  return <EditBoardModalForm key={board.id} board={board} onClose={onClose} workspace={workspace} />;
}

function EditBoardModalForm({
  board,
  onClose,
  workspace,
}: {
  board: PipelineBoard;
  onClose: () => void;
  workspace: BoardWorkspace;
}) {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const updateBoard = useUpdatePipelineBoard();
  const deleteBoard = useDeletePipelineBoard();
  const duplicateBoard = useDuplicatePipelineBoard();
  const uploadBg = useUploadBoardBackground();
  const { confirm } = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? '');
  const [visibility, setVisibility] = useState<PipelineVisibility>(board.visibility);
  const [members, setMembers] = useState<BoardMemberInput[]>(membersFromBoard(board.members));
  const initialBgType = board.background_type ?? 'color';
  const initialBgValue = initialBgType === 'upload'
    ? normalizeBoardBackgroundUploadPath(board.background_value)
    : (board.background_value ?? board.cover_color ?? '#6366f1');

  const [bgType, setBgType] = useState(initialBgType);
  const [bgValue, setBgValue] = useState(initialBgValue);
  const [uploadHistory, setUploadHistory] = useState<string[]>(() =>
    loadBoardUploadHistory(board.id, initialBgType === 'upload' ? initialBgValue : null),
  );

  const isProjectBoard = Boolean(board.project_id);
  const projectId = board.project_id ?? 0;
  const { data: project } = useProject(isProjectBoard ? projectId : 0);
  const projectOwnerId = project?.created_by ?? board.created_by;
  const {
    data: projectMembers = [],
    isLoading: membersLoading,
    isFetching: membersFetching,
  } = useProjectMembers(isProjectBoard ? projectId : 0);
  const addProjectMember = useAddProjectMember(projectId);
  const updateProjectMember = useUpdateProjectMember(projectId);
  const removeProjectMember = useRemoveProjectMember(projectId);
  const memberMutationPending =
    addProjectMember.isPending || updateProjectMember.isPending || removeProjectMember.isPending;
  const canManageTeam = canManageProjectTeam(user, projectMembers, projectOwnerId ?? undefined);
  const canManageSettings = canManageBoardSettings(user, board, {
    projectCreatedBy: projectOwnerId,
    projectMembers,
  });
  const membersLoadingState = membersLoading || (membersFetching && projectMembers.length === 0);

  const canDelete = canManageSettings && !board.is_default;

  const handleBgSelect = (type: string, value: string) => {
    setBgType(type);
    setBgValue(value);
    if (type === 'color') {
      updateBoard.mutate({
        id: board.id,
        cover_color: value,
        background_type: 'color',
        background_value: value,
        silent: true,
      });
    } else if (type === 'gallery') {
      updateBoard.mutate({ id: board.id, background_type: 'gallery', background_value: value, silent: true });
    } else if (type === 'upload') {
      const path = normalizeBoardBackgroundUploadPath(value);
      setUploadHistory((prev) => (prev.includes(path) ? prev : [path, ...prev]));
      updateBoard.mutate({
        id: board.id,
        background_type: 'upload',
        background_value: path,
        silent: true,
      });
    }
  };

  const handleBgUpload = async (file: File) => {
    try {
      const result = await uploadBg.mutateAsync({ boardId: board.id, file });
      const path = normalizeBoardBackgroundUploadPath(result.background_value);
      setBgType('upload');
      setBgValue(path);
      setUploadHistory(addBoardUploadHistory(board.id, path));
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !canManageSettings) return;
    await updateBoard.mutateAsync({
      id: board.id,
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      members: visibility === 'shared' ? members : [],
      cover_color: bgType === 'color' ? bgValue : board.cover_color,
      background_type: bgType,
      background_value: bgType === 'upload' ? normalizeBoardBackgroundUploadPath(bgValue) : bgValue,
    });
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete board permanently?',
      message: `"${board.name}" and all its cards will be permanently removed. This cannot be undone.`,
      confirmText: 'Delete board',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    await deleteBoard.mutateAsync(board.id);
    setIsDeleting(false);
    onClose();
    const listRoute = workspace === 'estimates' || isProjectBoard
      ? ROUTES.ESTIMATES.BOARDS
      : ROUTES.PIPELINE.BOARDS;
    navigate(listRoute);
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    const newBoard = await duplicateBoard.mutateAsync(board.id);
    setIsDuplicating(false);
    onClose();
    const boardRoute = workspace === 'estimates' || isProjectBoard
      ? ROUTES.ESTIMATES.BOARD
      : ROUTES.PIPELINE.BOARD;
    navigate(boardRoute(newBoard.id));
  };

  return (
    <Modal isOpen onClose={onClose} title="Board settings" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title={
            isProjectBoard
              ? 'Edit project board'
              : workspace === 'estimates'
                ? 'Edit personal board'
                : 'Edit pipeline board'
          }
          description={
            isProjectBoard
              ? 'Update board appearance and manage who can view or contribute on this project.'
              : 'Update name, background, visibility, and team members.'
          }
        />

        <PipelineFormSection title="Board details" icon={Type}>
          <PipelineIconField label="Board name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={pipelineInputClass}
              required
              disabled={!canManageSettings}
            />
          </PipelineIconField>
          <PipelineIconField label="Description" icon={AlignLeft}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(pipelineInputClass, 'resize-none')}
              disabled={!canManageSettings}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <BoardBackgroundSection
          boardId={board.id}
          bgType={bgType}
          bgValue={bgValue}
          uploadHistory={uploadHistory}
          onSelect={canManageSettings ? handleBgSelect : () => {}}
          onUpload={canManageSettings ? handleBgUpload : async () => {}}
          isUploading={uploadBg.isPending}
        />

        {isProjectBoard ? (
          <PipelineFormSection title="Project team" icon={Users}>
            <p className="mb-3 text-xs text-gray-500">
              Invite viewers (read-only), contributors (move cards and add tasks), or managers (manage team).
            </p>
            <ProjectMemberPicker
              members={projectMembers}
              onAdd={(payload) => addProjectMember.mutate(payload)}
              onRemove={(userId) => removeProjectMember.mutate(userId)}
              onRoleChange={(userId, role) => updateProjectMember.mutate({ userId, role })}
              lockedUserId={projectOwnerId ?? undefined}
              loading={memberMutationPending}
              isLoading={membersLoadingState}
              canManage={canManageTeam}
            />
          </PipelineFormSection>
        ) : null}

        <BoardVisibilitySection
          workspace={workspace}
          visibility={visibility}
          savedVisibility={board.visibility}
          onVisibilityChange={setVisibility}
          members={members}
          onMembersChange={setMembers}
          excludeUserId={board.created_by}
          lockedUserId={board.created_by}
          canManage={canManageSettings}
        />

        {(board.stages?.length ?? 0) > 0 && (
          <PipelineFormSection title="Discussion alerts" icon={Zap}>
            <BoardAutomationsSection
              boardId={board.id}
              stages={board.stages ?? []}
              boardName={name}
              canManage={canManageSettings}
            />
          </PipelineFormSection>
        )}

        {!canManageSettings && (
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {isProjectBoard
              ? 'You can view this board&apos;s settings. Only the board owner or project managers can change team access and board options.'
              : 'You can view this board&apos;s settings. Only the board owner or invited managers can change visibility, team, and board options.'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            {canManageSettings && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDuplicate}
                loading={isDuplicating}
                className="inline-flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Copy className="h-4 w-4" />
                Duplicate Board
              </Button>
            )}
            {!board.is_default && canDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                loading={isDeleting}
                className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete board
              </Button>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateBoard.isPending} disabled={!canManageSettings}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
