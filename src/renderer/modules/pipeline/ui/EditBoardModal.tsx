import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useUpdatePipelineBoard } from '../api/usePipelineQueries';
import { useUploadBoardBackground } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineBoard, PipelineVisibility } from '../api/pipelineTypes';
import BoardMemberPicker from './BoardMemberPicker';
import { membersFromBoard } from '../api/pipelineBoardMembers';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
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

interface EditBoardModalProps {
  open: boolean;
  board: PipelineBoard;
  onClose: () => void;
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

export default function EditBoardModal({ open, board, onClose }: EditBoardModalProps) {
  if (!open) return null;
  return <EditBoardModalForm key={board.id} board={board} onClose={onClose} />;
}

function EditBoardModalForm({ board, onClose }: { board: PipelineBoard; onClose: () => void }) {
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
  const [uploadHistory, setUploadHistory] = useState<string[]>(() =>
    loadBoardUploadHistory(board.id, initialBgType === 'upload' ? initialBgValue : null),
  );

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
      visibility,
      cover_color: bgType === 'color' ? bgValue : board.cover_color,
      background_type: bgType,
      background_value: bgType === 'upload' ? normalizeBoardBackgroundUploadPath(bgValue) : bgValue,
      members: visibility === 'shared' ? members : [],
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
    navigate(ROUTES.PIPELINE.BOARDS);
  };

  return (
    <Modal isOpen onClose={onClose} title="Board settings" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title="Edit pipeline board"
          description="Update name, background, visibility, and team members."
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
            <BoardMemberPicker value={members} onChange={setMembers} excludeUserId={board.created_by} />
          </PipelineFormSection>
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