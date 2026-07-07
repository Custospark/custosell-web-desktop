import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useUpdatePipelineBoard } from '../api/usePipelineQueries';
import { useUploadBoardBackground } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineBoard, PipelineVisibility } from '../api/pipelineTypes';
import BoardMemberPicker from './BoardMemberPicker';
import { membersFromBoard } from '../api/pipelineBoardMembers';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useProjectMembers,
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
} from '../../estimates/api/useProjectQueries';
import ProjectMemberPicker from '../../estimates/ui/ProjectMemberPicker';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import BackgroundGallery from './BackgroundGallery';
import { normalizeBoardBackgroundUploadPath } from '../api/pipelineKanbanCache';
import { addBoardUploadHistory, loadBoardUploadHistory } from '../api/boardUploadHistory';
import {
  AlignLeft, Archive, Kanban, Lock, Palette, Share2, Type, Users,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';

type BoardWorkspace = 'pipeline' | 'estimates';

interface EditBoardModalProps {
  open: boolean;
  board: PipelineBoard;
  onClose: () => void;
  workspace?: BoardWorkspace;
}

const VISIBILITY_OPTIONS: {
  value: PipelineVisibility;
  label: string;
  hint: string;
  icon: typeof Users;
}[] = [
  { value: 'team', label: 'Team', hint: 'Everyone with Pipeline access', icon: Users },
  { value: 'private', label: 'Private', hint: 'Only you can see this board', icon: Lock },
  { value: 'shared', label: 'Shared', hint: 'Invite specific members', icon: Share2 },
];

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
  const updateBoard = useUpdatePipelineBoard();
  const uploadBg = useUploadBoardBackground();
  const { confirm } = useConfirm();
  const [isArchiving, setIsArchiving] = useState(false);

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
  const [memberSearch, setMemberSearch] = useState('');
  const [uploadHistory, setUploadHistory] = useState<string[]>(() =>
    loadBoardUploadHistory(board.id, initialBgType === 'upload' ? initialBgValue : null),
  );

  const isProjectBoard = Boolean(board.project_id);
  const projectId = board.project_id ?? 0;
  const { data: projectMembers = [] } = useProjectMembers(isProjectBoard ? projectId : 0);
  const addProjectMember = useAddProjectMember(projectId);
  const updateProjectMember = useUpdateProjectMember(projectId);
  const removeProjectMember = useRemoveProjectMember(projectId);
  const memberMutationPending =
    addProjectMember.isPending || updateProjectMember.isPending || removeProjectMember.isPending;
  const { data: staff = [] } = useStaff();
  const teamQuery = memberSearch.trim().toLowerCase();
  const pipelineTeamMembers = staff
    .filter((person) => person.id !== board.created_by && (person.modules ?? []).includes('pipeline'))
    .filter((person) => !teamQuery || person.name.toLowerCase().includes(teamQuery));

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
    if (!name.trim()) return;
    await updateBoard.mutateAsync({
      id: board.id,
      name: name.trim(),
      description: description.trim() || undefined,
      ...(!isProjectBoard && {
        visibility,
        members: visibility === 'shared' ? members : [],
      }),
      cover_color: bgType === 'color' ? bgValue : board.cover_color,
      background_type: bgType,
      background_value: bgType === 'upload' ? normalizeBoardBackgroundUploadPath(bgValue) : bgValue,
    });
    onClose();
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive board?',
      message: `"${board.name}" will be hidden from the board list. Cards are preserved.`,
      confirmText: 'Archive',
      variant: 'danger',
    });
    if (!ok) return;
    setIsArchiving(true);
    await updateBoard.mutateAsync({ id: board.id, is_archived: true });
    setIsArchiving(false);
    onClose();
    const listRoute = workspace === 'estimates' || isProjectBoard
      ? ROUTES.ESTIMATES.BOARDS
      : ROUTES.PIPELINE.BOARDS;
    navigate(listRoute);
  };

  return (
    <Modal isOpen onClose={onClose} title="Board settings" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title={isProjectBoard ? 'Edit project board' : 'Edit pipeline board'}
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
            />
          </PipelineIconField>
          <PipelineIconField label="Description" icon={AlignLeft}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(pipelineInputClass, 'resize-none')}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Background" icon={Palette}>
          <BackgroundGallery
            boardId={board.id}
            currentType={bgType}
            currentValue={bgValue}
            uploadHistory={uploadHistory}
            onSelect={handleBgSelect}
            onUpload={handleBgUpload}
            isUploading={uploadBg.isPending}
          />
        </PipelineFormSection>

        {isProjectBoard ? (
          <PipelineFormSection title="Project team" icon={Users}>
            <p className="mb-3 text-xs text-gray-500">
              Invite viewers (read-only), contributors (move cards and add tasks), or managers (manage team).
            </p>
            <ProjectMemberPicker
              members={projectMembers}
              onAdd={(userId, role) => addProjectMember.mutate({ user_id: userId, role })}
              onRemove={(userId) => removeProjectMember.mutate(userId)}
              onRoleChange={(userId, role) => updateProjectMember.mutate({ userId, role })}
              lockedUserId={board.created_by}
              loading={memberMutationPending}
            />
          </PipelineFormSection>
        ) : (
          <>
        <PipelineFormSection title="Visibility" icon={Users}>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  visibility === value
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <Icon className="mb-1 h-4 w-4 text-gray-600" />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
              </button>
            ))}
          </div>
        </PipelineFormSection>

        {visibility === 'shared' && (
          <PipelineFormSection title="Team members" icon={Users}>
            <p className="mb-2 text-xs text-gray-500">
              Invite specific members and set their permissions for this board.
            </p>
            <BoardMemberPicker
              value={members}
              onChange={setMembers}
              excludeUserId={board.created_by}
              lockedUserId={board.created_by}
            />
          </PipelineFormSection>
        )}
        {visibility === 'team' && (
          <PipelineFormSection title="Members with team access" icon={Users}>
            <p className="mb-2 text-xs text-gray-500">
              Everyone listed here can access this board through Pipeline module access.
            </p>
            <input
              type="search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search team members..."
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {pipelineTeamMembers.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2"
                >
                  <span className="truncate text-sm font-medium text-gray-900">{person.name}</span>
                  <span className="text-xs text-gray-500">{person.email}</span>
                </li>
              ))}
            </ul>
            {pipelineTeamMembers.length === 0 && (
              <p className="text-xs text-gray-500">No team members found for this filter.</p>
            )}
          </PipelineFormSection>
        )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          {!board.is_default && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleArchive}
              loading={isArchiving}
              className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Archive className="h-4 w-4" />
              Archive board
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateBoard.isPending}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}