import { Modal } from '../../../shared/components/modals/Modal';
import { usePipelineLead } from '../api/usePipelineQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import LeadCommentsPanel from './LeadCommentsPanel';
import { LeadCommentsSkeleton } from './KanbanBoardSkeleton';

interface LeadCommentsModalProps {
  leadId: number;
  boardId?: number;
  board?: {
    created_by?: number | null;
    project_id?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  };
  boardAccess?: {
    projectCreatedBy?: number | null;
    projectMembers?: { user_id: number; role: string }[];
  };
  initialLead?: PipelineLead;
  onClose: () => void;
}

export default function LeadCommentsModal({
  leadId,
  boardId,
  board,
  boardAccess,
  initialLead,
  onClose,
}: LeadCommentsModalProps) {
  const { data: lead, isLoading, isFetching } = usePipelineLead(leadId, true, {
    initialData: initialLead,
  });

  const showSkeleton = !lead && isLoading;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={lead?.title ?? initialLead?.title ?? 'Comments'}
      subtitle={isFetching && lead ? 'Updating…' : 'Team discussion on this card'}
      size="md"
    >
      {showSkeleton ? (
        <LeadCommentsSkeleton />
      ) : lead ? (
        <LeadCommentsPanel
          leadId={leadId}
          boardId={boardId}
          board={board}
          boardAccess={boardAccess}
          activities={lead.activities}
          compact
        />
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">Could not load comments for this card.</p>
      )}
    </Modal>
  );
}
