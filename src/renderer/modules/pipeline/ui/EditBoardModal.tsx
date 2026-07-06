import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useUpdatePipelineBoard } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineBoard, PipelineVisibility } from '../api/pipelineTypes';
import BoardMemberPicker, { membersFromBoard } from './BoardMemberPicker';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import { AlignLeft, Archive, Kanban, Lock, Palette, Share2, Type, Users } from 'lucide-react';
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

const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function EditBoardModal({ open, board, onClose }: EditBoardModalProps) {
  if (!open) return null;
  return <EditBoardModalForm key={board.id} board={board} onClose={onClose} />;
}

function EditBoardModalForm({ board, onClose }: { board: PipelineBoard; onClose: () => void }) {
  const navigate = useNavigate();
  const updateBoard = useUpdatePipelineBoard();
  const { confirm } = useConfirm();
  const [isArchiving, setIsArchiving] = useState(false);

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? '');
  const [visibility, setVisibility] = useState<PipelineVisibility>(board.visibility);
  const [coverColor, setCoverColor] = useState(board.cover_color ?? '#6366f1');
  const [members, setMembers] = useState<BoardMemberInput[]>(membersFromBoard(board.members));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateBoard.mutateAsync({
      id: board.id,
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      cover_color: coverColor,
      members: visibility === 'shared' ? members : [],
    });
    onClose();
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive board?',
      message: `"${board.name}" will be hidden from the board list. Leads are preserved.`,
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
          description="Update name, visibility, and cover color."
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
          <PipelineFormSection title="Members" icon={Users}>
            <BoardMemberPicker value={members} onChange={setMembers} excludeUserId={board.created_by} />
          </PipelineFormSection>
        )}

        <PipelineFormSection title="Cover color" icon={Palette}>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setCoverColor(color)}
                className={cn(
                  'h-9 w-9 rounded-lg shadow-sm ring-2 ring-offset-2 transition-transform hover:scale-105',
                  coverColor === color ? 'ring-indigo-500' : 'ring-transparent',
                )}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </PipelineFormSection>

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