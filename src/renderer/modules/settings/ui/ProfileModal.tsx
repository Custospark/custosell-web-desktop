import { Modal } from '../../../shared/components/modals/Modal';
import ProfileSettingsForm from './ProfileSettingsForm';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * My Profile as a standard modal (ProfileSettingsForm owns its header + save state).
 * Used on Discover so shopping accounts never need the app sidebar.
 */
export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" bodyClassName="p-0">
      <ProfileSettingsForm />
    </Modal>
  );
}
