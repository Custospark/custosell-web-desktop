import { Modal } from '../../../shared/components/modals/Modal';
import { usePipelineLead } from '../api/usePipelineQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import LeadCommentsPanel from './LeadCommentsPanel';
import { LeadCommentsSkeleton } from './KanbanBoardSkeleton';
import { countUserComments } from './pipelineCommentThreads';

interface LeadCommentsModalProps {
  leadId: number;
  boardId?: number;
  board?: {
    can_manage_settings?: boolean;
    can_contribute?: boolean;
    current_member_role?: 'viewer' | 'contributor' | 'manager' | null;
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
  const expectedTotalComments = lead?.comments_count ?? initialLead?.comments_count ?? null;
  const loadedComments = countUserComments(lead?.activities ?? []);
  const isSyncingComments = Boolean(isFetching && lead && expectedTotalComments != null && loadedComments < expectedTotalComments);

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
          isSyncing={isSyncingComments}
          expectedTotalComments={expectedTotalComments}
          compact
        />
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">Could not load comments for this card.</p>
      )}
    </Modal>
  );
}
