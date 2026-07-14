import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { usePipelineLead } from '../api/usePipelineQueries';
import LeadHistoryPanel from './LeadHistoryPanel';

interface LeadHistoryModalProps {
  leadId: number;
  onClose: () => void;
}

export default function LeadHistoryModal({ leadId, onClose }: LeadHistoryModalProps) {
  const { data: lead, isLoading } = usePipelineLead(leadId, true, { poll: true });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={lead?.title ?? 'Card history'}
      subtitle="Moves, updates, and changes on this card"
      size="md"
    >
      {isLoading || !lead ? (
        <div className="flex justify-center py-12">
          <CustosellLoader />
        </div>
      ) : (
        <LeadHistoryPanel
          activities={lead.activities}
          currency={lead.currency}
          compact
        />
      )}
    </Modal>
  );
}
