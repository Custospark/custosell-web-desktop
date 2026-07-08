import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import {
  useBoardTeamMembers,
  useCreatePipelineBoard,
  usePipelineKanban,
  useUpdatePipelineBoard,
  useUploadBoardBackground,
} from '../api/usePipelineQueries';
import { useApplyBoardTemplate, useBoardTemplates } from '../api/usePipelineConversationQueries';
import type { BoardMemberInput, PipelineBoard, PipelineVisibility } from '../api/pipelineTypes';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
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
import { AlignLeft, Kanban, Type } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BoardWorkspace } from './boardVisibilityOptions';
import { useAppSelector } from '../../../app/store/hooks/useApp';

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
  useBoardTeamMembers(workspace, { enabled: open, scope: 'business' });
  useBoardTeamMembers(workspace, { enabled: open, scope: 'workspace' });

  if (!open) return null;

  return <CreateBoardModalForm key={workspace} onClose={onClose} workspace={workspace} />;
}

function CreateBoardModalForm({
  onClose,
  workspace,
}: {
  onClose: () => void;
  workspace: BoardWorkspace;
}) {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const createBoard = useCreatePipelineBoard();
  const updateBoard = useUpdatePipelineBoard();
  const uploadBg = useUploadBoardBackground();
  const isEstimates = workspace === 'estimates';
  const pendingUploadRef = useRef<File | null>(null);
  const [templateId, setTemplateId] = useState<number | ''>('');
  const { data: templates = [] } = useBoardTemplates(workspace, true);
  const applyTemplate = useApplyBoardTemplate();

  const [step, setStep] = useState<'details' | 'alerts'>('details');
  const [createdBoard, setCreatedBoard] = useState<PipelineBoard | null>(null);
  const { data: createdBoardLive } = usePipelineKanban(createdBoard?.id ?? 0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PipelineVisibility>(isEstimates ? 'private' : 'team');
  const [members, setMembers] = useState<BoardMemberInput[]>([]);
  const [bgType, setBgType] = useState('color');
  const [bgValue, setBgValue] = useState('#6366f1');

  const boardForAlerts = createdBoardLive ?? createdBoard;
  const stages = boardForAlerts?.stages ?? [];

  const handleClose = () => {
    onClose();
  };

  const finishAndOpen = (boardId: number) => {
    handleClose();
    navigate(isEstimates ? ROUTES.ESTIMATES.BOARD(boardId) : ROUTES.PIPELINE.BOARD(boardId));
  };

  const handleVisibilityChange = (next: PipelineVisibility) => {
    setVisibility(next);
    if (next !== 'shared') {
      setMembers([]);
    }
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

  const handleCreateBoard = async (e: React.FormEvent) => {
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

    if (templateId) {
      await applyTemplate.mutateAsync({ boardId: board.id, templateId: Number(templateId) });
    }

    setCreatedBoard(board);
    setStep('alerts');
  };

  if (step === 'alerts' && createdBoard) {
    return (
      <Modal isOpen onClose={() => finishAndOpen(createdBoard.id)} title="Conversation alerts" size="lg">
        <div className="space-y-5">
          <PipelineModalHero
            icon={Kanban}
            tone="violet"
            title="Set up column alerts"
            description={`Choose which columns on “${name.trim()}” should post to the board conversation. You can change these anytime in board settings.`}
          />
          <BoardAutomationsSection
            boardId={createdBoard.id}
            stages={stages}
            boardName={name.trim()}
            canManage
            compact
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => finishAndOpen(createdBoard.id)}>
              Skip for now
            </Button>
            <Button type="button" onClick={() => finishAndOpen(createdBoard.id)}>
              Open board
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={handleClose} title="Create board" size="lg">
      <form onSubmit={handleCreateBoard} className="space-y-5">
        <PipelineModalHero
          icon={Kanban}
          tone="indigo"
          title={isEstimates ? 'New personal board' : 'New pipeline board'}
          description={
            isEstimates
              ? 'Set visibility and invite collaborators the same way as board settings — team, private, or shared with specific people.'
              : 'Set visibility and invite collaborators the same way as board settings — team, private, or shared with specific people.'
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

        {templates.length > 0 && (
          <PipelineFormSection title="Board template" icon={Kanban}>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
              className={pipelineInputClass}
            >
              <option value="">No template — start blank</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Applies default columns, labels, starter resources, and conversation alerts after the board is created.
            </p>
          </PipelineFormSection>
        )}

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
          onVisibilityChange={handleVisibilityChange}
          members={members}
          onMembersChange={setMembers}
          excludeUserId={user?.id}
          loadTeamMembers
        />

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            loading={createBoard.isPending || uploadBg.isPending}
            className="inline-flex items-center gap-2"
          >
            <Kanban className="h-4 w-4" />
            Continue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
