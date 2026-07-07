import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineBoard, useUpdatePipelineBoard, useUploadBoardBackground } from '../api/usePipelineQueries';
import type { BoardMemberInput, PipelineVisibility } from '../api/pipelineTypes';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import BoardVisibilitySection from './BoardVisibilitySection';
import BoardBackgroundSection from './BoardBackgroundSection';
import { normalizeBoardBackgroundUploadPath } from '../api/pipelineKanbanCache';
import { AlignLeft, Kanban, Type } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BoardWorkspace } from './boardVisibilityOptions';

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  workspace?: BoardWorkspace;
}

export default function CreateBoardModal({
  open,
  onClose,
  workspace = 'pipeline',
}: CreateBoardModalProps) {
  const navigate = useNavigate();
  const createBoard = useCreatePipelineBoard();
  const updateBoard = useUpdatePipelineBoard();
  const uploadBg = useUploadBoardBackground();
  const isEstimates = workspace === 'estimates';
  const pendingUploadRef = useRef<File | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PipelineVisibility>(isEstimates ? 'private' : 'team');
  const [members, setMembers] = useState<BoardMemberInput[]>([]);
  const [bgType, setBgType] = useState('color');
  const [bgValue, setBgValue] = useState('#6366f1');

  const reset = () => {
    setName('');
    setDescription('');
    setVisibility(isEstimates ? 'private' : 'team');
    setMembers([]);
    setBgType('color');
    setBgValue('#6366f1');
    pendingUploadRef.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBgSelect = (type: string, value: string) => {
    setBgType(type);
    setBgValue(value);
    if (type !== 'upload') {
      pendingUploadRef.current = null;
    }
  };

  const handleBgUpload = (file: File) => {
    pendingUploadRef.current = file;
    setBgType('upload');
    setBgValue(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pendingFile = pendingUploadRef.current;
    const useDeferredUpload = bgType === 'upload' && pendingFile;

    const board = await createBoard.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      cover_color: bgType === 'color' ? bgValue : undefined,
      background_type: useDeferredUpload ? undefined : bgType,
      background_value: useDeferredUpload ? undefined : (bgType === 'upload' ? normalizeBoardBackgroundUploadPath(bgValue) : bgValue),
      members: visibility === 'shared' ? members : undefined,
      workspace,
    });

    if (useDeferredUpload && pendingFile) {
      const result = await uploadBg.mutateAsync({ boardId: board.id, file: pendingFile });
      await updateBoard.mutateAsync({
        id: board.id,
        background_type: 'upload',
        background_value: normalizeBoardBackgroundUploadPath(result.background_value),
        silent: true,
      });
    }

    handleClose();
    navigate(
      isEstimates ? ROUTES.ESTIMATES.BOARD(board.id) : ROUTES.PIPELINE.BOARD(board.id),
    );
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={handleClose} title="Create board" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title={isEstimates ? 'New personal board' : 'New pipeline board'}
          description={
            isEstimates
              ? 'Organize your own tasks with the same background and visibility options as board settings.'
              : 'Organize leads by stage with backgrounds, visibility, and team access.'
          }
        />

        <PipelineFormSection title="Board details" icon={Type}>
          <PipelineIconField label="Board name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={pipelineInputClass}
              placeholder={isEstimates ? 'e.g. My sprint board' : 'e.g. Enterprise deals'}
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
              placeholder={isEstimates ? 'What are you tracking on this board?' : 'What kind of opportunities belong here?'}
            />
            <p className="mt-1 text-xs text-gray-500">Optional — shown in the board switcher</p>
          </div>
        </PipelineFormSection>

        <BoardBackgroundSection
          bgType={bgType}
          bgValue={bgValue}
          onSelect={handleBgSelect}
          onUpload={handleBgUpload}
          isUploading={uploadBg.isPending}
        />

        <BoardVisibilitySection
          workspace={workspace}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          members={members}
          onMembersChange={setMembers}
        />

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            loading={createBoard.isPending || uploadBg.isPending}
            className="inline-flex items-center gap-2"
          >
            <Kanban className="h-4 w-4" />
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
