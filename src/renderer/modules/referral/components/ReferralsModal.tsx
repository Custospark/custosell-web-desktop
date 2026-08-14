import { Modal } from '../../../shared/components/modals/Modal';
import { ReferralsContent } from './ReferralsContent';

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Referral dashboard as a standard modal - used on Discover for shopping accounts. */
export function ReferralsModal({ isOpen, onClose }: ReferralsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Dashboard"
      subtitle="Manage your referral code, earnings, and payout information"
      size="lg"
    >
      <ReferralsContent />
    </Modal>
  );
}
