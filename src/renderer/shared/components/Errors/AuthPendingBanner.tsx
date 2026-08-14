import { useAppSelector } from '../../../app/store/hooks/useApp';
import { CloudUpload } from 'lucide-react';
import { getUserFirstName } from '../../utils/userDisplayName';

export function AuthPendingBanner() {
  const pendingAuthSync = useAppSelector((state) => state.auth.pendingAuthSync);
  const fullName = useAppSelector((state) => state.auth.user?.name);
  const userName = getUserFirstName(fullName, '');

  if (!pendingAuthSync) return null;

  return (
    <div
      role="status"
      className="relative z-40 flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 shrink-0"
    >
      <CloudUpload className="w-4 h-4 shrink-0 text-amber-600" aria-hidden />
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {userName ? `${userName}, your account is pending sync` : 'Your account is pending sync'}
        </span>
        <span className="text-amber-700"> - connect to the internet to register with the server.</span>
      </div>
    </div>
  );
}
