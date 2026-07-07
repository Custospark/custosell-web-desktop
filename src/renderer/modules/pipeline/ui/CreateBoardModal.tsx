import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineBoard } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineVisibility } from '../api/pipelineTypes';
import BoardMemberPicker from './BoardMemberPicker';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import { AlignLeft, Kanban, Lock, Palette, Share2, Type, Users } from 'lucide-react';
import PipelineColorPicker from './PipelineColorPicker';
import { cn } from '../../../shared/utils/cn';

interface CreateBoardModalProps {
  open: boolean;
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


export default function CreateBoardModal({ open, onClose }: CreateBoardModalProps) {
  const navigate = useNavigate();
  const createBoard = useCreatePipelineBoard();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PipelineVisibility>('team');
  const [coverColor, setCoverColor] = useState('#6366f1');
  const [members, setMembers] = useState<BoardMemberInput[]>([]);

  const reset = () => {
    setName('');
    setDescription('');
    setVisibility('team');
    setCoverColor('#6366f1');
    setMembers([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const board = await createBoard.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      cover_color: coverColor,
      members: visibility === 'shared' ? members : undefined,
    });
    handleClose();
    navigate(ROUTES.PIPELINE.BOARD(board.id));
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Create board" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title="New pipeline board"
          description="Organize leads by stage. Pick a color so your team can spot it quickly."
        />

        <PipelineFormSection title="Board details" icon={Type}>
          <PipelineIconField label="Board name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={pipelineInputClass}
              placeholder="e.g. Enterprise deals"
              required
              autoFocus
            />
          </PipelineIconField>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <AlignLeft className="h-3.5 w-3.5 text-gray-400" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(pipelineInputClass, 'min-h-[72px] resize-none py-2.5 pl-3')}
              placeholder="What kind of opportunities belong here?"
            />
            <p className="mt-1 text-xs text-gray-500">Optional — shown in the board switcher</p>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Visibility" icon={Users}>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                    selected
                      ? 'border-blue-500 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/30'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <div className={cn('rounded-lg p-2', selected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                  <span className="text-xs leading-snug text-gray-500">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </PipelineFormSection>

        {visibility === 'shared' && (
          <PipelineFormSection title="Members" icon={Users}>
            <BoardMemberPicker value={members} onChange={setMembers} />
          </PipelineFormSection>
        )}

        <PipelineFormSection title="Board color" icon={Palette}>
          <PipelineColorPicker value={coverColor} onChange={setCoverColor} />
          <div
            className="mt-3 h-12 rounded-xl border border-gray-200 shadow-inner"
            style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}
          />
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={createBoard.isPending} className="inline-flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
