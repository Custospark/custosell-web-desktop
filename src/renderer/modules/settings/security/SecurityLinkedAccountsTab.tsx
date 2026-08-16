import { Link2 } from 'lucide-react';
import { LinkedAccountsManager } from '../../../shared/components/account/LinkedAccountsManager';

export default function SecurityLinkedAccountsTab() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <Link2 className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Linked accounts</h2>
          <p className="text-xs text-gray-500">Manage the accounts you can switch to without logging out.</p>
        </div>
      </div>
      <LinkedAccountsManager />
    </div>
  );
}
