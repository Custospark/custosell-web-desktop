import { Users } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { useGuideCommunities } from '../../../modules/guide/api/GuideQueries';
import { CommunitiesSection } from '../../../modules/guide/CommunitiesPage';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';

interface CommunitiesModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Quick-join communities modal, opened from the profile dropdown. Shows the
 * company-wide Custosell communities (WhatsApp, Telegram, etc.) so a user can
 * join in one click without leaving the app.
 */
export default function CommunitiesModal({ open, onClose }: CommunitiesModalProps) {
  const { data: communities = [], isLoading } = useGuideCommunities({ enabled: open });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Communities"
      subtitle="Join the Custospark & Custosell communities - share tips, ask questions, and stay up to date."
      size="md"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-3.5">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Join a community</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Tap a community to open it in a new tab and join right away.
            </p>
          </div>
        </div>

        {isLoading ? (
          <CustosellLoader message="Loading communities..." />
        ) : (
          <CommunitiesSection communities={communities} />
        )}
      </div>
    </Modal>
  );
}