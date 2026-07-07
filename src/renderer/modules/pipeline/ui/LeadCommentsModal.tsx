import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { usePipelineLead } from '../api/usePipelineQueries';
import LeadCommentsPanel from './LeadCommentsPanel';

interface LeadCommentsModalProps {
  leadId: number;
  boardId?: number;
  onClose: () => void;
}

export default function LeadCommentsModal({ leadId, boardId, onClose }: LeadCommentsModalProps) {
  const { data: lead, isLoading } = usePipelineLead(leadId, true);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={lead?.title ?? 'Comments'}
      subtitle="Team discussion on this card"
      size="md"
    >
      {isLoading || !lead ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <LeadCommentsPanel
          leadId={leadId}
          boardId={boardId}
          activities={lead.activities}
          compact
        />
      )}
    </Modal>
  );
}
